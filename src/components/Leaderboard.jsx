import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard } from '../api.js';

const RANK_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await getLeaderboard();
    if (result.ok) {
      setRows(result.data ?? []);
    } else {
      setError(result.error ?? 'Failed to load leaderboard.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="card leaderboard">
      <div className="leaderboard-header">
        <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          🏆 Leaderboard
        </h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

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
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rank = row['Rank'] ?? i + 1;
                const emoji = RANK_EMOJI[rank] ?? '';
                return (
                  <tr key={`${row['Player Name']}-${i}`}>
                    <td className="leaderboard-rank">
                      {emoji || rank}
                    </td>
                    <td>{row['Player Name']}</td>
                    <td className="leaderboard-points">{row['Total Points'] ?? 0}</td>
                    <td>{row['Goal Points'] ?? 0}</td>
                    <td>{row['Captain Points'] ?? 0}</td>
                    <td>{row['Own Goal Points'] ?? 0}</td>
                    <td>{row['Card Points'] ?? 0}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {row['Last Updated'] ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
