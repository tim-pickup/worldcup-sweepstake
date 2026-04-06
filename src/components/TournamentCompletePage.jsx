import { useState, useEffect, useRef, useCallback } from 'react';
import { getLeaderboard } from '../api.js';
import Flag from './Flag.jsx';
import { getPlayerPicks } from '../api.js';

/* ── Confetti canvas ──────────────────────────────────────────────────────── */
const CONFETTI_COLORS = [
  '#ffd700', '#f59e0b', '#fbbf24',   // golds
  '#3fb950', '#34d399',               // greens
  '#58a6ff', '#60a5fa',               // blues
  '#a78bfa', '#c084fc',               // purples
  '#f87171', '#fb7185',               // reds
  '#ffffff', '#e6edf3',               // whites
];

function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const particles = useRef([]);

  const createParticle = useCallback((canvas) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    return {
      x:      Math.random() * canvas.width,
      y:      -10 - Math.random() * 40,
      vx:     Math.cos(angle) * speed * 0.5,
      vy:     speed,
      rot:    Math.random() * 360,
      rotV:   (Math.random() - 0.5) * 8,
      w:      6 + Math.random() * 8,
      h:      3 + Math.random() * 5,
      color:  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape:  Math.random() > 0.5 ? 'rect' : 'circle',
      alpha:  1,
      decay:  0.994 + Math.random() * 0.005,
    };
  }, []);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Burst of initial particles
    for (let i = 0; i < 160; i++) {
      const p = createParticle(canvas);
      p.y = Math.random() * canvas.height * 0.5; // spread initial burst
      particles.current.push(p);
    }

    let frameCount = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Emit new particles for first ~5 seconds (300 frames @ 60fps)
      if (frameCount < 300 && frameCount % 3 === 0) {
        particles.current.push(createParticle(canvas));
      }

      particles.current = particles.current.filter(p => p.alpha > 0.02);

      for (const p of particles.current) {
        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += 0.08; // gravity
        p.vx  *= 0.99; // air resistance
        p.rot += p.rotV;
        p.alpha *= p.decay;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      frameCount++;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      particles.current = [];
    };
  }, [active, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="finale-confetti-canvas"
      style={{ pointerEvents: 'none' }}
    />
  );
}

/* ── Podium ───────────────────────────────────────────────────────────────── */
const PODIUM_CFG = {
  1: {
    medal: '🥇', label: '1st Place',
    accent: '#ffd700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.4)',
    height: 140, glow: 'rgba(255,215,0,0.25)',
  },
  2: {
    medal: '🥈', label: '2nd Place',
    accent: '#b0b8c1', bg: 'rgba(176,184,193,0.06)', border: 'rgba(176,184,193,0.3)',
    height: 100, glow: 'rgba(176,184,193,0.15)',
  },
  3: {
    medal: '🥉', label: '3rd Place',
    accent: '#cd7f32', bg: 'rgba(205,127,50,0.06)', border: 'rgba(205,127,50,0.3)',
    height: 80, glow: 'rgba(205,127,50,0.15)',
  },
};

function PodiumPillar({ row, position }) {
  if (!row) return <div className="finale-podium-slot-empty" />;
  const cfg = PODIUM_CFG[position];
  return (
    <div className="finale-podium-slot" style={{ '--pillar-order': position === 1 ? 0 : position === 2 ? -1 : 1 }}>
      {/* Name + points card */}
      <div
        className={`finale-podium-card finale-podium-pos-${position}`}
        style={{
          '--p-accent': cfg.accent,
          '--p-bg': cfg.bg,
          '--p-border': cfg.border,
          '--p-glow': cfg.glow,
        }}
      >
        <div className="finale-podium-medal">{cfg.medal}</div>
        <div className="finale-podium-name">{row['Player Name']}</div>
        <div className="finale-podium-pts">{row['Total Points'] ?? 0}</div>
        <div className="finale-podium-pts-label">points</div>
        <div className="finale-podium-rank-label">{cfg.label}</div>
      </div>
      {/* Pillar */}
      <div
        className="finale-podium-pillar"
        style={{ height: cfg.height, background: cfg.bg, borderColor: cfg.border }}
      >
        <span className="finale-pillar-num">{position}</span>
      </div>
    </div>
  );
}

function FinaleLeaderboard({ rows, teamsByName }) {
  const [expanded, setExpanded] = useState(null);
  const topPts = rows[0]?.['Total Points'] ?? 1;

  const RANK_DISPLAY = (rank) => {
    if (rank === 1) return <span className="finale-lr-medal" style={{ color: '#ffd700' }}>🥇</span>;
    if (rank === 2) return <span className="finale-lr-medal" style={{ color: '#b0b8c1' }}>🥈</span>;
    if (rank === 3) return <span className="finale-lr-medal" style={{ color: '#cd7f32' }}>🥉</span>;
    return <span className="finale-lr-rank">{rank}</span>;
  };

  return (
    <div className="finale-leaderboard-wrap">
      <table className="finale-lb-table">
        <thead>
          <tr>
            <th className="finale-col-rank">#</th>
            <th>Player</th>
            <th className="finale-col-pts">Pts</th>
            <th className="finale-col-sub">Goals</th>
            <th className="finale-col-sub">Capt</th>
            <th className="finale-col-sub">OG</th>
            <th className="finale-col-sub">Cards</th>
            <th style={{ width: 24 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const name   = row['Player Name'];
            const rank   = row['Rank'] ?? i + 1;
            const pts    = row['Total Points'] ?? 0;
            const isOpen = expanded === name;
            const barPct = topPts > 0 ? Math.round((pts / topPts) * 100) : 0;

            return [
              <tr
                key={`row-${name}`}
                className={`finale-player-row${isOpen ? ' expanded' : ''}${rank <= 3 ? ` finale-top-${rank}` : ''}`}
                onClick={() => setExpanded(prev => prev === name ? null : name)}
              >
                <td className="finale-col-rank">{RANK_DISPLAY(rank)}</td>
                <td className="finale-col-player">
                  <div className="finale-name-wrap">
                    <span className="finale-player-name">{name}</span>
                    <div
                      className="finale-pts-bar"
                      style={{ width: `${barPct}%`, '--bar-color': rank === 1 ? 'var(--gold)' : 'var(--border-bright)' }}
                    />
                  </div>
                </td>
                <td className="finale-col-pts">
                  <span className={`finale-pts-badge${rank === 1 ? ' finale-pts-badge-gold' : ''}`}>{pts}</span>
                </td>
                <td className="finale-col-sub">{row['Goal Points']    ?? 0}</td>
                <td className="finale-col-sub">{row['Captain Points'] ?? 0}</td>
                <td className="finale-col-sub">{row['Own Goal Points'] ?? 0}</td>
                <td className="finale-col-sub">{row['Card Points']    ?? 0}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`finale-chevron${isOpen ? ' open' : ''}`}>▼</span>
                </td>
              </tr>,

              isOpen && (
                <tr key={`picks-${name}`} className="finale-picks-row">
                  <td colSpan={8}>
                    <FinaleExpandedPicks playerName={name} teamsByName={teamsByName} />
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function FinaleExpandedPicks({ playerName, teamsByName }) {
  const [picks, setPicks]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPlayerPicks(playerName).then(result => {
      if (cancelled) return;
      if (result.ok) setPicks(result.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [playerName]);

  if (loading) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading picks…</div>;
  if (!picks)  return null;

  const { allocations = [], groupPreferences = [], knockoutPreferences = [] } = picks;
  const hasKnockout = knockoutPreferences.length > 0;
  const hasGroup    = allocations.length > 0;

  if (!hasGroup && !hasKnockout) {
    return <div style={{ padding: '1rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No picks submitted.</div>;
  }

  const koCapt  = knockoutPreferences[0]?.['Captain Name'];
  const koTotal = knockoutPreferences[0]?.['Total Spend'];

  return (
    <div className="picks-row-inner" style={{ padding: '0.75rem 0' }}>
      {hasKnockout && (
        <div>
          <div className="picks-section-label">
            🏆 Knockout — {koTotal != null ? `${koTotal} coins spent` : ''}
            {koCapt ? ` · 👑 ${koCapt}` : ''}
          </div>
          <div className="ko-picks-grid">
            {knockoutPreferences.map(row => (
              <span key={row['Team Purchased']} className="ko-pick-chip">
                <Flag value={teamsByName?.[row['Team Purchased']]?.['Flag Emoji']} />
                {row['Team Purchased']}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  {row['Price Paid'] != null ? ` · ${row['Price Paid']}c` : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      {hasGroup && (
        <div>
          <div className="picks-section-label">⚽ Group Stage</div>
          <div className="team-picks-grid">
            {allocations
              .slice()
              .sort((a, b) => (a['Tier'] ?? 0) - (b['Tier'] ?? 0))
              .map(alloc => {
                const teamName  = alloc['Team Name'];
                const tier      = alloc['Tier'] ?? alloc['tier'];
                const pref      = groupPreferences?.find(p => p['Team Name'] === teamName);
                const captain   = pref?.['Captain Name'];
                return (
                  <div key={teamName} className={`team-pick-card tier-${tier}`}>
                    <div className="team-pick-name">
                      <Flag value={teamsByName?.[teamName]?.['Flag Emoji']} />
                      {teamName}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span className={`badge badge-tier-${tier}`}>Tier {tier}</span>
                    </div>
                    {captain
                      ? <div className="team-pick-captain">👑 {captain}</div>
                      : <div className="team-pick-detail" style={{ fontStyle: 'italic' }}>No captain set</div>
                    }
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export default function TournamentCompletePage({ teamsByName = {} }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [confettiActive, setConfettiActive] = useState(true);

  useEffect(() => {
    getLeaderboard().then(result => {
      if (result.ok) {
        const sorted = [...(result.data ?? [])].sort((a, b) => (a['Rank'] ?? Infinity) - (b['Rank'] ?? Infinity));
        setRows(sorted);
      }
      setLoading(false);
    });
  }, []);

  // Stop confetti after 12 seconds
  useEffect(() => {
    const timer = setTimeout(() => setConfettiActive(false), 12000);
    return () => clearTimeout(timer);
  }, []);

  const winner = rows[0];

  return (
    <div className="finale-page">
      {/* Full-page confetti overlay */}
      <Confetti active={confettiActive} />

      {/* Atmospheric layers */}
      <div className="finale-glow finale-glow-gold" />
      <div className="finale-glow finale-glow-purple" />
      <div className="finale-glow finale-glow-blue" />

      {/* Beam effects */}
      <div className="finale-beam finale-beam-1" />
      <div className="finale-beam finale-beam-2" />
      <div className="finale-beam finale-beam-3" />

      {/* Hero */}
      <div className="finale-hero">
        <div className="finale-trophy-icon">🏆</div>

        <div className="finale-eyebrow">
          <span className="finale-eyebrow-star">★</span>
          FIFA World Cup 2026 — Sweepstake Complete
          <span className="finale-eyebrow-star">★</span>
        </div>

        <h1 className="finale-headline">
          {winner ? (
            <>
              <span className="finale-winner-name">{winner['Player Name']}</span>
              <br />
              <span className="finale-headline-sub">Wins the Sweepstake!</span>
            </>
          ) : (
            'The Tournament Is Complete!'
          )}
        </h1>

        {winner && (
          <div className="finale-winner-pts">
            <span className="finale-pts-big">{winner['Total Points'] ?? 0}</span>
            <span className="finale-pts-label">final points</span>
          </div>
        )}

        <button
          className="finale-confetti-btn"
          onClick={() => setConfettiActive(true)}
          title="Celebrate again!"
        >
          🎉 Celebrate Again
        </button>
      </div>

      {/* Podium */}
      {!loading && rows.length >= 1 && (
        <div className="finale-podium-section">
          <div className="finale-section-heading">The Podium</div>
          <div className="finale-podium">
            <PodiumPillar row={rows[1]} position={2} />
            <PodiumPillar row={rows[0]} position={1} />
            <PodiumPillar row={rows[2]} position={3} />
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="finale-lb-section">
        <div className="finale-section-divider">
          <div className="finale-divider-line" />
          <div className="finale-divider-badge">📊 Final Standings</div>
          <div className="finale-divider-line" />
        </div>

        <div className="card leaderboard" style={{ marginBottom: '2rem' }}>
          <div className="leaderboard-header">
            <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
              🏆 Final Leaderboard
            </h2>
          </div>

          {loading && <div className="loading">Loading final standings…</div>}
          {!loading && rows.length === 0 && (
            <div className="empty-state">No scores found.</div>
          )}
          {!loading && rows.length > 0 && (
            <FinaleLeaderboard rows={rows} teamsByName={teamsByName} />
          )}
        </div>
      </div>
    </div>
  );
}
