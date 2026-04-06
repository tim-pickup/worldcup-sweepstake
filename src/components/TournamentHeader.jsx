import { useState, useEffect } from 'react';

const PHASE_LABELS = {
  registration:         'Registration Open',
  group_preferences:    'Group Stage Picks',
  group_scoring:        'Group Stage',
  knockout_preferences: 'Knockout Auction',
  knockout_scoring:     'Knockout Stage',
  complete:             'Tournament Complete',
  between_phases:       'Preparing…',
};

const PHASE_ICONS = {
  registration:         '📋',
  group_preferences:    '⚽',
  group_scoring:        '⚽',
  knockout_preferences: '🪙',
  knockout_scoring:     '🏆',
  complete:             '🥇',
  between_phases:       '⏳',
};

const DEADLINE_KEYS = {
  registration:         'registrationClose',
  group_preferences:    'groupPrefsClose',
  group_scoring:        'groupScoringClose',
  knockout_preferences: 'knockoutPrefsClose',
  knockout_scoring:     'knockoutScoringClose',
};

const LIVE_PHASES = new Set(['group_scoring', 'knockout_scoring']);

export default function TournamentHeader({ config, leaderRows }) {
  const phase = config?.currentPhase ?? 'between_phases';
  const isLive = LIVE_PHASES.has(phase);
  const label = PHASE_LABELS[phase] ?? 'Tournament';
  const icon  = PHASE_ICONS[phase]  ?? '🏆';
  const leader      = leaderRows?.[0];
  const playerCount = leaderRows?.length ?? 0;

  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const key = DEADLINE_KEYS[phase];
    if (!config || !key || !config[key]) { setCountdown(''); return; }
    const deadline = new Date(config[key]);
    function tick() {
      const diff = deadline - Date.now();
      if (diff <= 0) { setCountdown('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0)      setCountdown(`${d}d ${h}h ${m}m`);
      else if (h > 0) setCountdown(`${h}h ${m}m`);
      else            setCountdown(`${m}m ${s}s`);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [config, phase]);

  const leaderPoints = leader?.['Total Points'] ?? 0;

  return (
    <div className={`tourn-header${isLive ? ' tourn-header-live' : ''}`}>
      {isLive && <div className="tourn-header-glow" />}

      {/* Top row: phase name left, countdown right */}
      <div className="tourn-header-top">
        <div className="tourn-phase-wrap">
          {isLive && <span className="tourn-live-dot" />}
          <span className="tourn-phase-icon">{icon}</span>
          <span className="tourn-phase-name">{label}</span>
          {isLive && <span className="tourn-live-badge">LIVE</span>}
        </div>
        {countdown && countdown !== 'Ended' && (
          <div className="tourn-deadline">
            <span className="tourn-deadline-label">ends in</span>
            <span className="tourn-deadline-value">{countdown}</span>
          </div>
        )}
        {phase === 'complete' && (
          <div className="tourn-deadline">
            <span className="tourn-deadline-value" style={{ color: '#a78bfa' }}>Final standings</span>
          </div>
        )}
      </div>

      {/* Bottom row: stats */}
      {playerCount > 0 && (
        <div className="tourn-stats-row">
          <div className="tourn-stat">
            <span className="tourn-stat-value">{playerCount}</span>
            <span className="tourn-stat-label">players</span>
          </div>

          {leader && (
            <>
              <div className="tourn-stat-sep" />
              <div className="tourn-stat tourn-stat-leader">
                <span className="tourn-stat-medal">🥇</span>
                <span className="tourn-stat-name">{leader['Player Name']}</span>
                <span className="tourn-stat-pts">{leaderPoints} pts</span>
              </div>
            </>
          )}

          {leaderRows?.length > 1 && (
            <>
              <div className="tourn-stat-sep" />
              <div className="tourn-stat">
                <span className="tourn-stat-value">{leaderPoints - (leaderRows[1]?.['Total Points'] ?? 0)}</span>
                <span className="tourn-stat-label">pt gap to 2nd</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
