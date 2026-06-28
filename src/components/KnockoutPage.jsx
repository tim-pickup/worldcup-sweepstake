import { useState, useEffect } from 'react';
import Leaderboard from './Leaderboard.jsx';

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

function KoUnit({ value, label, large }) {
  return (
    <div className={`ko-cd-unit${large ? ' ko-cd-unit-lg' : ''}`}>
      <div className="ko-cd-number">{String(value).padStart(2, '0')}</div>
      <div className="ko-cd-label">{label}</div>
    </div>
  );
}

function KoCountdown({ target, large }) {
  const cd = useCountdown(target);
  if (!target) return <div className="ko-cd-tbd">Date to be confirmed</div>;
  if (cd.expired) return <div className="ko-cd-expired">⚡ It's time!</div>;
  return (
    <div className={`ko-cd-row${large ? ' ko-cd-row-lg' : ''}`}>
      <KoUnit value={cd.d} label="Days" large={large} />
      <div className="ko-cd-sep">:</div>
      <KoUnit value={cd.h} label="Hrs" large={large} />
      <div className="ko-cd-sep">:</div>
      <KoUnit value={cd.m} label="Mins" large={large} />
      <div className="ko-cd-sep">:</div>
      <KoUnit value={cd.s} label="Secs" large={large} />
    </div>
  );
}

/* ── Sub-view 1: Group Stage Over, Waiting for Knockout Picks ──────────────── */
function PrePicksView({ config, teamsByName }) {
  return (
    <div className="ko-page">
      {/* Background glows */}
      <div className="ko-glow ko-glow-purple" />
      <div className="ko-glow ko-glow-gold" />

      <div className="ko-hero">
        <div className="ko-eyebrow ko-eyebrow-purple">
          <span className="ko-eyebrow-dot ko-eyebrow-dot-purple" />
          Group Stage Complete
        </div>
        <h1 className="ko-title">
          The Group Stage Is Over.<br />
          <span className="ko-title-accent-purple">Knockout Picks Open Soon.</span>
        </h1>
        <p className="ko-subtitle">
          The dust has settled on the group stage. Study the standings below —
          your knockout team allocations and picks window are coming soon.
        </p>

        <div className="ko-countdown-card ko-countdown-card-purple">
          <div className="ko-countdown-label">🏆 Knockout Picks Open In</div>
          <KoCountdown target={config?.knockoutPrefsOpen} large />
          <div className="ko-countdown-sub">
            Pick your captains wisely — every goal counts in the knockout rounds
          </div>
        </div>

        <div className="ko-stat-chips">
          <div className="ko-stat-chip">
            <div className="ko-stat-icon">🏆</div>
            <div className="ko-stat-text">Knockout Stage</div>
          </div>
          <div className="ko-stat-chip">
            <div className="ko-stat-icon">📋</div>
            <div className="ko-stat-text">Picks Coming</div>
          </div>
          <div className="ko-stat-chip">
            <div className="ko-stat-icon">⚡</div>
            <div className="ko-stat-text">16 Teams Left</div>
          </div>
        </div>
      </div>

      <div className="ko-leaderboard-section">
        <div className="ko-section-divider">
          <div className="ko-divider-line" />
          <div className="ko-divider-badge">📊 Current Standings</div>
          <div className="ko-divider-line" />
        </div>
        <Leaderboard teamsByName={teamsByName} />
      </div>
    </div>
  );
}

/* ── Sub-view 2: Picks Window Open ─────────────────────────────────────────── */
function PicksOpenView({ config, player, onLogin, onViewPicks, teamsByName }) {
  return (
    <div className="ko-page">
      <div className="ko-glow ko-glow-orange" />
      <div className="ko-glow ko-glow-gold" />

      <div className="ko-hero ko-hero-auction">
        <div className="ko-eyebrow ko-eyebrow-danger">
          <span className="ko-eyebrow-dot ko-eyebrow-dot-danger" />
          Knockout Picks Open
        </div>
        <h1 className="ko-title">
          Submit Your Picks.<br />
          <span className="ko-title-accent-danger">The Knockout Begins.</span>
        </h1>
        <p className="ko-subtitle">
          Choose captains for your allocated knockout teams.
          Every goal earns you points — choose wisely.
        </p>

        <div className="ko-deadline-wrap">
          <div className="ko-deadline-label">⏰ Picks window closes in</div>
          <KoCountdown target={config?.knockoutPrefsClose} large />
        </div>

        <div className="ko-cta-wrap">
          {player ? (
            <button className="ko-cta-btn ko-cta-btn-primary" onClick={onViewPicks}>
              Submit My Knockout Picks <span className="ko-cta-arrow">→</span>
            </button>
          ) : (
            <>
              <button className="ko-cta-btn ko-cta-btn-primary" onClick={onLogin}>
                Login to Submit Picks <span className="ko-cta-arrow">→</span>
              </button>
              <p className="ko-cta-note">Log in with your name and PIN to submit your knockout picks</p>
            </>
          )}
        </div>
      </div>

      <div className="ko-leaderboard-section">
        <div className="ko-section-divider">
          <div className="ko-divider-line" />
          <div className="ko-divider-badge">📊 Current Standings</div>
          <div className="ko-divider-line" />
        </div>
        <Leaderboard teamsByName={teamsByName} />
      </div>
    </div>
  );
}

/* ── Sub-view 3: Picks Closed, Waiting for Knockout Scoring ────────────────── */
function PicksLockedView({ config, teamsByName }) {
  return (
    <div className="ko-page">
      <div className="ko-glow ko-glow-green" />
      <div className="ko-glow ko-glow-gold" />

      <div className="ko-hero">
        <div className="ko-eyebrow ko-eyebrow-green">
          <span className="ko-eyebrow-dot ko-eyebrow-dot-green" />
          Picks Locked
        </div>
        <h1 className="ko-title">
          The Picks Are In.<br />
          <span className="ko-title-accent-green">Let The Knockouts Begin.</span>
        </h1>
        <p className="ko-subtitle">
          Everyone's knockout picks are locked. Sit back and watch as the remaining teams battle it out.
          The knockout stage is about to begin.
        </p>

        <div className="ko-countdown-card ko-countdown-card-green">
          <div className="ko-countdown-label">⚡ Knockout Stage Begins In</div>
          <KoCountdown target={config?.knockoutScoringOpen} large />
          <div className="ko-countdown-sub">
            Picks are locked — may the best team win!
          </div>
        </div>

        <div className="ko-stat-chips">
          <div className="ko-stat-chip">
            <div className="ko-stat-icon">🔒</div>
            <div className="ko-stat-text">Picks Locked</div>
          </div>
          <div className="ko-stat-chip">
            <div className="ko-stat-icon">⚽</div>
            <div className="ko-stat-text">Matches Soon</div>
          </div>
          <div className="ko-stat-chip">
            <div className="ko-stat-icon">🏆</div>
            <div className="ko-stat-text">Final Awaits</div>
          </div>
        </div>
      </div>

      <div className="ko-leaderboard-section">
        <div className="ko-section-divider">
          <div className="ko-divider-line" />
          <div className="ko-divider-badge">📊 Current Standings</div>
          <div className="ko-divider-line" />
        </div>
        <Leaderboard teamsByName={teamsByName} />
      </div>
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────────────────────── */
export default function KnockoutPage({ config, player, teamsByName, onLogin, onViewPicks }) {
  const now = Date.now();
  const picksOpen   = config?.knockoutPrefsOpen  && now >= new Date(config.knockoutPrefsOpen).getTime();
  const picksClosed = config?.knockoutPrefsClose && now >= new Date(config.knockoutPrefsClose).getTime();

  if (picksClosed) {
    return <PicksLockedView config={config} teamsByName={teamsByName} />;
  }

  if (picksOpen) {
    return (
      <PicksOpenView
        config={config}
        player={player}
        onLogin={onLogin}
        onViewPicks={onViewPicks}
        teamsByName={teamsByName}
      />
    );
  }

  return <PrePicksView config={config} teamsByName={teamsByName} />;
}
