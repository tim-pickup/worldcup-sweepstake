import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLeaderboard, getPlayerPicks, getAllAllocations, getAllKnockoutAllocations, getMatches } from '../api.js';
import Flag from './Flag.jsx';

const TIER_LABELS = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' };

const PODIUM_CFG = {
  1: { medal: '🥇', accent: '#ffd700', dimBg: 'rgba(255,215,0,0.06)',  border: 'rgba(255,215,0,0.3)'  },
  2: { medal: '🥈', accent: '#b0b8c1', dimBg: 'rgba(176,184,193,0.06)', border: 'rgba(176,184,193,0.22)' },
  3: { medal: '🥉', accent: '#cd7f32', dimBg: 'rgba(205,127,50,0.06)',  border: 'rgba(205,127,50,0.25)' },
};

/* ── Podium ──────────────────────────────────────────────────────────────────── */
function PodiumCard({ row, position }) {
  const { medal, accent, dimBg, border } = PODIUM_CFG[position];
  const pts = row['Total Points'] ?? 0;
  return (
    <div
      className={`podium-card podium-${position}`}
      style={{ '--p-accent': accent, '--p-bg': dimBg, '--p-border': border }}
    >
      <div className="podium-medal">{medal}</div>
      <div className="podium-name">{row['Player Name']}</div>
      <div className="podium-pts">{pts}</div>
      <div className="podium-pts-label">pts</div>
    </div>
  );
}

function Podium({ rows }) {
  if (rows.length === 0) return null;
  return (
    <div className="leaderboard-podium">
      {rows[1] ? <PodiumCard row={rows[1]} position={2} /> : <div />}
      <PodiumCard row={rows[0]} position={1} />
      {rows[2] ? <PodiumCard row={rows[2]} position={3} /> : <div />}
    </div>
  );
}

/* ── Expanded picks ──────────────────────────────────────────────────────────── */
function TeamPickCard({ alloc, groupPrefs, teamsByName }) {
  const tier      = alloc['Tier'] ?? alloc['tier'];
  const teamName  = alloc['Team Name'];
  const pref      = groupPrefs?.find(p => p['Team Name'] === teamName);
  const captain   = pref?.['Captain Name'];
  const mechanism = pref?.['Tier 2 Mechanism'] ?? pref?.['2 Mechanism'];

  return (
    <div className={`team-pick-card tier-${tier}`}>
      <div className="team-pick-name">
        <Flag value={teamsByName?.[teamName]?.['Flag Emoji']} />
        {teamName}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem' }}>
        <span className={`badge badge-tier-${tier}`}>{TIER_LABELS[tier] ?? `Tier ${tier}`}</span>
        {Number(tier) === 2 && mechanism && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            ⚡ {mechanism === 'scored' ? 'Goals Scored' : 'Goals Conceded'}
          </span>
        )}
      </div>
      {captain
        ? <div className="team-pick-captain">👑 {captain}</div>
        : <div className="team-pick-detail" style={{ fontStyle: 'italic' }}>No captain set</div>
      }
    </div>
  );
}

/* ── Points activity ─────────────────────────────────────────────────────────── */
const EVENT_ICONS = {
  'Goal':          '⚽',
  'Captain Goal':  '👑',
  'Own Goal':      '🔴',
  'Red Card':      '🟥',
  'Yellow Card':   '🟨',
  'Match Win':     '🏆',
  'Match Draw':    '🤝',
};

function describeActivityEvent(entry) {
  const type     = entry['Event Type'];
  const player   = entry['Event Player'];
  const minute   = entry['Minute'];
  const team     = entry['Player Team'];
  const category = entry['Category'];
  const minuteStr = (minute !== '' && minute != null) ? ` ${minute}'` : '';

  let label = type;
  if (type === 'Goal') {
    if (category === 'Goals Scored')   label = 'Goal Scored';
    else if (category === 'Goals Conceded') label = 'Goal Conceded';
  }

  if (player) return `${player}${minuteStr} — ${label}${team ? ` (${team})` : ''}`;
  if (type === 'Match Win')  return `${team} won the match`;
  if (type === 'Match Draw') return `${team} drew`;
  return `${label}${minuteStr}`;
}

function PointsBadge({ points }) {
  const value = Number(points) || 0;
  const cls = value > 0 ? 'points-event-positive' : value < 0 ? 'points-event-negative' : '';
  return <span className={`points-event-points ${cls}`}>{value > 0 ? `+${value}` : value}</span>;
}

function PointsActivityBreakdown({ activity, matches = [] }) {
  const matchesById = useMemo(() => {
    const map = {};
    for (const match of matches) {
      map[String(match['Match ID'])] = match;
    }
    return map;
  }, [matches]);

  const groups = useMemo(() => {
    const byMatch = {};
    for (const entry of activity) {
      const matchId = entry['Match ID'];
      (byMatch[matchId] ??= []).push(entry);
    }
    return Object.entries(byMatch).sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0));
  }, [activity]);

  return (
    <div>
      <div className="picks-section-label">📊 Points Activity</div>
      <div className="points-activity-list">
        {groups.map(([matchId, entries]) => {
          const subtotal = entries.reduce((sum, e) => sum + (Number(e['Points']) || 0), 0);
          const match = matchesById[String(matchId)];
          const heading = match ? `${match['Home Team']} v ${match['Away Team']}` : `Match ${matchId}`;
          return (
            <div className="points-activity-match" key={matchId}>
              <div className="points-activity-match-header">
                <span>{heading}</span>
                <PointsBadge points={subtotal} />
              </div>
              {entries.map((entry, i) => (
                <div className="points-activity-event" key={i}>
                  <span className="points-event-icon">{EVENT_ICONS[entry['Event Type']] ?? '•'}</span>
                  <span className="points-event-desc">{describeActivityEvent(entry)}</span>
                  <PointsBadge points={entry['Points']} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpandedPicks({ playerName, teamsByName, matches }) {
  const [picks, setPicks]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getPlayerPicks(playerName).then(result => {
      if (cancelled) return;
      if (result.ok) setPicks(result.data);
      else setError(result.error ?? 'Could not load picks.');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [playerName]);

  if (loading) return <div className="loading" style={{ padding: '1rem 0' }}>Loading picks…</div>;
  if (error)   return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{error}</div>;
  if (!picks)  return null;

  const {
    allocations = [],
    groupPreferences = [],
    knockoutAllocations = [],
    knockoutPreferences = [],
    pointsActivity = [],
  } = picks;
  const hasGroup    = allocations.length > 0;
  const hasKnockout = knockoutAllocations.length > 0;
  const hasActivity = pointsActivity.length > 0;

  if (!hasGroup && !hasKnockout && !hasActivity) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>No picks submitted yet.</div>;
  }

  return (
    <div className="picks-row-inner">
      {hasGroup && (
        <div>
          <div className="picks-section-label">⚽ Group Stage</div>
          <div className="team-picks-grid">
            {allocations
              .slice()
              .sort((a, b) => (a['Tier'] ?? 0) - (b['Tier'] ?? 0))
              .map(alloc => (
                <TeamPickCard
                  key={alloc['Team Name']}
                  alloc={alloc}
                  groupPrefs={groupPreferences}
                  teamsByName={teamsByName}
                />
              ))}
          </div>
        </div>
      )}
      {hasKnockout && (
        <div>
          <div className="picks-section-label">🏆 Knockout Stage</div>
          <div className="team-picks-grid">
            {knockoutAllocations
              .slice()
              .sort((a, b) => (a['Tier'] ?? 0) - (b['Tier'] ?? 0))
              .map(alloc => (
                <TeamPickCard
                  key={alloc['Team Name']}
                  alloc={alloc}
                  groupPrefs={knockoutPreferences}
                  teamsByName={teamsByName}
                />
              ))}
          </div>
        </div>
      )}
      {hasActivity && <PointsActivityBreakdown activity={pointsActivity} matches={matches} />}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export default function Leaderboard({ onRowsChange, teamsByName = {} }) {
  const [rows,        setRows]        = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [knockoutAllocations, setKnockoutAllocations] = useState([]);
  const [matches,     setMatches]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [leaderboardResult, allocationsResult, knockoutAllocationsResult, matchesResult] = await Promise.all([
      getLeaderboard(),
      getAllAllocations(),
      getAllKnockoutAllocations(),
      getMatches(),
    ]);
    if (leaderboardResult.ok) {
      const sorted = [...(leaderboardResult.data ?? [])].sort((a, b) => (a['Rank'] ?? Infinity) - (b['Rank'] ?? Infinity));
      setRows(sorted);
      onRowsChange?.(sorted);
    } else {
      setError(leaderboardResult.error ?? 'Failed to load leaderboard.');
    }
    if (allocationsResult.ok)         setAllocations(allocationsResult.data ?? []);
    if (knockoutAllocationsResult.ok) setKnockoutAllocations(knockoutAllocationsResult.data ?? []);
    if (matchesResult.ok)             setMatches(matchesResult.data ?? []);
    setLoading(false);
  }, [onRowsChange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleExpand(name) {
    setExpanded(prev => prev === name ? null : name);
  }

  // Maps of team name -> number of completed matches, split by stage since a
  // player's group-stage teams and knockout-stage teams can differ, and each
  // pick only earns points (and "counts as played") for matches in its own stage.
  const { groupMatchesPlayedByTeam, knockoutMatchesPlayedByTeam } = useMemo(() => {
    const group = {};
    const knockout = {};
    for (const match of matches) {
      const homeScore = match['Home Score'];
      const awayScore = match['Away Score'];
      if (homeScore === '' || homeScore == null || awayScore === '' || awayScore == null) continue;
      const counts = match['Stage'] === 'Group Stage' ? group : knockout;
      const home = match['Home Team'];
      const away = match['Away Team'];
      if (home) counts[home] = (counts[home] ?? 0) + 1;
      if (away) counts[away] = (counts[away] ?? 0) + 1;
    }
    return { groupMatchesPlayedByTeam: group, knockoutMatchesPlayedByTeam: knockout };
  }, [matches]);

  // Map of player name -> array of their group-stage team picks.
  const groupTeamsByPlayer = useMemo(() => {
    const map = {};
    for (const alloc of allocations) {
      const name = alloc['Player Name'];
      const team = alloc['Team Name'];
      if (!name || !team) continue;
      (map[name] ??= []).push(team);
    }
    return map;
  }, [allocations]);

  // Map of player name -> array of their knockout-stage team picks.
  const knockoutTeamsByPlayer = useMemo(() => {
    const map = {};
    for (const alloc of knockoutAllocations) {
      const name = alloc['Player Name'];
      const team = alloc['Team Name'];
      if (!name || !team) continue;
      (map[name] ??= []).push(team);
    }
    return map;
  }, [knockoutAllocations]);

  function getGamesPlayed(playerName) {
    const groupTeams    = groupTeamsByPlayer[playerName] ?? [];
    const knockoutTeams = knockoutTeamsByPlayer[playerName] ?? [];
    if (groupTeams.length === 0 && knockoutTeams.length === 0) return null;
    const groupPlayed    = groupTeams.reduce((sum, team) => sum + (groupMatchesPlayedByTeam[team] ?? 0), 0);
    const knockoutPlayed = knockoutTeams.reduce((sum, team) => sum + (knockoutMatchesPlayedByTeam[team] ?? 0), 0);
    return groupPlayed + knockoutPlayed;
  }

  const topPts    = rows[0]?.['Total Points'] ?? 1;
  const COL_COUNT = 8;

  const RANK_DISPLAY = (rank) => {
    if (rank === 1) return <span className="lr-medal" style={{ color: '#ffd700' }}>🥇</span>;
    if (rank === 2) return <span className="lr-medal" style={{ color: '#b0b8c1' }}>🥈</span>;
    if (rank === 3) return <span className="lr-medal" style={{ color: '#cd7f32' }}>🥉</span>;
    return <span className="lr-rank-num">{rank}</span>;
  };

  return (
    <div className="card leaderboard">
      {/* Header row */}
      <div className="leaderboard-header">
        <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          🏆 Leaderboard
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error   && <div className="error">{error}</div>}
      {loading && !error && <div className="loading">Loading leaderboard…</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="empty-state">No scores yet — check back once the group stage begins!</div>
      )}

      {!loading && rows.length > 0 && (
        <>
          {/* Podium for top 3 */}
          <Podium rows={rows} />

          {/* Full table */}
          <div className="leaderboard-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-rank">#</th>
                  <th>Player</th>
                  <th className="col-pts">Pts</th>
                  <th className="col-sub">Goals</th>
                  <th className="col-sub">Capt</th>
                  <th className="col-sub">Results</th>
                  <th className="col-sub">Penalties</th>
                  <th className="col-sub">Played</th>
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
                  const gamesPlayed = getGamesPlayed(name);

                  return [
                    <tr
                      key={`row-${name}`}
                      className={`player-row${isOpen ? ' expanded' : ''}${rank <= 3 ? ` top-${rank}` : ''}`}
                      onClick={() => toggleExpand(name)}
                    >
                      <td className="col-rank">{RANK_DISPLAY(rank)}</td>
                      <td className="col-player">
                        <div className="player-name-wrap">
                          <span className="player-name">{name}</span>
                          <div
                            className="player-pts-bar"
                            style={{ width: `${barPct}%`, '--bar-color': rank === 1 ? 'var(--gold)' : 'var(--border-bright)' }}
                          />
                        </div>
                      </td>
                      <td className="col-pts">
                        <span className={`pts-badge${rank === 1 ? ' pts-badge-gold' : ''}`}>{pts}</span>
                      </td>
                      <td className="col-sub">{row['Goal Points']     ?? 0}</td>
                      <td className="col-sub">{row['Captain Points']  ?? 0}</td>
                      <td className="col-sub">{row['Result Points']   ?? 0}</td>
                      <td className="col-sub">{row['Penalty Points']  ?? 0}</td>
                      <td className="col-sub">
                        {gamesPlayed !== null ? gamesPlayed : '–'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`leaderboard-chevron${isOpen ? ' open' : ''}`}>▼</span>
                      </td>
                    </tr>,

                    isOpen && (
                      <tr key={`picks-${name}`} className="picks-row">
                        <td colSpan={COL_COUNT + 1}>
                          <ExpandedPicks playerName={name} teamsByName={teamsByName} matches={matches} />
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
