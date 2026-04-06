import { useState, useEffect } from 'react';
import { getAllocations, getSquads, submitGroupPreferences } from '../api.js';
import Flag from './Flag.jsx';

export default function GroupPreferences({ player, teamsByName = {} }) {
  const { pin, name } = player;
  const [allocations, setAllocations] = useState([]);
  const [squads, setSquads] = useState({});
  const [captains, setCaptains] = useState({}); // { [teamName]: captain }
  const [tier2Mechanisms, setTier2Mechanisms] = useState({}); // { [teamName]: 'scored'|'conceded' }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      const [allocResult, squadResult] = await Promise.all([
        getAllocations(name, pin),
        getSquads(),
      ]);

      if (!allocResult.ok) {
        setError(allocResult.error ?? 'Failed to load your allocations.');
        setLoading(false);
        return;
      }
      if (!squadResult.ok) {
        setError(squadResult.error ?? 'Failed to load squads.');
        setLoading(false);
        return;
      }

      const allocs = allocResult.data?.allocations ?? [];
      // Sort by Tier ascending
      const sorted = [...allocs].sort((a, b) => (a['Tier'] ?? 99) - (b['Tier'] ?? 99));
      setAllocations(sorted);
      setSquads(squadResult.data ?? {});

      // Pre-populate from saved groupPreferences
      const saved = allocResult.data?.groupPreferences ?? [];
      if (saved.length > 0) {
        const caps = {};
        const mechs = {};
        saved.forEach((row) => {
          const team = row['Team Name'];
          if (row['Captain Name']) caps[team] = row['Captain Name'];
          if (row['Tier 2 Mechanism']) mechs[team] = row['Tier 2 Mechanism'];
        });
        setCaptains(caps);
        setTier2Mechanisms(mechs);
      }

      setLoading(false);
    }
    fetchData();
  }, [pin, name]);

  function handleCaptainChange(teamName, value) {
    setCaptains((prev) => ({ ...prev, [teamName]: value }));
  }

  function handleMechanismChange(teamName, value) {
    setTier2Mechanisms((prev) => ({ ...prev, [teamName]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate all teams have a captain
    for (const alloc of allocations) {
      const team = alloc['Team Name'];
      if (!captains[team]) {
        setError(`Please select a captain for ${team}.`);
        return;
      }
      if (Number(alloc['Tier']) === 2 && !tier2Mechanisms[team]) {
        setError(`Please select a scoring mechanism for ${team} (Tier 2).`);
        return;
      }
    }

    const captainsPayload = allocations.map((alloc) => {
      const team = alloc['Team Name'];
      const tier = Number(alloc['Tier']);
      const entry = { team, tier, captain: captains[team] };
      if (tier === 2) entry.tier2Mechanism = tier2Mechanisms[team];
      return entry;
    });

    setSubmitting(true);
    const result = await submitGroupPreferences(name, pin, captainsPayload);
    setSubmitting(false);

    if (result.ok) {
      setSuccess(result.data?.message ?? 'Preferences saved successfully!');
      setSubmitted(true);
    } else {
      setError(result.error ?? 'Failed to save preferences. Please try again.');
    }
  }

  if (loading) return <div className="loading">Loading your group preferences…</div>;

  return (
    <div className="card">
      <h2 className="card-title">⚽ Group Stage Preferences</h2>
      <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Select a captain for each of your allocated teams. Your captain's goals will earn bonus points.
      </p>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {allocations.map((alloc) => {
          const team = alloc['Team Name'];
          const tier = Number(alloc['Tier']);
          const players = squads[team] ?? [];
          const tierClass = `badge badge-tier-${tier}`;
          const isDisabled = submitting || submitted;

          return (
            <div className="team-section" key={team}>
              <div className="team-section-header">
                <span className="team-section-name">
                  <Flag value={teamsByName[team]?.['Flag Emoji']} />
                  {team}
                </span>
                <span className={tierClass}>Tier {tier}</span>
              </div>

              <div className="form-group" style={{ marginBottom: tier === 2 ? '0.75rem' : 0 }}>
                <label htmlFor={`captain-${team}`}>Captain</label>
                <select
                  id={`captain-${team}`}
                  value={captains[team] ?? ''}
                  onChange={(e) => handleCaptainChange(team, e.target.value)}
                  disabled={isDisabled}
                  required
                >
                  <option value="">— Select a player —</option>
                  {players.map((p) => (
                    <option key={p.playerName} value={p.playerName}>
                      {p.shirtNumber ? `${p.shirtNumber}. ` : ''}{p.playerName}
                      {p.position ? ` (${p.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {tier === 2 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tier 2 Scoring Mechanism</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name={`mechanism-${team}`}
                        value="scored"
                        checked={tier2Mechanisms[team] === 'scored'}
                        onChange={() => handleMechanismChange(team, 'scored')}
                        disabled={isDisabled}
                      />
                      <span>⚡ Goals Scored</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name={`mechanism-${team}`}
                        value="conceded"
                        checked={tier2Mechanisms[team] === 'conceded'}
                        onChange={() => handleMechanismChange(team, 'conceded')}
                        disabled={isDisabled}
                      />
                      <span>🛡 Goals Conceded</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {allocations.length === 0 && (
          <div className="empty-state">No teams have been allocated to you yet.</div>
        )}

        {allocations.length > 0 && (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || submitted}
            style={{ marginTop: '0.5rem' }}
          >
            {submitted ? '✓ Preferences Saved' : submitting ? 'Saving…' : 'Save Preferences'}
          </button>
        )}
      </form>
    </div>
  );
}
