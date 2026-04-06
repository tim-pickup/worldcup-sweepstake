import { useState, useEffect, useMemo } from 'react';
import { getKnockoutTeams, getSquads, getConfig, submitKnockoutPreferences } from '../api.js';
import Flag from './Flag.jsx';

export default function KnockoutPreferences({ player, teamsByName = {} }) {
  const { pin, name } = player;
  const [teams, setTeams] = useState([]);
  const [knockoutPlayers, setKnockoutPlayers] = useState([]); // all players from all knockout teams
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

      const fetchedTeams = knockoutResult.data?.teams ?? [];
      setTeams(fetchedTeams);

      if (configResult.ok) {
        setBudget(configResult.data?.knockoutBudget ?? 1000);
      }

      // Build flat list of all players from knockout teams, with prices
      const knockoutTeamNames = new Set(fetchedTeams.map(t => t['Team Name']));
      const allPlayers = [];
      for (const [team, players] of Object.entries(squadResult.data ?? {})) {
        if (knockoutTeamNames.has(team)) {
          players.forEach(p => allPlayers.push({ ...p, team }));
        }
      }
      // Sort by price descending, then name ascending
      allPlayers.sort((a, b) =>
        (b.playerPrice ?? 0) - (a.playerPrice ?? 0) || (a.playerName ?? '').localeCompare(b.playerName ?? '')
      );
      setKnockoutPlayers(allPlayers);

      // Pre-populate from existing preferences
      const existing = knockoutResult.data?.myPreferences ?? [];
      if (existing.length > 0) {
        const teamNames = existing.map(row => row['Team Purchased']).filter(Boolean);
        setSelected(new Set(teamNames));
        const existingCaptain = existing[0]?.['Captain Name'];
        if (existingCaptain) setCaptain(existingCaptain);
      }

      setLoading(false);
    }
    fetchData();
  }, [pin]);

  // Captain's individual price
  const captainPrice = useMemo(() => {
    const p = knockoutPlayers.find(p => p.playerName === captain);
    return p?.playerPrice ?? 0;
  }, [captain, knockoutPlayers]);

  // Total spend = team costs + captain price
  const teamSpend = useMemo(() =>
    teams.filter(t => selected.has(t['Team Name'])).reduce((sum, t) => sum + (t['Price'] ?? 0), 0),
  [teams, selected]);

  const totalSpend = teamSpend + captainPrice;
  const remaining = budget - totalSpend;
  const overBudget = totalSpend > budget;

  function toggleTeam(teamName, price) {
    if (submitted) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
      } else {
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
      setError('You have exceeded your budget. Please deselect some teams or choose a cheaper captain.');
      return;
    }

    const teamsPurchased = Array.from(selected);

    setSubmitting(true);
    const result = await submitKnockoutPreferences(name, pin, teamsPurchased, captain);
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

  if (loading) return <div className="loading">Loading knockout preferences…</div>;

  const fillPct = Math.min(100, (totalSpend / budget) * 100);

  // Group knockoutPlayers by team for the captain <optgroup> selector
  const playersByTeam = knockoutPlayers.reduce((acc, p) => {
    (acc[p.team] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="card">
      <h2 className="card-title">🏆 Knockout Stage Auction</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Use your coin budget to buy knockout teams and select a captain from any team still in the tournament.
        Teams and captains are priced individually — both cost coins from your shared budget.
      </p>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Budget bar */}
      <div className="budget-bar-wrap">
        <div className="budget-bar-labels">
          <span>
            Spent: <strong>{totalSpend}</strong> / {budget} coins
            {(teamSpend > 0 || captainPrice > 0) && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: '0.5rem' }}>
                (teams: {teamSpend}{captainPrice > 0 ? ` + captain: ${captainPrice}` : ''})
              </span>
            )}
          </span>
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
          {teams.map(t => {
            const teamName = t['Team Name'];
            const price = t['Price'] ?? 0;
            const isSelected = selected.has(teamName);
            const wouldExceed = !isSelected && totalSpend + price > budget;

            return (
              <div
                key={teamName}
                className={`knockout-team-card${isSelected ? ' selected' : ''}${wouldExceed ? ' disabled' : ''}`}
                onClick={() => !wouldExceed && !submitted && toggleTeam(teamName, price)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={submitted ? -1 : 0}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && !wouldExceed && !submitted) {
                    e.preventDefault();
                    toggleTeam(teamName, price);
                  }
                }}
                style={{ opacity: wouldExceed && !isSelected ? 0.45 : 1, cursor: submitted ? 'default' : 'pointer' }}
              >
                <div className="knockout-team-flag">
                  <Flag value={teamsByName[teamName]?.['Flag Emoji']} style={{ width: '2em' }} />
                </div>
                <div className="knockout-team-name">{teamName}</div>
                <div className="knockout-team-price">{price} coins</div>
              </div>
            );
          })}
        </div>

        {/* Captain selector — all players from all knockout teams, grouped by team */}
        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label htmlFor="knockout-captain">
            Captain
            {captain && captainPrice > 0 && (
              <span className="captain-price-badge">{captainPrice} coins</span>
            )}
          </label>
          <select
            id="knockout-captain"
            value={captain}
            onChange={e => setCaptain(e.target.value)}
            disabled={submitting || submitted}
            required
          >
            <option value="">— Select a captain from any knockout team —</option>
            {Object.entries(playersByTeam).map(([team, players]) => (
              <optgroup key={team} label={team}>
                {players.map(p => (
                  <option key={p.playerName} value={p.playerName}>
                    {p.shirtNumber ? `${p.shirtNumber}. ` : ''}{p.playerName}
                    {p.position ? ` (${p.position})` : ''} — {p.playerPrice ?? 0} coins
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

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
