import { useState, useEffect } from 'react';
import { getPlayerNames } from '../api.js';

function useCountdown(target) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false, loaded: false });

  useEffect(() => {
    if (!target) return;
    const deadline = new Date(target);
    function tick() {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setParts({ d: 0, h: 0, m: 0, s: 0, expired: true, loaded: true });
        return;
      }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
        loaded: true,
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
    <div className="pregame-cd-unit">
      <div className="pregame-cd-number">{String(value).padStart(2, '0')}</div>
      <div className="pregame-cd-label">{label}</div>
    </div>
  );
}

function CountdownBlock({ icon, title, subtitle, target, accentClass }) {
  const cd = useCountdown(target);

  return (
    <div className={`pregame-countdown-block ${accentClass}`}>
      <div className="pregame-countdown-block-icon">{icon}</div>
      <div className="pregame-countdown-block-title">{title}</div>
      {!target ? (
        <div className="pregame-cd-tbd">Date to be confirmed</div>
      ) : cd.expired ? (
        <div className="pregame-cd-expired">It's time!</div>
      ) : (
        <div className="pregame-cd-row">
          <CountdownUnit value={cd.d} label="Days" />
          <div className="pregame-cd-sep">:</div>
          <CountdownUnit value={cd.h} label="Hrs" />
          <div className="pregame-cd-sep">:</div>
          <CountdownUnit value={cd.m} label="Mins" />
          <div className="pregame-cd-sep">:</div>
          <CountdownUnit value={cd.s} label="Secs" />
        </div>
      )}
      <div className="pregame-countdown-block-sub">{subtitle}</div>
    </div>
  );
}

function PlayerPip({ name, index }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const hues = [32, 210, 145, 280, 0, 185, 55, 320, 90, 230];
  const hue = hues[index % hues.length];
  return (
    <div className="pregame-player-pip" title={name} style={{ '--avatar-hue': hue }}>
      <div className="pregame-pip-circle">{initials}</div>
      <div className="pregame-pip-name">{name.split(' ')[0]}</div>
    </div>
  );
}

export default function PreGamePage({ config }) {
  const [names, setNames] = useState([]);
  const [loadingNames, setLoadingNames] = useState(true);

  useEffect(() => {
    getPlayerNames().then(result => {
      if (result.ok) setNames(result.data ?? []);
      setLoadingNames(false);
    });
  }, []);

  return (
    <div className="pregame-page">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="pregame-hero">
        <div className="pregame-hero-glow pregame-glow-1" />
        <div className="pregame-hero-glow pregame-glow-2" />

        <div className="pregame-hero-content">
          <div className="pregame-eyebrow">
            <span className="pregame-eyebrow-dot" />
            Registration Closed
          </div>

          <h1 className="pregame-title">
            Squads Are Set.<br />
            <span className="pregame-title-accent">The Wait Begins.</span>
          </h1>

          <p className="pregame-subtitle">
            {loadingNames ? '…' : `${names.length} player${names.length !== 1 ? 's' : ''}`} registered
            · Teams allocated · Group picks opening soon
          </p>
        </div>
      </div>

      {/* ── Countdowns ───────────────────────────────────────────── */}
      <div className="pregame-countdowns-section">
        <div className="pregame-section-inner">
          <div className="pregame-countdowns-grid">
            <CountdownBlock
              icon="⚽"
              title="Group Picks Open"
              subtitle="Submit your captain preferences for the group stage"
              target={config?.groupPrefsOpen}
              accentClass="pregame-block-gold"
            />
            <div className="pregame-countdowns-divider">
              <div className="pregame-divider-line" />
              <div className="pregame-divider-badge">vs</div>
              <div className="pregame-divider-line" />
            </div>
            <CountdownBlock
              icon="🏆"
              title="Tournament Kick Off"
              subtitle="FIFA World Cup 2026 — USA · Canada · Mexico"
              target={config?.groupScoringOpen}
              accentClass="pregame-block-green"
            />
          </div>
        </div>
      </div>

      {/* ── Players ──────────────────────────────────────────────── */}
      <div className="pregame-players-section">
        <div className="pregame-section-inner">
          <div className="pregame-players-header">
            <div>
              <h2 className="pregame-section-title">Your Rivals</h2>
              <p className="pregame-section-sub">
                {loadingNames
                  ? 'Loading…'
                  : names.length === 0
                  ? 'No players registered yet.'
                  : `${names.length} player${names.length !== 1 ? 's' : ''} locked in`}
              </p>
            </div>
            {!loadingNames && names.length > 0 && (
              <div className="pregame-player-count">{names.length}</div>
            )}
          </div>

          {names.length > 0 && (
            <div className="pregame-avatars-grid">
              {names.map((name, i) => (
                <PlayerPip key={name} name={name} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── What's Next ──────────────────────────────────────────── */}
      <div className="pregame-whats-next">
        <div className="pregame-section-inner">
          <h2 className="pregame-section-title" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            What's Next
          </h2>
          <div className="pregame-timeline">
            {[
              {
                icon: '⚽',
                title: 'Group Picks Open',
                desc: 'Choose a captain for each of your three allocated teams. Your Tier 2 team mechanism can also be set.',
                accent: 'var(--gold)',
              },
              {
                icon: '🌍',
                title: 'Group Stage Begins',
                desc: 'The tournament kicks off. Points rack up from goals, cards, and captain bonuses.',
                accent: 'var(--green)',
              },
              {
                icon: '🏆',
                title: 'Knockout Auction',
                desc: 'Spend your coin budget on knockout-stage teams. Every match win advances your score.',
                accent: 'var(--info)',
              },
              {
                icon: '🥇',
                title: 'Final & Champion',
                desc: 'The champion is crowned. Check the leaderboard to see who wins the sweepstake.',
                accent: '#a78bfa',
              },
            ].map(({ icon, title, desc, accent }, i) => (
              <div key={title} className="pregame-timeline-item">
                <div className="pregame-timeline-step" style={{ '--step-accent': accent }}>
                  <div className="pregame-timeline-dot">{icon}</div>
                  {i < 3 && <div className="pregame-timeline-line" />}
                </div>
                <div className="pregame-timeline-content">
                  <div className="pregame-timeline-title" style={{ color: accent }}>{title}</div>
                  <p className="pregame-timeline-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
