/**
 * api.js — Centralised client for the Google Apps Script API.
 *
 * All communication with the backend goes through this file.
 * The Apps Script web-app URL is read from the VITE_APPS_SCRIPT_URL
 * environment variable, which must be set before building/running.
 *
 * Every function returns a plain object:
 *   { ok: true,  data: <payload> }   — success
 *   { ok: false, error: <string>, code: <number> }  — failure
 *
 * Callers should always check `result.ok` before using `result.data`.
 *
 * Transport note: All requests use GET (including writes) to avoid the
 * CORS preflight that Apps Script cannot handle. Write payloads are
 * JSON-encoded in the `payload` query parameter.
 */

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

if (!BASE_URL) {
  console.error(
    '[api] VITE_APPS_SCRIPT_URL is not set. ' +
    'Add it to your .env file or repository secrets.'
  );
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function get(action, params = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  return response.json();
}

async function post(action, body = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('payload', JSON.stringify(body));
  const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  return response.json();
}

// ─── Public read endpoints ───────────────────────────────────────────────────

/** Phase dates, current phase name, knockout budget. */
export function getConfig() {
  return get('getConfig');
}

/** Full leaderboard — Rank, Player Name, Total Points, breakdown columns, Last Updated. */
export function getLeaderboard() {
  return get('getLeaderboard');
}

/** All 32 teams — Team Name, FIFA Ranking, Tier, Flag Emoji, Group. */
export function getTeams() {
  return get('getTeams');
}

/** Squad lists keyed by team name — [{ playerName, position, shirtNumber }]. */
export function getSquads() {
  return get('getSquads');
}

/** All match results. */
export function getMatches() {
  return get('getMatches');
}

/** All player-to-team allocations from the draw. Public — no auth required. */
export function getAllAllocations() {
  return get('getAllAllocations');
}

/**
 * Alphabetically-sorted list of registered player names.
 * Used to populate the login name picker.
 */
export function getPlayerNames() {
  return get('getPlayerNames');
}

/**
 * Public view of any player's picks — allocations, group prefs, knockout prefs.
 * Used by the leaderboard expand row. No PIN required.
 * @param {string} playerName
 */
export function getPlayerPicks(playerName) {
  return get('getPlayerPicks', { playerName });
}

// ─── PIN-gated read endpoints ────────────────────────────────────────────────

/**
 * Returns the authenticated player's allocations + saved group preferences.
 * Authentication is name + PIN — both must match the same player row.
 * @param {string} name
 * @param {string} pin
 */
export function getAllocations(name, pin) {
  return get('getAllocations', { name, pin });
}

/**
 * Returns the 16 knockout teams with prices.
 * If a PIN is supplied, also returns the player's existing knockout picks.
 * @param {string} [pin]
 */
export function getKnockoutTeams(pin = '') {
  return get('getKnockoutTeams', { pin });
}

// ─── Write endpoints ─────────────────────────────────────────────────────────

/**
 * Registers a new player.
 * @param {string} name
 * @param {string} pin  4–8 characters
 * @param {string} registrationCode
 */
export function register(name, pin, registrationCode) {
  return post('register', { name, pin, registrationCode });
}

/**
 * Saves group stage captain selections and Tier 2 mechanism choice.
 * @param {string} pin
 * @param {Array<{ team: string, tier: number, captain: string, tier2Mechanism?: "scored"|"conceded" }>} captains
 */
export function submitGroupPreferences(name, pin, captains) {
  return post('submitGroupPreferences', { name, pin, captains });
}

/**
 * Saves knockout stage team purchases and captain selection.
 * @param {string}   pin
 * @param {string[]} teamsPurchased  Array of team names
 * @param {string}   captain         Must be in one of the purchased teams' squads
 */
export function submitKnockoutPreferences(name, pin, teamsPurchased, captain) {
  return post('submitKnockoutPreferences', { name, pin, teamsPurchased, captain });
}
