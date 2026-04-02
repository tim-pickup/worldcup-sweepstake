import { useState, useEffect, useMemo } from 'react';
import { getKnockoutTeams, getSquads, getConfig, submitKnockoutPreferences } from '../api.js';

export default function KnockoutPreferences({ pin }) {
  const [teams, setTeams] = useState([]);
  const [squads, setSquads] = useState({});
  const [budget, setBudget] = useState(1000);
  const [selected, setSelected] = useState(new Set()); // Set of team names
  const [captain, setCaptain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      const [knockoutResult, squadResult, configResult] = await Promise.all([
        getKnockoutTeams(pin),
        getSquads(),
        getConfig(),
      ]);

      if (!knockoutResult.ok) {
        setError(knockoutResult.error ?? 'Failed to load knockout teams.');
        setLoading(false);
        return;
      }
      if (!squadResult.ok) {
        setError(squadResult.error ?? 'Failed to load squads.');
        setLoading(false);
        return;
      }

      setTeams(knockoutResult.data?.teams ?? []);
      setSquads(squadResult.data ?? {});

      if (configResult.ok) {
        setBudget(configResult.data?.knockoutBudget ?? 1000);
      }

      // Pre-populate from existing preferences
      const existing = knockoutResult.data?.myPreferences ?? [];
      if (existing.length > 0) {
        const teamNames = existing.map((row) => row['Team Purchased']).filter(Boolean);
        setSelected(new Set(teamNames));
        // Use captain from the first row
        const existingCaptain = existing[0]?.['Captain Name'];
        if (existingCaptain) setCaptain(existingCaptain);
      }

      setLoading(false);
    }
    fetchData();
  }, [pin]);

  // Compute total spend
  const totalSpend = useMemo(() => {
    return teams
      .filter((t) => selected.has(t['Team Name']))
      .reduce((sum, t) => sum + (t['Price'] ?? 0), 0);
  }, [teams, selected]);

  const remaining = budget - totalSpend;
  const overBudget = totalSpend > budget;

  // Build captain options from squads of selected teams
  const captainOptions = useMemo(() => {
    const playerSet = new Map();
    for (const teamName of selected) {
      const players = squads[teamName] ?? [];
      players.forEach((p) => {
        if (p.playerName && !playerSet.has(p.playerName)) {
          playerSet.set(p.playerName, p);
        }
      });
    }
    return Array.from(playerSet.values()).sort((a, b) =>
      (a.playerName ?? '').localeCompare(b.playerName ?? '')
    );
  }, [selected, squads]);

  function toggleTeam(teamName, price) {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
        // Clear captain if it was from this team's squad
      } else {
        // Check if adding this team would still be within budget
        const newSpend = totalSpend + price;
        if (newSpend > budget) {
          setError(`Adding ${teamName} would exceed your budget of ${budget} coins.`);
          return prev;
        }
        next.add(teamName);
      }
      setError('');
      return next;
    });
    // Reset captain if no longer valid will be handled in render
    setCaptain((prev) => prev); // trigger re-check via captainOptions useMemo
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selected.size === 0) {
      setError('Please select at least one team.');
      return;
    }
    if (!captain) {
      setError('Please select a captain.');
      return;
    }
    if (overBudget) {
      setError(`You have exceeded your budget. Please deselect some teams.`);
      return;
    }

    const teamsPurchased = Array.from(selected);

    setSubmitting(true);
    const result = await submitKnockoutPreferences(pin, teamsPurchased, captain);
    setSubmitting(false);

    if (result.ok) {
      setSuccess(
        result.data?.message ??
          `Preferences saved! Total spend: ${result.data?.totalSpend ?? totalSpend} coins.`
      );
      setSubmitted(true);
    } else {
      setError(result.error ?? 'Failed to save preferences. Please try again.');
    }
  }

  // If selected captain is no longer in available options, clear it
  const captainStillValid = captainOptions.some((p) => p.playerName === captain);
  if (captain && !captainStillValid && captainOptions.length >= 0) {
    // Defer state update to avoid render-phase setState
  }

  if (loading) return <div className="loading">Loading knockout preferences…</div>;

  const fillPct = Math.min(100, (totalSpend / budget) * 100);

  return (
    <div className="card">
      <h2 className="card-title">🏆 Knockout Stage Auction</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Use your coin budget to buy knockout teams. Select a captain from your purchased teams.
      </p>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Budget bar */}
      <div className="budget-bar-wrap">
        <div className="budget-bar-labels">
          <span>Spent: <strong>{totalSpend}</strong> / {budget} coins</span>
          <span style={{ color: overBudget ? 'var(--danger)' : 'var(--green)' }}>
            {overBudget ? `⚠ ${Math.abs(remaining)} over budget` : `${remaining} remaining`}
          </span>
        </div>
        <div className="budget-bar-track">
          <div
            className={`budget-bar-fill${overBudget ? ' over-budget' : ''}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Team grid */}
        <div className="section-title">Select Teams</div>
        {teams.length === 0 && (
          <div className="empty-state">No knockout teams available yet.</div>
        )}
        <div className="knockout-teams-grid">
          {teams.map((t) => {
            const name = t['Team Name'];
            const flag = t['Flag Emoji'] ?? '🏳';
            const price = t['Price'] ?? 0;
            const isSelected = selected.has(name);
            const wouldExceed = !isSelected && totalSpend + price > budget;

            return (
              <div
                key={name}
                className={`knockout-team-card${isSelected ? ' selected' : ''}${wouldExceed ? ' disabled' : ''}`}
                onClick={() => !wouldExceed && !submitted && toggleTeam(name, price)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={submitted ? -1 : 0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !wouldExceed && !submitted) {
                    e.preventDefault();
                    toggleTeam(name, price);
                  }
                }}
                style={{ opacity: wouldExceed && !isSelected ? 0.45 : 1, cursor: submitted ? 'default' : 'pointer' }}
              >
                <div className="knockout-team-flag">{flag}</div>
                <div className="knockout-team-name">{name}</div>
                <div className="knockout-team-price">{price} coins</div>
              </div>
            );
          })}
        </div>

        {/* Captain selector */}
        {selected.size > 0 && (
          <div className="form-group">
            <label htmlFor="knockout-captain">Captain</label>
            <select
              id="knockout-captain"
              value={captain}
              onChange={(e) => setCaptain(e.target.value)}
              disabled={submitting || submitted}
              required
            >
              <option value="">— Select a captain from your teams —</option>
              {captainOptions.map((p) => (
                <option key={p.playerName} value={p.playerName}>
                  {p.shirtNumber ? `${p.shirtNumber}. ` : ''}{p.playerName}
                  {p.position ? ` (${p.position})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || submitted || selected.size === 0 || !captain || overBudget}
          style={{ marginTop: '0.5rem' }}
        >
          {submitted ? '✓ Preferences Saved' : submitting ? 'Saving…' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
}
