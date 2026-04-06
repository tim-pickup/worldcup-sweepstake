import { useState, useEffect } from 'react';

const PHASE_DISPLAY_NAMES = {
  registration:         'Registration Open',
  group_preferences:    'Group Stage Picks',
  group_scoring:        'Group Stage',
  knockout_preferences: 'Knockout Auction',
  knockout_scoring:     'Knockout Stage',
  complete:             'Tournament Complete',
  between_phases:       'Preparing…',
};

// Map each phase to the config key that holds its closing deadline
const PHASE_DEADLINE_KEY = {
  registration: 'registrationClose',
  group_preferences: 'groupPrefsClose',
  group_scoring: 'groupScoringClose',
  knockout_preferences: 'knockoutPrefsClose',
  knockout_scoring: 'knockoutScoringClose',
};

function getDeadline(config) {
  if (!config?.currentPhase) return null;
  const key = PHASE_DEADLINE_KEY[config.currentPhase];
  if (!key) return null;
  const raw = config[key];
  if (!raw) return null;
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

function formatCountdown(ms) {
  if (ms <= 0) return 'closed';
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return `closes in ${parts.join(' ')}`;
}

export default function PhaseBanner({ config }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!config) return null;

  const phase = config.currentPhase ?? 'between_phases';
  const displayName = PHASE_DISPLAY_NAMES[phase] ?? phase;
  const deadline = getDeadline(config);
  const countdown = deadline ? formatCountdown(deadline.getTime() - now) : null;

  return (
    <div className={`phase-banner phase-${phase}`}>
      <span className="phase-banner-name">{displayName}</span>
      {countdown && (
        <span className="phase-banner-countdown">⏱ {countdown}</span>
      )}
    </div>
  );
}
