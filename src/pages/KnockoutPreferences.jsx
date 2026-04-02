import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePhase, PHASES } from '../context/PhaseContext';
import { api } from '../services/api';

const BUDGET = 1000;

export default function KnockoutPreferences() {
  const { player } = useAuth();
  const { phase, config } = usePhase();
  const budget = config?.knockoutBudget ?? BUDGET;
  const isOpen = phase === PHASES.KNOCKOUT_PREFERENCES;

  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState({}); // teamName -> true
  const [captain, setCaptain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.getKnockoutTeams()
      .then((data) => setTeams(data.teams || data || []))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const spent = teams
    .filter((t) => selected[t.name])
    .reduce((sum, t) => sum + t.price, 0);
  const remaining = budget - spent;

  function toggleTeam(team) {
    setSelected((s) => {
      const next = { ...s };
      if (next[team.name]) {
        delete next[team.name];
        // Clear captain if it was from this team
        if (team.squad?.includes(captain)) setCaptain('');
      } else {
        if (remaining >= team.price) {
          next[team.name] = true;
        }
      }
      return next;
    });
  }

  const selectedTeams = teams.filter((t) => selected[t.name]);
  const captainOptions = selectedTeams.flatMap((t) =>
    (t.squad || []).map((p) => ({ player: p, team: t.name, flag: t.flag }))
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    if (selectedTeams.length === 0) { setSubmitError('Please select at least one team.'); return; }
    if (!captain) { setSubmitError('Please nominate a captain.'); return; }

    setSubmitting(true);
    try {
      const teamsPurchased = selectedTeams.map((t) => ({ name: t.name, price: t.price }));
      const res = await api.submitKnockoutPreferences(player.pin, teamsPurchased, captain);
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
        Please log in to participate in the auction.
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400 animate-pulse">Loading knockout teams…</div>;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Could not load knockout teams. Please try again.
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Knockout Auction</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
          {phase < PHASES.KNOCKOUT_PREFERENCES
            ? 'The knockout auction is not open yet. It will open once the group stage is complete.'
            : 'The auction has closed. Your selections are locked in.'}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Picks saved!</h1>
        <p className="text-gray-500 text-sm mb-4">
          You spent <strong>{spent}</strong> coins on {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''}.
          Your captain is <strong>{captain}</strong>.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {selectedTeams.map((t) => (
            <span key={t.name} className="bg-purple-50 border border-purple-200 rounded px-3 py-1 text-sm text-purple-800">
              {t.flag} {t.name} ({t.price}🪙)
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Knockout Auction</h1>
      <p className="text-gray-500 text-sm mb-6">
        Spend your {budget} coins on as many knockout teams as you like. No one else can see your picks — it&apos;s a blind auction. Multiple players can buy the same team.
      </p>

      {/* Budget bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Budget remaining</span>
          <span className={`font-bold ${remaining < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {remaining} / {budget} 🪙
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${spent > budget ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }}
          />
        </div>
        {selectedTeams.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected — {spent} coins spent
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => {
            const isSelected = !!selected[team.name];
            const canAfford = remaining >= team.price;
            const disabled = !isSelected && !canAfford;
            return (
              <button
                key={team.name}
                type="button"
                onClick={() => toggleTeam(team)}
                disabled={disabled}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : disabled
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{team.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{team.name}</div>
                  <div className="text-xs text-gray-500">
                    {team.price} 🪙 · {team.groupPoints ?? 0} gp pts
                    {team.eliminated && <span className="ml-1 text-red-400">(eliminated)</span>}
                  </div>
                </div>
                {isSelected && <span className="text-purple-600 text-lg">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Captain selection */}
        {selectedTeams.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-amber-900">Nominate your knockout captain</h2>
            <p className="text-sm text-amber-800">
              Choose one player from any of your selected teams. They earn +3 for every goal scored (instead of +1).
            </p>
            <select
              value={captain}
              onChange={(e) => setCaptain(e.target.value)}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="">— Select your captain —</option>
              {captainOptions.map(({ player: p, team, flag }) => (
                <option key={`${team}-${p}`} value={p}>
                  {flag} {p} ({team})
                </option>
              ))}
            </select>
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {submitError}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <strong>Reminder:</strong> Your picks are locked once you submit. Unspent budget has no value.
        </div>

        <button
          type="submit"
          disabled={submitting || selectedTeams.length === 0}
          className="w-full bg-purple-600 text-white font-medium py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : `Confirm picks (${spent} coins spent)`}
        </button>
      </form>
    </div>
  );
}
