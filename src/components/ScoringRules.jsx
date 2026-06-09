const RULES = [
  {
    icon: '👑',
    label: 'Captain scores a goal',
    pts: '+2',
    note: 'All tiers',
    color: 'var(--gold)',
  },
  {
    icon: '🎯',
    label: 'Captain assist',
    pts: '+1',
    note: 'All tiers',
    color: 'var(--gold)',
  },
  {
    icon: '⚽',
    label: 'Goal (Tier 1, or Tier 2 → Goals Scored)',
    pts: '+1',
    note: 'Attacking teams',
    color: 'var(--green)',
  },
  {
    icon: '🛡',
    label: 'Goal conceded (Tier 3, or Tier 2 → Goals Conceded)',
    pts: '+1',
    note: 'Defensive teams',
    color: 'var(--green)',
  },
  {
    icon: '🏆',
    label: 'Match win',
    pts: '+3',
    note: 'All tiers',
    color: 'var(--info)',
  },
  {
    icon: '🤝',
    label: 'Match draw',
    pts: '+1',
    note: 'All tiers',
    color: 'var(--info)',
  },
  {
    icon: '🔴',
    label: 'Red card',
    pts: '−2',
    note: 'All tiers',
    color: 'var(--danger)',
  },
  {
    icon: '😬',
    label: 'Own goal (against the team that scored it)',
    pts: '−2',
    note: 'All tiers',
    color: 'var(--danger)',
  },
];

export default function ScoringRules({ style, className }) {
  const cls = ['scoring-rules', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style}>
      <h3 className="scoring-rules-title">📋 Scoring Rules</h3>
      <p className="scoring-rules-intro">
        Points are earned (or lost) per game across the group stage. Your Tier 2 mechanism choice
        determines whether you score points for <strong>goals your team scores</strong> or
        {' '}<strong>goals they concede</strong> — choose wisely!
      </p>
      <div className="scoring-rules-grid">
        {RULES.map(({ icon, label, pts, note, color }) => (
          <div key={label} className="scoring-rule-row">
            <span className="scoring-rule-icon">{icon}</span>
            <span className="scoring-rule-label">{label}</span>
            <span className="scoring-rule-note">{note}</span>
            <span className="scoring-rule-pts" style={{ color }}>{pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
