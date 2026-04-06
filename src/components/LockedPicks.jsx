import { useState, useEffect } from 'react';
import { getAllocations, getKnockoutTeams } from '../api.js';
import Flag from './Flag.jsx';

const TIER_LABELS = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' };

const PHASE_CONTEXT = {
  group_scoring:      'Group stage is underway — your picks are locked in.',
  knockout_preferences: 'Group stage complete. Knockout auction is now open.',
  knockout_scoring:   'Knockout stage is underway — your picks are locked in.',
  complete:           'The tournament is complete. Final picks below.',
};

function TeamCard({ alloc, groupPrefs, teamsByName }) {
  const tier = alloc['Tier'];
  const teamName = alloc['Team Name'];
  const pref = groupPrefs?.find(p => p['Team Name'] === teamName);
  const captain = pref?.['Captain Name'];
  const mechanism = pref?.['Tier 2 Mechanism'];

  return (
    <div className={`team-pick-card tier-${tier}`}>
      <div className="team-pick-name">
        <Flag value={teamsByName?.[teamName]?.['Flag Emoji']} />
        {teamName}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
        <span className={`badge badge-tier-${tier}`}>{TIER_LABELS[tier] ?? `Tier ${tier}`}</span>
        {tier === 2 && mechanism && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ⚡ {mechanism === 'scored' ? 'Goals Scored' : 'Goals Conceded'}
          </span>
        )}
      </div>
      {captain
        ? <div className="team-pick-captain">👑 {captain}</div>
        : <div className="team-pick-detail" style={{ fontStyle: 'italic' }}>No captain submitted</div>
      }
    </div>
  );
}

export default function LockedPicks({ player, phase, teamsByName = {} }) {
  const [allocations, setAllocations] = useState([]);
  const [groupPrefs, setGroupPrefs] = useState([]);
  const [koPrefs, setKoPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      const [allocResult, koResult] = await Promise.all([
        getAllocations(player.name, player.pin),
        getKnockoutTeams(player.pin),
      ]);

      if (!allocResult.ok) {
        setError(allocResult.error ?? 'Failed to load your picks.');
        setLoading(false);
        return;
      }

      setAllocations(allocResult.data?.allocations ?? []);
      setGroupPrefs(allocResult.data?.groupPreferences ?? []);

      if (koResult.ok) {
        setKoPrefs(koResult.data?.myPreferences ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, [player.name, player.pin]);

  if (loading) return <div className="card"><div className="loading">Loading your picks…</div></div>;
  if (error)   return <div className="card"><div className="error">{error}</div></div>;

  const contextMsg = PHASE_CONTEXT[phase] ?? 'Your picks are now locked.';
  const sortedAllocs = allocations.slice().sort((a, b) => (a['Tier'] ?? 0) - (b['Tier'] ?? 0));
  const hasKo  = koPrefs.length > 0;
  const koCapt = koPrefs[0]?.['Captain Name'];
  const koSpend = koPrefs[0]?.['Total Spend'];

  return (
    <div>
      <div className="locked-banner">
        🔒 Picks Locked — {contextMsg}
      </div>

      {/* Group Stage */}
      <div className="card">
        <h2 className="card-title">⚽ Group Stage Picks</h2>
        {sortedAllocs.length === 0 ? (
          <div className="empty-state">No group allocations found.</div>
        ) : (
          <div className="team-picks-grid">
            {sortedAllocs.map(alloc => (
              <TeamCard
                key={alloc['Team Name']}
                alloc={alloc}
                groupPrefs={groupPrefs}
                teamsByName={teamsByName}
              />
            ))}
          </div>
        )}
        {groupPrefs.length === 0 && sortedAllocs.length > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
            No group preferences were submitted — defaults will apply.
          </p>
        )}
      </div>

      {/* Knockout Stage — only show once phase is past group_preferences */}
      {phase !== 'group_scoring' && (
        <div className="card">
          <h2 className="card-title">🏆 Knockout Picks</h2>
          {!hasKo ? (
            <div className="empty-state" style={{ fontStyle: 'italic' }}>
              {phase === 'knockout_preferences'
                ? 'You haven\'t submitted knockout picks yet — the auction is still open!'
                : 'No knockout preferences were submitted.'}
            </div>
          ) : (
            <>
              {(koCapt || koSpend != null) && (
                <div className="info-banner" style={{ marginBottom: '0.85rem' }}>
                  {koCapt && <>👑 Captain: <strong>{koCapt}</strong></>}
                  {koCapt && koSpend != null && ' · '}
                  {koSpend != null && <>💰 {koSpend} coins spent</>}
                </div>
              )}
              <div className="ko-picks-grid">
                {koPrefs.map(row => (
                  <span key={row['Team Purchased']} className="ko-pick-chip">
                    <Flag value={teamsByName[row['Team Purchased']]?.['Flag Emoji']} />
                    {row['Team Purchased']}
                    {row['Price Paid'] != null && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · {row['Price Paid']}c
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
