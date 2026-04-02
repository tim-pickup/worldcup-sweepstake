import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePhase, PHASES } from '../context/PhaseContext';
import { api } from '../services/api';

function CaptainSelect({ team, captain, onSelect }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Captain for {team.flag} {team.name}
      </label>
      {team.squad && team.squad.length > 0 ? (
        <select
          value={captain || ''}
          onChange={(e) => onSelect(team.name, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Select a player —</option>
          {team.squad.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={captain || ''}
          onChange={(e) => onSelect(team.name, e.target.value)}
          placeholder="Enter player name"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

export default function GroupPreferences() {
  const { player } = useAuth();
  const { phase } = usePhase();
  const isOpen = phase === PHASES.GROUP_PREFERENCES;

  const [allocations, setAllocations] = useState(null);
  const [captains, setCaptains] = useState({});
  const [tier2Mechanism, setTier2Mechanism] = useState('scored');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getAllocations(player.pin)
      .then((data) => {
        setAllocations(data.teams || []);
        // Pre-populate from existing preferences if present
        if (data.preferences) {
          setCaptains(data.preferences.captains || {});
          setTier2Mechanism(data.preferences.tier2Mechanism || 'scored');
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [player]);

  function setCapt(teamName, playerName) {
    setCaptains((c) => ({ ...c, [teamName]: playerName }));
  }

  const tier2Team = allocations?.find((t) => t.tier === 2);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await api.submitGroupPreferences(player.pin, captains, tier2Mechanism);
      if (res.success) {
        setSubmitted(true);
      } else {
        setSubmitError(res.error || 'Submission failed. Please try again.');
      }
    } catch {
      setSubmitError('Could not connect. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!player) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-500">
        Please log in to submit your preferences.
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-400 animate-pulse">Loading your teams…</div>;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Could not load your team allocations. Please try again.
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Group Stage Preferences</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
          {phase < PHASES.GROUP_PREFERENCES
            ? 'This form will open once the team draw has been completed. Check back soon!'
            : 'The preference window has closed. Your selections are locked.'}
        </div>
        {allocations && allocations.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-base font-semibold text-gray-700">Your teams</h2>
            {allocations.map((team) => (
              <div key={team.name} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-2xl">{team.flag}</span>
                <div>
                  <div className="font-medium text-gray-900">{team.name}</div>
                  <div className="text-xs text-gray-500">Tier {team.tier} — {team.mechanism}</div>
                  {captains[team.name] && (
                    <div className="text-xs text-amber-600">⭐ Captain: {captains[team.name]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Preferences saved!</h1>
        <p className="text-gray-500 text-sm">
          Your captains and Tier 2 choice have been locked in. Good luck!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Group Stage Preferences</h1>
      <p className="text-gray-500 text-sm mb-6">
        Select a captain for each of your three teams and choose your Tier 2 mechanism. These are locked once submitted.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Captain selection for each team */}
        {allocations?.map((team) => (
          <div key={team.name} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{team.flag}</span>
              <div>
                <div className="font-semibold text-gray-900">{team.name}</div>
                <div className="text-xs text-gray-500">
                  Tier {team.tier}
                  {team.tier === 1 && ' — points for goals scored'}
                  {team.tier === 3 && ' — points for goals conceded'}
                  {team.tier === 2 && ' — your choice (see below)'}
                </div>
              </div>
            </div>
            <CaptainSelect
              team={team}
              captain={captains[team.name]}
              onSelect={setCapt}
            />
          </div>
        ))}

        {/* Tier 2 mechanism choice */}
        {tier2Team && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-amber-900">
              Tier 2 mechanism — {tier2Team.flag} {tier2Team.name}
            </h2>
            <p className="text-sm text-amber-800">
              Your Tier 2 team earns +1 for every goal scored <strong>or</strong> conceded — you decide which. This cannot be changed once submitted.
            </p>
            <div className="flex gap-4">
              {['scored', 'conceded'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tier2Mechanism"
                    value={opt}
                    checked={tier2Mechanism === opt}
                    onChange={() => setTier2Mechanism(opt)}
                    className="accent-amber-600"
                  />
                  <span className="text-sm font-medium text-amber-900 capitalize">Goals {opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {submitError}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <strong>Reminder:</strong> All selections are locked once you submit. You cannot change captains or your Tier 2 choice after the group stage begins.
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save preferences'}
        </button>
      </form>
    </div>
  );
}
