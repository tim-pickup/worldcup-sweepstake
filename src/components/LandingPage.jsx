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

const HOW_IT_WORKS = [
  {
    tier: 1,
    color: 'var(--tier1)',
    dim: 'var(--tier1-dim)',
    icon: '⭐',
    title: 'Tier 1 Team',
    desc: 'Your top team. Points from goals scored by this team — every goal counts.',
  },
  {
    tier: 2,
    color: 'var(--tier2)',
    dim: 'var(--tier2-dim)',
    icon: '🎯',
    title: 'Tier 2 Team',
    desc: 'Your wildcard pick. You choose whether to score from goals scored OR goals conceded.',
  },
  {
    tier: 3,
    color: 'var(--tier3)',
    dim: 'var(--tier3-dim)',
    icon: '🛡️',
    title: 'Tier 3 Team',
    desc: 'Your defensive pick. Points from goals conceded — the leakier the better!',
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

  const spotsLeft = Math.max(0, 40 - names.length);

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

          <button className="landing-cta" onClick={onRegister}>
            Join the Sweepstake
            <span className="landing-cta-arrow">→</span>
          </button>

          {spotsLeft > 0 && (
            <p className="landing-spots">
              🔥 Only <strong>{spotsLeft} spots</strong> remaining — don't miss out
            </p>
          )}
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
          <p className="landing-section-sub" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            Each player is randomly allocated one team from each tier. Then the real strategy begins.
          </p>

          <div className="landing-how-grid">
            {HOW_IT_WORKS.map(({ tier, color, dim, icon, title, desc }) => (
              <div
                key={tier}
                className="landing-how-card"
                style={{ '--card-accent': color, '--card-dim': dim }}
              >
                <div className="landing-how-icon">{icon}</div>
                <div className="landing-how-tier">Tier {tier}</div>
                <div className="landing-how-title">{title}</div>
                <p className="landing-how-desc">{desc}</p>
              </div>
            ))}
          </div>

          <div className="landing-scoring-grid">
            {[
              { icon: '⚽', label: 'Goal (standard)', pts: '+1' },
              { icon: '⭐', label: 'Captain goal bonus', pts: '+1' },
              { icon: '🔴', label: 'Own goal', pts: '−1' },
              { icon: '🟨', label: 'Yellow card', pts: '−1' },
              { icon: '🟥', label: 'Red card', pts: '−2' },
            ].map(({ icon, label, pts }) => (
              <div key={label} className="landing-score-row">
                <span>{icon} {label}</span>
                <span
                  className="landing-score-pts"
                  style={{ color: pts.startsWith('+') ? 'var(--green)' : 'var(--danger)' }}
                >
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
