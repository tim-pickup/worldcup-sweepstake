import { useState, useEffect } from 'react';
import { api } from '../services/api';

function Medal({ rank }) {
  if (rank === 1) return <span title="1st">🥇</span>;
  if (rank === 2) return <span title="2nd">🥈</span>;
  if (rank === 3) return <span title="3rd">🥉</span>;
  return <span className="text-gray-500 font-mono text-sm">{rank}</span>;
}

function PlayerCard({ entry, rank }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 text-left"
      >
        <div className="w-8 text-center flex-shrink-0">
          <Medal rank={rank} />
        </div>
        <div className="flex-1 font-medium text-gray-900">{entry.name}</div>
        <div className="flex items-center gap-6">
          {entry.groupPoints !== undefined && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500">Group</div>
              <div className="font-mono text-sm">{entry.groupPoints ?? 0}</div>
            </div>
          )}
          {entry.knockoutPoints !== undefined && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500">Knockout</div>
              <div className="font-mono text-sm">{entry.knockoutPoints ?? 0}</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs text-gray-500">Total</div>
            <div className="font-bold text-blue-700 text-lg">{entry.totalPoints ?? 0}</div>
          </div>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && entry.teams && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="grid gap-2">
            {entry.teams.map((team) => (
              <div key={team.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{team.flag}</span>
                  <span className="text-gray-800">{team.name}</span>
                  {team.tier && (
                    <span className="text-xs text-gray-400 bg-gray-200 rounded px-1">
                      Tier {team.tier}
                    </span>
                  )}
                  {team.captain && (
                    <span className="text-xs text-amber-600 bg-amber-50 rounded px-1">
                      ⭐ {team.captain}
                    </span>
                  )}
                </div>
                <span className="font-mono text-gray-700">{team.points >= 0 ? '+' : ''}{team.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getLeaderboard()
      .then(setEntries)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🏆 Leaderboard</h1>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-14 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Could not load leaderboard. Please try again later.
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">⏳</p>
          <p>Scoring hasn&apos;t started yet. Check back once the group stage begins!</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <PlayerCard key={entry.name} entry={entry} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
