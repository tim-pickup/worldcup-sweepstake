// Google Apps Script web app URL — set this after deploying the Apps Script
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

async function get(params) {
  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function post(params, body) {
  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const api = {
  getConfig: () => get({ action: 'getConfig' }),
  getLeaderboard: () => get({ action: 'getLeaderboard' }),
  getTeams: () => get({ action: 'getTeams' }),
  getMatches: () => get({ action: 'getMatches' }),
  getAllocations: (pin) => get({ action: 'getAllocations', pin }),
  getKnockoutTeams: () => get({ action: 'getKnockoutTeams' }),

  register: (name, pin, registrationCode) =>
    post({ action: 'register' }, { name, pin, registrationCode }),

  submitGroupPreferences: (pin, captains, tier2Mechanism) =>
    post({ action: 'submitGroupPreferences' }, { pin, captains, tier2Mechanism }),

  submitKnockoutPreferences: (pin, teamsPurchased, captain) =>
    post({ action: 'submitKnockoutPreferences' }, { pin, teamsPurchased, captain }),
};
