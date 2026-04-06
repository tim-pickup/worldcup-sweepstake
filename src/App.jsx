import { useState, useEffect } from 'react';
import { getConfig, getTeams } from './api.js';
import PhaseBanner from './components/PhaseBanner.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import MatchResults from './components/MatchResults.jsx';
import RegistrationForm from './components/RegistrationForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import LandingPage from './components/LandingPage.jsx';
import PreGamePage from './components/PreGamePage.jsx';
import GroupPreferences from './components/GroupPreferences.jsx';
import KnockoutPreferences from './components/KnockoutPreferences.jsx';
import LockedPicks from './components/LockedPicks.jsx';

const SESSION_KEY = 'wc_player';

function loadPlayerFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    // Discard sessions that pre-date name+PIN auth (missing name field)
    if (!p?.name || !p?.pin) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return p;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
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

// Phases where the leaderboard is meaningful (scoring has started)
const SCORING_PHASES = new Set(['group_scoring', 'knockout_preferences', 'knockout_scoring', 'complete']);

function WC2026Logo() {
  return (
    <svg
      className="nav-wc-trophy"
      viewBox="0 0 32 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="World Cup 2026 Trophy"
    >
      <defs>
        <linearGradient id="trophy-grad" x1="0" y1="0" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Cup body */}
      <path d="M7 3h18v13a9 9 0 01-18 0V3z" fill="url(#trophy-grad)" />
      {/* Left handle */}
      <path d="M7 6.5H4A3.5 3.5 0 004 13h3" stroke="url(#trophy-grad)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Right handle */}
      <path d="M25 6.5h3A3.5 3.5 0 0128 13h-3" stroke="url(#trophy-grad)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Stars — three host nations */}
      <text x="16" y="13" textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.88)" letterSpacing="1.5">★★★</text>
      {/* Stem */}
      <rect x="14" y="16" width="4" height="8" rx="1" fill="url(#trophy-grad)" />
      {/* Base */}
      <rect x="8.5" y="24" width="15" height="4" rx="2" fill="url(#trophy-grad)" />
      {/* Base shadow line */}
      <rect x="10" y="27.5" width="12" height="0.75" rx="0.375" fill="rgba(0,0,0,0.25)" />
    </svg>
  );
}

function ClaudeBadge() {
  return (
    <div className="nav-claude-badge">
      {/* Anthropic-style sparkle/diamond icon */}
      <svg className="nav-claude-icon" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1.5L9.6 6.4L14.5 8L9.6 9.6L8 14.5L6.4 9.6L1.5 8L6.4 6.4L8 1.5Z" />
      </svg>
      <span>Powered by Claude</span>
    </div>
  );
}

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
  const [teamsByName, setTeamsByName] = useState({});

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

  useEffect(() => {
    getTeams().then(result => {
      if (result.ok) {
        const map = Object.fromEntries((result.data ?? []).map(t => [t['Team Name'], t]));
        setTeamsByName(map);
      }
    });
  }, []);

  function handleSetPlayer(p) {
    setPlayer(p);
    savePlayerToSession(p);
  }

  function handleLogout() {
    setPlayer(null);
    savePlayerToSession(null);
    if (isRegistrationPhase) {
      setView('landing');
    } else if (isPreGamePhase) {
      setView('pregame');
    } else {
      setView('leaderboard');
    }
  }

  const currentPhase = config?.currentPhase ?? null;
  const isRegistrationPhase = currentPhase === 'registration';
  const isPreGamePhase = currentPhase !== null && !isRegistrationPhase && !SCORING_PHASES.has(currentPhase);
  const showLeaderboard = currentPhase !== null && SCORING_PHASES.has(currentPhase);

  // Redirect to the right home view when the phase loads or changes
  useEffect(() => {
    if (!currentPhase) return;
    if (isRegistrationPhase && view === 'leaderboard') {
      setView('landing');
    } else if (isPreGamePhase && view === 'leaderboard') {
      setView('pregame');
    }
  }, [currentPhase]);

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
      return <GroupPreferences player={player} teamsByName={teamsByName} />;
    }
    if (currentPhase === 'knockout_preferences') {
      return <KnockoutPreferences player={player} teamsByName={teamsByName} />;
    }
    // Any other phase — show locked read-only picks
    return <LockedPicks player={player} phase={currentPhase} teamsByName={teamsByName} />;
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          <WC2026Logo />
          <div className="nav-brand-text">
            <div className="nav-brand-title">World Cup</div>
            <div className="nav-brand-year">2026</div>
          </div>
          <div className="nav-brand-sep" />
          <ClaudeBadge />
        </div>

        <div className="nav-actions">
          {isRegistrationPhase && (
            <>
              <button
                className={`nav-btn${view === 'landing' ? ' active' : ''}`}
                onClick={() => setView('landing')}
              >
                Home
              </button>
              <button
                className={`nav-btn${view === 'register' ? ' active' : ''}`}
                onClick={() => setView('register')}
              >
                Register
              </button>
            </>
          )}

          {isPreGamePhase && (
            <button
              className={`nav-btn${view === 'pregame' ? ' active' : ''}`}
              onClick={() => setView('pregame')}
            >
              Home
            </button>
          )}

          {showLeaderboard && (
            <button
              className={`nav-btn${view === 'leaderboard' ? ' active' : ''}`}
              onClick={() => setView('leaderboard')}
            >
              Leaderboard
            </button>
          )}

          {!player && !isRegistrationPhase && (
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
        {view === 'leaderboard' && showLeaderboard && (
          <>
            <PhaseBanner config={config} />
            <StatsBar config={config} leaderRows={leaderRows} />
            <Leaderboard onRowsChange={setLeaderRows} teamsByName={teamsByName} />
            <MatchResults teamsByName={teamsByName} />
          </>
        )}

        {view === 'pregame' && (
          <PreGamePage config={config} />
        )}

        {view === 'landing' && (
          <LandingPage
            config={config}
            onRegister={() => setView('register')}
          />
        )}

        {view === 'register' && (
          <RegistrationForm
            onSuccess={(p) => {
              handleSetPlayer(p);
              setView('landing');
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
