import { useState, useEffect } from 'react';
import { api } from '../services/api';

const STAGE_LABELS = {
  group: 'Group Stage',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  final: 'Final',
};

function MatchCard({ match }) {
  const date = new Date(match.date);
  const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isComplete = match.homeScore !== null && match.homeScore !== undefined;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {STAGE_LABELS[match.stage] || match.stage}
          {match.group ? ` — Group ${match.group}` : ''}
        </span>
        <span className="text-xs text-gray-400">{dateStr} {timeStr}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-medium text-gray-900">{match.homeTeam}</span>
          <span className="text-xl">{match.homeFlag}</span>
        </div>
        <div className="text-center w-20">
          {isComplete ? (
            <span className="font-bold text-xl text-gray-900">
              {match.homeScore} — {match.awayScore}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">vs</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{match.awayFlag}</span>
          <span className="font-medium text-gray-900">{match.awayTeam}</span>
        </div>
      </div>
      {match.hadPenalties && (
        <p className="text-xs text-center text-gray-400 mt-2">
          (Penalties: {match.homePenalties} — {match.awayPenalties})
        </p>
      )}
    </div>
  );
}

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMatches()
      .then(setMatches)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // Group by date
  const byDate = matches.reduce((acc, m) => {
    const d = new Date(m.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    (acc[d] = acc[d] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">⚽ Match Results</h1>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Could not load match data. Please try again later.
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">📅</p>
          <p>No matches yet. The tournament starts on 11 June 2026.</p>
        </div>
      )}

      {!loading && !error && Object.entries(byDate).map(([date, dayMatches]) => (
        <div key={date} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{date}</h2>
          <div className="space-y-2">
            {dayMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
