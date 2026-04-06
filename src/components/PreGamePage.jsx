import { useState, useEffect, useRef } from 'react';
import { getPlayerNames, getTeams } from '../api.js';

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

function CountdownUnit({ value, label, large }) {
  return (
    <div className={`pregame-cd-unit${large ? ' pregame-cd-unit-lg' : ''}`}>
      <div className="pregame-cd-number">{String(value).padStart(2, '0')}</div>
      <div className="pregame-cd-label">{label}</div>
    </div>
  );
}

function CountdownBlock({ icon, title, subtitle, target, accentClass, large }) {
  const cd = useCountdown(target);

  return (
    <div className={`pregame-countdown-block ${accentClass}${large ? ' pregame-countdown-block-lg' : ''}`}>
      {icon && <div className="pregame-countdown-block-icon">{icon}</div>}
      {title && <div className="pregame-countdown-block-title">{title}</div>}
      {!target ? (
        <div className="pregame-cd-tbd">Date to be confirmed</div>
      ) : cd.expired ? (
        <div className="pregame-cd-expired">It's time!</div>
      ) : (
        <div className="pregame-cd-row">
          <CountdownUnit value={cd.d} label="Days" large={large} />
          <div className="pregame-cd-sep">:</div>
          <CountdownUnit value={cd.h} label="Hrs" large={large} />
          <div className="pregame-cd-sep">:</div>
          <CountdownUnit value={cd.m} label="Mins" large={large} />
          <div className="pregame-cd-sep">:</div>
          <CountdownUnit value={cd.s} label="Secs" large={large} />
        </div>
      )}
      {subtitle && <div className="pregame-countdown-block-sub">{subtitle}</div>}
    </div>
  );
}

function PlayerPip({ name, index }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const hues = [32, 210, 145, 280, 0, 185, 55, 320, 90, 230];
  return (
    <div className="pregame-player-pip" title={name} style={{ '--avatar-hue': hues[index % hues.length] }}>
      <div className="pregame-pip-circle">{initials}</div>
      <div className="pregame-pip-name">{name.split(' ')[0]}</div>
    </div>
  );
}

function PlayersSection({ names, loadingNames }) {
  if (loadingNames || names.length === 0) return null;
  return (
    <div className="pregame-players-section">
      <div className="pregame-section-inner">
        <div className="pregame-players-header">
          <div>
            <h2 className="pregame-section-title">Your Rivals</h2>
            <p className="pregame-section-sub">{names.length} player{names.length !== 1 ? 's' : ''} locked in</p>
          </div>
          <div className="pregame-player-count">{names.length}</div>
        </div>
        <div className="pregame-avatars-grid">
          {names.map((name, i) => <PlayerPip key={name} name={name} index={i} />)}
        </div>
      </div>
    </div>
  );
}

const TIMELINE_STEPS = [
  { icon: '🎲', title: 'Group Draw',        desc: 'Teams are randomly drawn and allocated live — three teams per player, one from each tier.', accent: 'var(--gold)' },
  { icon: '⚽', title: 'Group Picks Open',   desc: 'Set your captain for each team and choose your Tier 2 scoring mechanism before the deadline.', accent: '#fb923c' },
  { icon: '🌍', title: 'Group Stage Begins', desc: 'The tournament kicks off. Points rack up from goals, cards, and captain bonuses.', accent: 'var(--green)' },
  { icon: '🏆', title: 'Knockout Auction',   desc: 'Spend your coin budget on knockout-stage teams. Every match win advances your score.', accent: 'var(--info)' },
  { icon: '🥇', title: 'Final & Champion',   desc: 'The champion is crowned. Check the leaderboard to see who wins the sweepstake.', accent: '#a78bfa' },
];

function WhatsNextSection() {
  return (
    <div className="pregame-whats-next">
      <div className="pregame-section-inner">
        <h2 className="pregame-section-title" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>What's Next</h2>
        <div className="pregame-timeline">
          {TIMELINE_STEPS.map(({ icon, title, desc, accent }, i) => (
            <div key={title} className="pregame-timeline-item">
              <div className="pregame-timeline-step" style={{ '--step-accent': accent }}>
                <div className="pregame-timeline-dot">{icon}</div>
                {i < TIMELINE_STEPS.length - 1 && <div className="pregame-timeline-line" />}
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
  );
}

/* ── State A: Pre-Draw ──────────────────────────────────────────────────────── */
function PreDrawView({ config, names, loadingNames }) {
  return (
    <div className="pregame-page">
      <div className="pregame-hero">
        <div className="pregame-hero-glow pregame-glow-1" />
        <div className="pregame-hero-glow pregame-glow-2" />
        <div className="pregame-hero-content">
          <div className="pregame-eyebrow">
            <span className="pregame-eyebrow-dot" />
            Registration Closed
          </div>
          <h1 className="pregame-title">
            Registration Closed.<br />
            <span className="pregame-title-accent">The Draw Is Coming.</span>
          </h1>
          <p className="pregame-subtitle">
            {loadingNames ? '…' : `${names.length} player${names.length !== 1 ? 's' : ''}`} registered
            · Teams drawn live · Picks open after the draw
          </p>
        </div>
      </div>

      <div className="pregame-countdowns-section">
        <div className="pregame-section-inner">
          <div className="pregame-countdowns-grid">
            <CountdownBlock icon="🎲" title="Group Draw" subtitle="Watch live as teams are randomly allocated to players" target={config?.groupDrawDate} accentClass="pregame-block-gold" />
            <div className="pregame-countdowns-divider">
              <div className="pregame-divider-line" />
              <div className="pregame-divider-badge">then</div>
              <div className="pregame-divider-line" />
            </div>
            <CountdownBlock icon="🏆" title="Tournament Kick Off" subtitle="FIFA World Cup 2026 — USA · Canada · Mexico" target={config?.groupScoringOpen} accentClass="pregame-block-green" />
          </div>
        </div>
      </div>

      <PlayersSection names={names} loadingNames={loadingNames} />
      <WhatsNextSection />
    </div>
  );
}

/* ── State B: Post-Draw, Picks Not Yet Open ─────────────────────────────────── */
function PostDrawPrePicksView({ config, names, loadingNames }) {
  return (
    <div className="pregame-page">
      <div className="pregame-hero">
        <div className="pregame-hero-glow pregame-glow-1" />
        <div className="pregame-hero-content">
          <div className="pregame-eyebrow pregame-eyebrow-amber">
            <span className="pregame-eyebrow-dot pregame-eyebrow-dot-amber" />
            Draw Complete
          </div>
          <h1 className="pregame-title">
            The Draw Is Done.<br />
            <span className="pregame-title-accent">Picks Open Soon.</span>
          </h1>
          <p className="pregame-subtitle">
            Teams have been allocated. Get ready to set your captains — the picks window opens shortly.
          </p>
        </div>
      </div>

      <div className="pregame-countdowns-section">
        <div className="pregame-section-inner">
          <div className="pregame-countdowns-grid">
            <CountdownBlock icon="⚽" title="Picks Window Opens" subtitle="Log in and submit your captain selections" target={config?.groupPrefsOpen} accentClass="pregame-block-gold" />
            <div className="pregame-countdowns-divider">
              <div className="pregame-divider-line" />
              <div className="pregame-divider-badge">then</div>
              <div className="pregame-divider-line" />
            </div>
            <CountdownBlock icon="🏆" title="Tournament Kick Off" subtitle="FIFA World Cup 2026 — USA · Canada · Mexico" target={config?.groupScoringOpen} accentClass="pregame-block-green" />
          </div>
        </div>
      </div>

      <PlayersSection names={names} loadingNames={loadingNames} />
    </div>
  );
}

/* ── State C: Picks Window Open ─────────────────────────────────────────────── */
function PicksOpenView({ config, names, loadingNames, player, onLogin, onViewPicks }) {
  return (
    <div className="pregame-page">
      <div className="pregame-hero pregame-hero-picks">
        <div className="pregame-hero-glow pregame-glow-picks" />
        <div className="pregame-hero-content">
          <div className="pregame-eyebrow pregame-eyebrow-danger">
            <span className="pregame-eyebrow-dot pregame-eyebrow-dot-danger" />
            Picks Window Open
          </div>

          <h1 className="pregame-title">
            Time to Submit<br />
            <span className="pregame-title-accent-danger">Your Group Picks</span>
          </h1>

          <p className="pregame-subtitle">
            Your teams have been drawn. Set a captain for each team and your Tier 2 mechanism before the deadline.
          </p>

          <div className="pregame-deadline-wrap">
            <div className="pregame-deadline-label">⏰ Deadline — picks close in</div>
            <CountdownBlock target={config?.groupPrefsClose} accentClass="pregame-block-danger" large />
          </div>

          <div className="pregame-picks-cta-wrap">
            {player ? (
              <button className="pregame-picks-cta" onClick={onViewPicks}>
                Submit My Picks <span className="pregame-cta-arrow">→</span>
              </button>
            ) : (
              <>
                <button className="pregame-picks-cta" onClick={onLogin}>
                  Login to Submit <span className="pregame-cta-arrow">→</span>
                </button>
                <p className="pregame-picks-cta-note">Log in with your name and PIN to see your allocated teams</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="pregame-tournament-section">
        <div className="pregame-section-inner pregame-tournament-inner">
          <CountdownBlock icon="🏆" title="Tournament Kick Off" subtitle="FIFA World Cup 2026 — USA · Canada · Mexico" target={config?.groupScoringOpen} accentClass="pregame-block-green" />
        </div>
      </div>

      <PlayersSection names={names} loadingNames={loadingNames} />
    </div>
  );
}

/* ── State D: Tournament Countdown (picks closed, scoring not yet started) ──── */
function TournamentUnit({ value, label }) {
  return (
    <div className="tc-unit">
      <div className="tc-number">{String(value).padStart(2, '0')}</div>
      <div className="tc-label">{label}</div>
    </div>
  );
}

function TournamentCountdownView({ config, names }) {
  const [teams, setTeams] = useState([]);
  const cd = useCountdown(config?.groupScoringOpen);

  useEffect(() => {
    getTeams().then(r => { if (r.ok) setTeams(r.data ?? []); });
  }, []);

  // Duplicate for seamless marquee loop
  const marqueeTeams = teams.length > 0 ? [...teams, ...teams] : [];

  return (
    <div className="tc-page">
      {/* Festival atmosphere layers */}
      <div className="tc-stars" />
      <div className="tc-beam tc-beam-1" />
      <div className="tc-beam tc-beam-2" />
      <div className="tc-beam tc-beam-3" />
      {/* Multi-colour background glows */}
      <div className="tc-glow tc-glow-a" />
      <div className="tc-glow tc-glow-b" />
      <div className="tc-glow tc-glow-c" />

      {/* Hero */}
      <div className="tc-hero">
        <div className="tc-eyebrow">
          <span className="tc-eyebrow-star">★</span>
          FIFA World Cup 2026
          <span className="tc-eyebrow-star">★</span>
        </div>

        <h1 className="tc-headline">
          The Tournament<br />
          <span className="tc-headline-accent">Begins In</span>
        </h1>

        {/* Massive countdown */}
        {cd.expired ? (
          <div className="tc-kickoff">⚡ We're Live!</div>
        ) : (
          <div className="tc-countdown-row">
            <TournamentUnit value={cd.d} label="Days" />
            <div className="tc-sep">:</div>
            <TournamentUnit value={cd.h} label="Hours" />
            <div className="tc-sep">:</div>
            <TournamentUnit value={cd.m} label="Minutes" />
            <div className="tc-sep">:</div>
            <TournamentUnit value={cd.s} label="Seconds" />
          </div>
        )}

        {/* Picks locked pill */}
        <div className="tc-locked-pill">
          <span className="tc-locked-icon">🔒</span>
          Picks locked in
          {names.length > 0 && <> · <strong>{names.length}</strong> players ready</>}
        </div>

        {/* Host nations */}
        <div className="tc-hosts">
          <span className="tc-host">
            <img src="https://flagcdn.com/w40/us.png" alt="USA" className="tc-host-flag" />
            USA
          </span>
          <span className="tc-host-sep">·</span>
          <span className="tc-host">
            <img src="https://flagcdn.com/w40/ca.png" alt="Canada" className="tc-host-flag" />
            Canada
          </span>
          <span className="tc-host-sep">·</span>
          <span className="tc-host">
            <img src="https://flagcdn.com/w40/mx.png" alt="Mexico" className="tc-host-flag" />
            Mexico
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="tc-section-divider">
        <div className="tc-divider-line" />
        <div className="tc-divider-label">The Nations</div>
        <div className="tc-divider-line" />
      </div>

      {/* Scrolling flags marquee */}
      {marqueeTeams.length > 0 && (
        <div className="tc-marquee-wrap">
          <div className="tc-marquee-fade tc-fade-left" />
          <div className="tc-marquee-fade tc-fade-right" />
          <div className="tc-marquee-track">
            {marqueeTeams.map((team, i) => (
              <div key={`${team['Team Name']}-${i}`} className="tc-flag-chip">
                {team['Flag Emoji']?.startsWith('http')
                  ? <img src={team['Flag Emoji']} alt="" className="tc-flag-img" />
                  : <span className="tc-flag-emoji">{team['Flag Emoji'] || '🏳'}</span>}
                <span className="tc-flag-name">{team['Team Name']}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Second row scrolling the other way */}
      {marqueeTeams.length > 0 && (
        <div className="tc-marquee-wrap" style={{ marginTop: '0.75rem' }}>
          <div className="tc-marquee-fade tc-fade-left" />
          <div className="tc-marquee-fade tc-fade-right" />
          <div className="tc-marquee-track tc-marquee-reverse">
            {marqueeTeams.map((team, i) => (
              <div key={`${team['Team Name']}-rev-${i}`} className="tc-flag-chip tc-flag-chip-alt">
                <span className="tc-flag-emoji">{team['Flag Emoji'] || '🏳'}</span>
                <span className="tc-flag-name">{team['Team Name']}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tagline */}
      <div className="tc-tagline">
        <span className="tc-tagline-accent">48 nations.</span>
        &nbsp;104 matches.&nbsp;
        <span className="tc-tagline-accent">One champion.</span>
      </div>
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────────────────────── */
export default function PreGamePage({ config, player, onLogin, onViewPicks }) {
  const [names, setNames] = useState([]);
  const [loadingNames, setLoadingNames] = useState(true);

  useEffect(() => {
    getPlayerNames().then(result => {
      if (result.ok) setNames(result.data ?? []);
      setLoadingNames(false);
    });
  }, []);

  const now = Date.now();
  const drawDone    = config?.groupDrawDate   && now >= new Date(config.groupDrawDate).getTime();
  const picksOpen   = config?.groupPrefsOpen  && now >= new Date(config.groupPrefsOpen).getTime();
  const picksClosed = config?.groupPrefsClose && now >= new Date(config.groupPrefsClose).getTime();

  // State D — picks closed, tournament not yet started
  if (picksClosed) {
    return <TournamentCountdownView config={config} names={names} />;
  }

  // State C — picks window is open
  if (picksOpen) {
    return <PicksOpenView config={config} names={names} loadingNames={loadingNames} player={player} onLogin={onLogin} onViewPicks={onViewPicks} />;
  }

  // State B — draw done, picks not open yet
  if (drawDone) {
    return <PostDrawPrePicksView config={config} names={names} loadingNames={loadingNames} />;
  }

  // State A — waiting for the draw
  return <PreDrawView config={config} names={names} loadingNames={loadingNames} />;
}
