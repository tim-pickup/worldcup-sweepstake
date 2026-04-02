import { useState, useEffect } from 'react';
import { getConfig } from './api.js';
import PhaseBanner from './components/PhaseBanner.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import MatchResults from './components/MatchResults.jsx';
import RegistrationForm from './components/RegistrationForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import GroupPreferences from './components/GroupPreferences.jsx';
import KnockoutPreferences from './components/KnockoutPreferences.jsx';

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

export default function App() {
  const [config, setConfig] = useState(null);
  const [player, setPlayer] = useState(null);
  const [view, setView] = useState('leaderboard');

  // Restore player from sessionStorage on mount
  useEffect(() => {
    const stored = loadPlayerFromSession();
    if (stored) setPlayer(stored);
  }, []);

  // Fetch config on mount, then every 60 seconds
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
          <h2>Please log in to view your picks</h2>
          <button className="btn btn-primary" onClick={() => setView('login')}>
            Log In
          </button>
        </div>
      );
    }
    if (currentPhase === 'group_preferences') {
      return <GroupPreferences pin={player.pin} />;
    }
    if (currentPhase === 'knockout_preferences') {
      return <KnockoutPreferences pin={player.pin} />;
    }
    return (
      <div className="card">
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
          Preferences are not currently open. Check back during the next preferences phase.
        </p>
      </div>
    );
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
            <Leaderboard />
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
