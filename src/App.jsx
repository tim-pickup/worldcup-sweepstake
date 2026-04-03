import { useState, useEffect } from 'react';
import { getConfig } from './api.js';
import PhaseBanner from './components/PhaseBanner.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import MatchResults from './components/MatchResults.jsx';
import RegistrationForm from './components/RegistrationForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import GroupPreferences from './components/GroupPreferences.jsx';
import KnockoutPreferences from './components/KnockoutPreferences.jsx';
import LockedPicks from './components/LockedPicks.jsx';

const SESSION_KEY = 'wc_player';

function loadPlayerFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePlayerToSession(player) {
  if (player) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(player));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

const PHASE_LABELS = {
  registration:           'Phase 1 — Registration',
  group_preferences:      'Phase 2 — Group Preferences',
  group_scoring:          'Phase 3 — Group Stage Live',
  knockout_preferences:   'Phase 4 — Knockout Auction',
  knockout_scoring:       'Phase 5 — Knockout Stage Live',
  complete:               'Phase 6 — Complete',
  between_phases:         'Preparing…',
};

function StatsBar({ config, leaderRows }) {
  const phase = config?.currentPhase ?? 'between_phases';
  const leader = leaderRows?.[0]?.['Player Name'] ?? '—';
  const playerCount = leaderRows?.length ?? '—';
  const phaseLabel = PHASE_LABELS[phase] ?? '—';

  // Countdown to next deadline
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const deadlineKey = {
      registration:         'registrationClose',
      group_preferences:    'groupPrefsClose',
      group_scoring:        'groupScoringClose',
      knockout_preferences: 'knockoutPrefsClose',
      knockout_scoring:     'knockoutScoringClose',
    }[phase];

    if (!config || !deadlineKey || !config[deadlineKey]) {
      setCountdown('—');
      return;
    }
    const deadline = new Date(config[deadlineKey]);
    function update() {
      const diff = deadline - new Date();
      if (diff <= 0) { setCountdown('Closed'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
    }
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [config, phase]);

  return (
    <div className="stats-bar">
      <div className="stat-chip">
        <div className="stat-chip-label">Phase</div>
        <div className="stat-chip-value" style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
          {phaseLabel}
        </div>
      </div>
      <div className="stat-chip">
        <div className="stat-chip-label">Players</div>
        <div className="stat-chip-value">{playerCount}</div>
      </div>
      <div className="stat-chip">
        <div className="stat-chip-label">Leader</div>
        <div className="stat-chip-value" style={{ fontSize: '0.9rem', color: 'var(--text-heading)' }}>
          {leader}
        </div>
      </div>
      <div className="stat-chip">
        <div className="stat-chip-label">Closes In</div>
        <div className="stat-chip-value">{countdown}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState(null);
  const [player, setPlayer] = useState(null);
  const [view, setView] = useState('leaderboard');
  const [leaderRows, setLeaderRows] = useState([]);

  useEffect(() => {
    const stored = loadPlayerFromSession();
    if (stored) setPlayer(stored);
  }, []);

  useEffect(() => {
    async function fetchConfig() {
      const result = await getConfig();
      if (result.ok) setConfig(result.data);
    }
    fetchConfig();
    const interval = setInterval(fetchConfig, 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleSetPlayer(p) {
    setPlayer(p);
    savePlayerToSession(p);
  }

  function handleLogout() {
    setPlayer(null);
    savePlayerToSession(null);
    setView('leaderboard');
  }

  const currentPhase = config?.currentPhase ?? null;
  const isRegistrationPhase = currentPhase === 'registration';

  function renderPicksContent() {
    if (!player) {
      return (
        <div className="login-prompt">
          <h2>Log in to view your picks</h2>
          <button className="btn btn-primary" onClick={() => setView('login')}>
            Log In
          </button>
        </div>
      );
    }
    if (currentPhase === 'group_preferences') {
      return <GroupPreferences player={player} />;
    }
    if (currentPhase === 'knockout_preferences') {
      return <KnockoutPreferences player={player} />;
    }
    // Any other phase — show locked read-only picks
    return <LockedPicks player={player} phase={currentPhase} />;
  }

  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-title">🏆 WC2026</span>
        <div className="nav-actions">
          <button
            className={`nav-btn${view === 'leaderboard' ? ' active' : ''}`}
            onClick={() => setView('leaderboard')}
          >
            Leaderboard
          </button>

          {isRegistrationPhase && !player && (
            <button
              className={`nav-btn${view === 'register' ? ' active' : ''}`}
              onClick={() => setView('register')}
            >
              Register
            </button>
          )}

          {!player && (
            <button
              className={`nav-btn${view === 'login' ? ' active' : ''}`}
              onClick={() => setView('login')}
            >
              Login
            </button>
          )}

          {player && (
            <>
              <span className="nav-player-label">👤 {player.name}</span>
              <button
                className={`nav-btn${view === 'picks' ? ' active' : ''}`}
                onClick={() => setView('picks')}
              >
                My Picks
              </button>
              <button className="nav-btn logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="app-main">
        {view === 'leaderboard' && (
          <>
            <PhaseBanner config={config} />
            <StatsBar config={config} leaderRows={leaderRows} />
            <Leaderboard onRowsChange={setLeaderRows} />
            <MatchResults />
          </>
        )}

        {view === 'register' && (
          <RegistrationForm
            onSuccess={(p) => {
              handleSetPlayer(p);
              setView('leaderboard');
            }}
          />
        )}

        {view === 'login' && (
          <LoginForm
            onSuccess={(p) => {
              handleSetPlayer(p);
              setView('picks');
            }}
          />
        )}

        {view === 'picks' && renderPicksContent()}
      </main>
    </div>
  );
}
