import { useState, useEffect, useRef } from 'react';
import { getMatches, getAllAllocations, getAllKnockoutAllocations, getPlayerPicks } from '../api.js';
import Flag from './Flag.jsx';

const PAGE_SIZE = 6;

function MatchPlayersPanel({ matchId, involvedPlayers, teamsByName, playerPicksCache, loadingPlayers }) {
  if (involvedPlayers.length === 0) {
    return (
      <div className="match-players-panel">
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No sweepstake players had teams in this match.
        </div>
      </div>
    );
  }

  const rows = involvedPlayers.map(({ playerName, teams }) => {
    const picks = playerPicksCache[playerName];
    const isLoading = loadingPlayers[playerName];
    const pts = picks
      ? (picks.pointsActivity ?? [])
          .filter(e => String(e['Match ID']) === String(matchId))
          .reduce((sum, e) => sum + (Number(e['Points']) || 0), 0)
      : null;

    return { playerName, teams, pts, isLoading };
  });

  const sorted = [...rows].sort((a, b) => {
    if (a.pts === null && b.pts === null) return a.playerName.localeCompare(b.playerName);
    if (a.pts === null) return 1;
    if (b.pts === null) return -1;
    return b.pts - a.pts || a.playerName.localeCompare(b.playerName);
  });

  return (
    <div className="match-players-panel">
      {sorted.map(({ playerName, teams, pts, isLoading }) => (
        <div className="match-player-row" key={playerName}>
          <span className="match-player-name">{playerName}</span>
          <span className="match-player-team" title={teams.join(', ')}>
            {teams.map((t, i) => (
              <span key={t}>
                {i > 0 && ' '}
                <Flag value={teamsByName[t]?.['Flag Emoji']} style={{ marginRight: 0 }} />
              </span>
            ))}
          </span>
          <span className={`match-player-pts${pts === 0 ? ' zero' : ''}`}>
            {isLoading ? '…' : pts === null ? '…' : `${pts > 0 ? '+' : ''}${pts} pts`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MatchResults({ teamsByName = {} }) {
  const [allMatches, setAllMatches]       = useState([]);
  const [allAllocations, setAllAllocations] = useState([]);
  const [allKnockoutAllocations, setAllKnockoutAllocations] = useState([]);
  const [visibleCount, setVisibleCount]   = useState(PAGE_SIZE);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [playerPicksCache, setPlayerPicksCache] = useState({});
  const [loadingPlayers, setLoadingPlayers]     = useState({});

  const fetchingRef = useRef(new Set());

  useEffect(() => {
    async function fetchData() {
      const [matchResult, allocResult, knockoutAllocResult] = await Promise.all([
        getMatches(),
        getAllAllocations(),
        getAllKnockoutAllocations(),
      ]);
      if (matchResult.ok) {
        const sorted = [...(matchResult.data ?? [])].sort((a, b) => {
          return new Date(b['Date'] ?? 0) - new Date(a['Date'] ?? 0);
        });
        setAllMatches(sorted);
      } else {
        setError(matchResult.error ?? 'Failed to load matches.');
      }
      if (allocResult.ok) {
        setAllAllocations(allocResult.data ?? []);
      }
      if (knockoutAllocResult.ok) {
        setAllKnockoutAllocations(knockoutAllocResult.data ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  function getInvolvedPlayers(match) {
    // Group Stage picks and Knockout Stage picks can send different teams to the
    // same player, so pick the allocation set that matches the match's stage.
    const allocations = match['Stage'] === 'Group Stage' ? allAllocations : allKnockoutAllocations;
    const matchTeams = new Set([match['Home Team'], match['Away Team']]);
    const byPlayer = {};
    for (const alloc of allocations) {
      const name = alloc['Player Name'];
      const team = alloc['Team Name'];
      if (matchTeams.has(team)) {
        (byPlayer[name] ??= []).push(team);
      }
    }
    return Object.entries(byPlayer).map(([playerName, teams]) => ({ playerName, teams }));
  }

  function fetchPicksForPlayers(involvedPlayers) {
    for (const { playerName } of involvedPlayers) {
      if (playerPicksCache[playerName] || fetchingRef.current.has(playerName)) continue;
      fetchingRef.current.add(playerName);
      setLoadingPlayers(prev => ({ ...prev, [playerName]: true }));
      getPlayerPicks(playerName).then(result => {
        fetchingRef.current.delete(playerName);
        setLoadingPlayers(prev => { const n = { ...prev }; delete n[playerName]; return n; });
        if (result.ok) {
          setPlayerPicksCache(prev => ({ ...prev, [playerName]: result.data }));
        }
      });
    }
  }

  function handleMatchClick(match, hasScore) {
    if (!hasScore) return;
    const matchId = match['Match ID'];
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      return;
    }
    setExpandedMatchId(matchId);
    fetchPicksForPlayers(getInvolvedPlayers(match));
  }

  if (loading) return <div className="loading">Loading match results…</div>;
  if (error)   return <div className="error">{error}</div>;

  const visibleMatches = allMatches.slice(0, visibleCount);

  return (
    <div className="card">
      <h2 className="card-title">⚽ Recent Results</h2>

      {allMatches.length === 0 && (
        <div className="empty-state">No matches yet — check back once the tournament starts!</div>
      )}

      <div className="match-grid">
        {visibleMatches.map((m) => {
          const matchId   = m['Match ID'];
          const homeScore = m['Home Score'] ?? '';
          const awayScore = m['Away Score'] ?? '';
          const hasScore  = homeScore !== '' && homeScore !== null && awayScore !== '' && awayScore !== null;
          const isExpanded = expandedMatchId === matchId;
          const dateStr = m['Date']
            ? new Date(m['Date']).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })
            : '—';

          const homeWon = hasScore && Number(homeScore) > Number(awayScore);
          const awayWon = hasScore && Number(awayScore) > Number(homeScore);

          const involvedPlayers = isExpanded ? getInvolvedPlayers(m) : [];

          return (
            <div
              className={`match-card${hasScore ? ' clickable' : ''}${isExpanded ? ' match-expanded' : ''}`}
              key={matchId}
              onClick={() => handleMatchClick(m, hasScore)}
            >
              <div className="match-card-header">
                <div className="match-card-header-top">
                  <span className="badge badge-stage">{m['Stage'] ?? 'Match'}</span>
                  {m['Group'] && (
                    <span className="badge badge-group">{m['Group']}</span>
                  )}
                  {hasScore && (
                    <span className="match-card-chevron">{isExpanded ? '▲' : '▼'}</span>
                  )}
                </div>
                <span className="match-card-date">{dateStr}</span>
              </div>
              <div className="match-card-teams">
                <span
                  className={`match-card-team home${homeWon ? ' winner' : awayWon ? ' loser' : ''}`}
                  title={m['Home Team']}
                >
                  <Flag value={teamsByName[m['Home Team']]?.['Flag Emoji']} style={{ fontSize: '1.6rem', marginRight: 0 }} />
                </span>
                <span className={`match-card-score${hasScore ? ' has-score' : ''}`}>
                  {hasScore ? `${homeScore} – ${awayScore}` : 'vs'}
                </span>
                <span
                  className={`match-card-team away${awayWon ? ' winner' : homeWon ? ' loser' : ''}`}
                  title={m['Away Team']}
                >
                  <Flag value={teamsByName[m['Away Team']]?.['Flag Emoji']} style={{ fontSize: '1.6rem', marginRight: 0 }} />
                </span>
              </div>

              {isExpanded && (
                <MatchPlayersPanel
                  matchId={matchId}
                  involvedPlayers={involvedPlayers}
                  teamsByName={teamsByName}
                  playerPicksCache={playerPicksCache}
                  loadingPlayers={loadingPlayers}
                />
              )}
            </div>
          );
        })}
      </div>

      {visibleCount < allMatches.length && (
        <button
          className="load-more-btn"
          onClick={(e) => { e.stopPropagation(); setVisibleCount(v => v + PAGE_SIZE); }}
        >
          Load more ({allMatches.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
