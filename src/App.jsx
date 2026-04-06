import { useState, useEffect } from 'react';
import { getConfig, getTeams } from './api.js';
import TournamentHeader from './components/TournamentHeader.jsx';
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
  registration:         'Registration Open',
  group_preferences:    'Group Stage Picks',
  group_scoring:        'Group Stage',
  knockout_preferences: 'Knockout Auction',
  knockout_scoring:     'Knockout Stage',
  complete:             'Tournament Complete',
  between_phases:       'Preparing…',
};

// Phases where the leaderboard is meaningful (scoring has started)
const SCORING_PHASES = new Set(['group_scoring', 'knockout_preferences', 'knockout_scoring', 'complete']);

function WC2026Logo() {
  return (
    <div className="nav-logo-hang">
      <img
        src="https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill,height:80&quality=90"
        alt="FIFA World Cup 2026"
        className="nav-wc-logo-img"
      />
    </div>
  );
}

function ClaudeBadge() {
  return (
    <div className="nav-claude-badge">
      <svg className="nav-claude-icon" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1.5L9.6 6.4L14.5 8L9.6 9.6L8 14.5L6.4 9.6L1.5 8L6.4 6.4L8 1.5Z" />
      </svg>
      <div className="nav-claude-badge-text">
        <div className="nav-claude-powered">Powered by</div>
        <div className="nav-claude-name">Claude</div>
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

  // Leaderboard only appears once scoring begins (group_scoring and beyond).
  // The gap between GroupPrefsClose and GroupScoringOpen is handled by the
  // TournamentCountdown state inside PreGamePage.
  const showLeaderboard = currentPhase !== null && SCORING_PHASES.has(currentPhase);
  const isPreGamePhase = currentPhase !== null && !isRegistrationPhase && !showLeaderboard;

  // Redirect to the right home view when phase or leaderboard visibility changes
  useEffect(() => {
    if (!currentPhase) return;
    if (isRegistrationPhase && view === 'leaderboard') {
      setView('landing');
    } else if (isPreGamePhase && view === 'leaderboard') {
      setView('pregame');
    } else if (showLeaderboard && view === 'pregame') {
      setView('leaderboard');
    }
  }, [currentPhase, showLeaderboard]);

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
            <TournamentHeader config={config} leaderRows={leaderRows} />
            <Leaderboard onRowsChange={setLeaderRows} teamsByName={teamsByName} />
            <MatchResults teamsByName={teamsByName} />
          </>
        )}

        {view === 'pregame' && (
          <PreGamePage
            config={config}
            player={player}
            onLogin={() => setView('login')}
            onViewPicks={() => setView('picks')}
          />
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
