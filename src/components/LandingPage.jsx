import { useState, useEffect } from 'react';
import { getPlayerNames } from '../api.js';

function useCountdown(target) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    if (!target) return;
    const deadline = new Date(target);
    function tick() {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setParts({ d: 0, h: 0, m: 0, s: 0, expired: true });
        return;
      }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return parts;
}

function CountdownUnit({ value, label }) {
  return (
    <div className="landing-cd-unit">
      <div className="landing-cd-number">{String(value).padStart(2, '0')}</div>
      <div className="landing-cd-label">{label}</div>
    </div>
  );
}

function PlayerAvatar({ name, index }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hues = [32, 210, 145, 280, 0, 185, 55, 320, 90, 230];
  const hue = hues[index % hues.length];

  return (
    <div className="landing-avatar" title={name} style={{ '--avatar-hue': hue }}>
      <div className="landing-avatar-circle">{initials}</div>
      <div className="landing-avatar-name">{name.split(' ')[0]}</div>
    </div>
  );
}

const GROUP_TIERS = [
  {
    tier: 1,
    color: 'var(--tier1)',
    icon: '⭐',
    title: 'Tier 1 — Goals Scored',
    desc: 'Your strongest team. Earn a point for every goal they score.',
  },
  {
    tier: 2,
    color: 'var(--tier2)',
    icon: '🎯',
    title: 'Tier 2 — Your Choice',
    desc: 'You pick the mechanism: earn from goals scored OR goals conceded.',
  },
  {
    tier: 3,
    color: 'var(--tier3)',
    icon: '🛡️',
    title: 'Tier 3 — Goals Conceded',
    desc: 'Your underdog pick. Earn a point for every goal they let in.',
  },
];

export default function LandingPage({ config, onRegister }) {
  const [names, setNames] = useState([]);
  const [loadingNames, setLoadingNames] = useState(true);
  const countdown = useCountdown(config?.registrationClose);

  useEffect(() => {
    getPlayerNames().then(result => {
      if (result.ok) setNames(result.data ?? []);
      setLoadingNames(false);
    });
  }, []);

  return (
    <div className="landing">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="landing-hero">
        <div className="landing-hero-glow" />

        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <span className="landing-pulse-dot" />
            Registration Open
          </div>

          <h1 className="landing-title">
            FIFA World Cup<br />
            <span className="landing-title-accent">2026 Sweepstake</span>
          </h1>

          <p className="landing-subtitle">
            Pick your teams, name your captains, and compete for glory across the full tournament.
            <br />
            <strong style={{ color: 'var(--text-heading)' }}>
              USA · Canada · Mexico — Summer 2026
            </strong>
          </p>

          {/* Countdown */}
          {!countdown.expired && config?.registrationClose && (
            <div className="landing-cd-wrap">
              <div className="landing-cd-label-top">Registration closes in</div>
              <div className="landing-cd-row">
                <CountdownUnit value={countdown.d} label="Days" />
                <div className="landing-cd-sep">:</div>
                <CountdownUnit value={countdown.h} label="Hours" />
                <div className="landing-cd-sep">:</div>
                <CountdownUnit value={countdown.m} label="Mins" />
                <div className="landing-cd-sep">:</div>
                <CountdownUnit value={countdown.s} label="Secs" />
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button className="landing-cta" onClick={onRegister}>
              Join the Sweepstake
              <span className="landing-cta-arrow">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Players ──────────────────────────────────────────────── */}
      <div className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-players-header">
            <div>
              <h2 className="landing-section-title">Who's In</h2>
              <p className="landing-section-sub">
                {loadingNames
                  ? 'Loading…'
                  : names.length === 0
                  ? 'Be the first to register!'
                  : `${names.length} player${names.length !== 1 ? 's' : ''} have already signed up`}
              </p>
            </div>
            <div className="landing-player-count">{loadingNames ? '—' : names.length}</div>
          </div>

          {names.length > 0 && (
            <div className="landing-avatars-grid">
              {names.map((name, i) => (
                <PlayerAvatar key={name} name={name} index={i} />
              ))}
            </div>
          )}

          {names.length === 0 && !loadingNames && (
            <div className="landing-empty-players">
              <span>⚽</span>
              <span>No players yet — be the first!</span>
            </div>
          )}

          <div className="landing-join-bar">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Ready to compete?
            </p>
            <button className="btn btn-primary" onClick={onRegister} style={{ padding: '0.55rem 1.5rem' }}>
              Register Now
            </button>
          </div>
        </div>
      </div>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <div className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <h2 className="landing-section-title" style={{ textAlign: 'center' }}>How It Works</h2>
          <p className="landing-section-sub" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Each player is randomly allocated one team from each tier. Points are earned across the full tournament.
          </p>

          {/* Group Stage */}
          <div className="landing-phase-label">⚽ Group Stage</div>
          <p className="landing-section-sub" style={{ marginBottom: '1rem' }}>
            You are allocated three teams — one from each tier. Pick a captain for each team to earn a bonus point whenever they score.
          </p>
          <div className="landing-how-grid" style={{ marginBottom: '1.75rem' }}>
            {GROUP_TIERS.map(({ tier, color, icon, title, desc }) => (
              <div key={tier} className="landing-how-card" style={{ '--card-accent': color }}>
                <div className="landing-how-icon">{icon}</div>
                <div className="landing-how-title">{title}</div>
                <p className="landing-how-desc">{desc}</p>
              </div>
            ))}
          </div>

          {/* Knockout Stage */}
          <div className="landing-phase-label">🏆 Knockout Stage</div>
          <p className="landing-section-sub" style={{ marginBottom: '1rem' }}>
            Once the group stage is done, every player gets a coin budget to bid on knockout teams. Buy as many as your budget allows, pick a captain, and earn points as teams progress.
          </p>
          <div className="landing-how-card" style={{ '--card-accent': 'var(--gold)', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="landing-how-icon">🪙</div>
                <div className="landing-how-title">Auction Budget</div>
                <p className="landing-how-desc">Spend your coins on knockout teams. Go all-in on one favourite or spread across several — it's your call.</p>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="landing-how-icon">👑</div>
                <div className="landing-how-title">Captain Bonus</div>
                <p className="landing-how-desc">Name a captain from any of your purchased teams' squads. Every goal they score earns you an extra point.</p>
              </div>
            </div>
          </div>

          {/* Scoring */}
          <div className="landing-phase-label">📊 Points Reference</div>
          <div className="landing-scoring-grid">
            {[
              { icon: '⚽', label: 'Goal (scored or conceded, depending on tier)', pts: '+1' },
              { icon: '👑', label: 'Captain scores a goal', pts: '+1' },
              { icon: '🔴', label: 'Own goal', pts: '−1' },
              { icon: '🟨', label: 'Yellow card', pts: '−1' },
              { icon: '🟥', label: 'Red card', pts: '−2' },
            ].map(({ icon, label, pts }) => (
              <div key={label} className="landing-score-row">
                <span>{icon} {label}</span>
                <span className="landing-score-pts" style={{ color: pts.startsWith('+') ? 'var(--green)' : 'var(--danger)' }}>
                  {pts}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer CTA ───────────────────────────────────────────── */}
      <div className="landing-footer-cta">
        <div className="landing-hero-glow" style={{ opacity: 0.5 }} />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</div>
          <h2 className="landing-section-title" style={{ marginBottom: '0.5rem' }}>
            Don't miss the kick-off
          </h2>
          <p className="landing-section-sub" style={{ marginBottom: '1.5rem' }}>
            Registrations close soon. Secure your spot now.
          </p>
          <button className="landing-cta" onClick={onRegister}>
            Join the Sweepstake
            <span className="landing-cta-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
