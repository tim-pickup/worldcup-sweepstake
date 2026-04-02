import { useState, useEffect } from 'react';
import { usePhase, PHASES } from '../context/PhaseContext';

const PHASE_LABELS = {
  [PHASES.REGISTRATION]: 'Phase 1: Registration',
  [PHASES.GROUP_PREFERENCES]: 'Phase 2: Group Stage Preferences',
  [PHASES.GROUP_SCORING]: 'Phase 3: Group Stage — Live Scoring',
  [PHASES.KNOCKOUT_PREFERENCES]: 'Phase 4: Knockout Auction',
  [PHASES.KNOCKOUT_SCORING]: 'Phase 5: Knockout Stage — Live Scoring',
  [PHASES.COMPLETE]: 'Phase 6: Competition Complete',
};

const PHASE_COLORS = {
  [PHASES.REGISTRATION]: 'bg-blue-600',
  [PHASES.GROUP_PREFERENCES]: 'bg-amber-500',
  [PHASES.GROUP_SCORING]: 'bg-green-600',
  [PHASES.KNOCKOUT_PREFERENCES]: 'bg-purple-600',
  [PHASES.KNOCKOUT_SCORING]: 'bg-green-600',
  [PHASES.COMPLETE]: 'bg-gray-600',
};

function getNextDeadline(config, phase) {
  if (!config) return null;
  const deadlines = {
    [PHASES.REGISTRATION]: config.registrationClose,
    [PHASES.GROUP_PREFERENCES]: config.groupPreferencesClose,
    [PHASES.GROUP_SCORING]: config.groupScoringClose,
    [PHASES.KNOCKOUT_PREFERENCES]: config.knockoutPreferencesClose,
    [PHASES.KNOCKOUT_SCORING]: config.knockoutScoringClose,
  };
  const d = deadlines[phase];
  return d ? new Date(d) : null;
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Closing now';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h remaining`;
  if (h > 0) return `${h}h ${m % 60}m remaining`;
  if (m > 0) return `${m}m ${s % 60}s remaining`;
  return `${s}s remaining`;
}

export default function PhaseBanner() {
  const { phase, config, loading } = usePhase();
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const deadline = getNextDeadline(config, phase);
    if (!deadline) { setCountdown(''); return; }

    function update() {
      setCountdown(formatCountdown(deadline - new Date()));
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [config, phase]);

  if (loading) {
    return (
      <div className="bg-gray-200 text-gray-600 text-center py-2 px-4 text-sm animate-pulse">
        Loading tournament status…
      </div>
    );
  }

  const color = PHASE_COLORS[phase] || 'bg-gray-600';
  const label = PHASE_LABELS[phase] || 'Tournament';

  return (
    <div className={`${color} text-white text-center py-3 px-4`}>
      <span className="font-semibold">{label}</span>
      {countdown && (
        <span className="ml-3 text-sm opacity-90">— {countdown}</span>
      )}
    </div>
  );
}
