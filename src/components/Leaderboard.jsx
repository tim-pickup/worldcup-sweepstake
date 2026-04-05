import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, getPlayerPicks } from '../api.js';

const RANK_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };
const TIER_LABELS = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' };

function TeamPickCard({ alloc, groupPrefs, teamsByName }) {
  const tier = alloc['Tier'] ?? alloc['tier'];
  const teamName = alloc['Team Name'];
  const pref = groupPrefs?.find(p => p['Team Name'] === teamName);
  const captain = pref?.['Captain Name'];
  const mechanism = pref?.['Tier 2 Mechanism'];

  return (
    <div className={`team-pick-card tier-${tier}`}>
      <div className="team-pick-name">
        {teamsByName?.[teamName]?.['Flag URL'] && (
          <img src={teamsByName[teamName]['Flag URL']} alt="" className="team-flag" />
        )}
        {teamName}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem' }}>
        <span className={`badge badge-tier-${tier}`}>{TIER_LABELS[tier] ?? `Tier ${tier}`}</span>
        {tier === 2 && mechanism && (
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

function ExpandedPicks({ playerName, teamsByName }) {
  const [picks, setPicks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getPlayerPicks(playerName).then(result => {
      if (cancelled) return;
      if (result.ok) {
        setPicks(result.data);
      } else {
        setError(result.error ?? 'Could not load picks.');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [playerName]);

  if (loading) return <div className="loading" style={{ padding: '1rem 0' }}>Loading picks…</div>;
  if (error)   return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{error}</div>;
  if (!picks)  return null;

  const { allocations = [], groupPreferences = [], knockoutPreferences = [] } = picks;
  const hasGroup    = allocations.length > 0;
  const hasKnockout = knockoutPreferences.length > 0;

  if (!hasGroup && !hasKnockout) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>No picks submitted yet.</div>;
  }

  // Unique captain for knockout
  const koCapt = knockoutPreferences[0]?.['Captain Name'];
  const koTotal = knockoutPreferences[0]?.['Total Spend'];

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
          <div className="picks-section-label">
            🏆 Knockout — {koTotal != null ? `${koTotal} coins spent` : ''}
            {koCapt ? ` · 👑 ${koCapt}` : ''}
          </div>
          <div className="ko-picks-grid">
            {knockoutPreferences.map(row => (
              <span key={row['Team Purchased']} className="ko-pick-chip">
                {teamsByName?.[row['Team Purchased']]?.['Flag URL'] && (
                  <img src={teamsByName[row['Team Purchased']]['Flag URL']} alt="" className="team-flag" />
                )}
                {row['Team Purchased']}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  {row['Price Paid'] != null ? ` · ${row['Price Paid']}c` : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Leaderboard({ onRowsChange, teamsByName = {} }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null); // player name string | null

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await getLeaderboard();
    if (result.ok) {
      const data = result.data ?? [];
      const sorted = [...data].sort((a, b) => (a['Rank'] ?? Infinity) - (b['Rank'] ?? Infinity));
      setRows(sorted);
      onRowsChange?.(sorted);
    } else {
      setError(result.error ?? 'Failed to load leaderboard.');
    }
    setLoading(false);
  }, [onRowsChange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleExpand(name) {
    setExpanded(prev => prev === name ? null : name);
  }

  const COL_COUNT = 8;

  return (
    <div className="card leaderboard">
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
        <div className="empty-state">No scores yet — check back soon!</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="leaderboard-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Total</th>
                <th>Goals</th>
                <th>Captain</th>
                <th>Own Goals</th>
                <th>Cards</th>
                <th style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const name   = row['Player Name'];
                const rank   = row['Rank'] ?? i + 1;
                const isOpen = expanded === name;

                return [
                  <tr
                    key={`row-${name}`}
                    className={`player-row${isOpen ? ' expanded' : ''}`}
                    onClick={() => toggleExpand(name)}
                  >
                    <td className="leaderboard-rank">
                      {RANK_EMOJI[rank] ?? rank}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{name}</td>
                    <td className="leaderboard-points">{row['Total Points'] ?? 0}</td>
                    <td>{row['Goal Points'] ?? 0}</td>
                    <td>{row['Captain Points'] ?? 0}</td>
                    <td>{row['Own Goal Points'] ?? 0}</td>
                    <td>{row['Card Points'] ?? 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`leaderboard-chevron${isOpen ? ' open' : ''}`}>▼</span>
                    </td>
                  </tr>,

                  isOpen && (
                    <tr key={`picks-${name}`} className="picks-row">
                      <td colSpan={COL_COUNT}>
                        <ExpandedPicks playerName={name} teamsByName={teamsByName} />
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
