import { useState, useEffect } from 'react';
import { getMatches } from '../api.js';
import Flag from './Flag.jsx';

export default function MatchResults({ teamsByName = {} }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const result = await getMatches();
      if (result.ok) {
        const all = result.data ?? [];
        // Sort by Date descending and take last 10
        const sorted = [...all].sort((a, b) => {
          const da = new Date(a['Date'] ?? 0);
          const db = new Date(b['Date'] ?? 0);
          return db - da;
        });
        setMatches(sorted.slice(0, 10));
      } else {
        setError(result.error ?? 'Failed to load matches.');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading match results…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <h2 className="card-title">⚽ Recent Results</h2>

      {matches.length === 0 && (
        <div className="empty-state">No matches yet — check back once the tournament starts!</div>
      )}

      <div className="match-grid">
        {matches.map((m) => {
          const matchId = m['Match ID'];
          const homeScore = m['Home Score'] ?? '';
          const awayScore = m['Away Score'] ?? '';
          const hasScore = homeScore !== '' && homeScore !== null && awayScore !== '' && awayScore !== null;
          const dateStr = m['Date']
            ? new Date(m['Date']).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })
            : '—';

          const homeWon = hasScore && Number(homeScore) > Number(awayScore);
          const awayWon = hasScore && Number(awayScore) > Number(homeScore);

          return (
            <div className="match-card" key={matchId}>
              <div className="match-card-header">
                <span className="badge badge-stage">{m['Stage'] ?? 'Match'}</span>
                {m['Group'] && (
                  <span className="badge badge-group">{m['Group']}</span>
                )}
                <span className="match-card-date">{dateStr}</span>
              </div>
              <div className="match-card-teams">
                <span className={`match-card-team home${homeWon ? ' winner' : ''}`}>
                  <Flag value={teamsByName[m['Home Team']]?.['Flag Emoji']} />
                  {m['Home Team']}
                </span>
                <span className={`match-card-score${hasScore ? ' has-score' : ''}`}>
                  {hasScore ? `${homeScore} – ${awayScore}` : 'vs'}
                </span>
                <span className={`match-card-team away${awayWon ? ' winner' : ''}`}>
                  <Flag value={teamsByName[m['Away Team']]?.['Flag Emoji']} />
                  {m['Away Team']}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
