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
 */

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

if (!BASE_URL) {
  console.error(
    '[api] VITE_APPS_SCRIPT_URL is not set. ' +
    'Add it to your .env file or repository secrets.'
  );
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * GET request — appends `params` as query string values.
 */
async function get(action, params = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow', // required for Apps Script web-app deployments
  });

  return response.json();
}

/**
 * POST request — sends `body` as JSON in the request body.
 * The `action` is also added as a URL query parameter so Apps Script
 * can read it from e.parameter before parsing the body.
 */
async function post(action, body = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'POST',
    redirect: 'follow',
    // 'text/plain' avoids the CORS preflight that Apps Script cannot handle.
    // The body is still valid JSON; Apps Script reads it via e.postData.contents.
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  });

  return response.json();
}

// ─── Public endpoints ────────────────────────────────────────────────────────

/**
 * Returns phase dates, current phase name, and knockout budget.
 *
 * Response data: {
 *   currentPhase: string,
 *   registrationClose: string,
 *   groupPrefsOpen: string, groupPrefsClose: string,
 *   groupScoringOpen: string, groupScoringClose: string,
 *   knockoutPrefsOpen: string, knockoutPrefsClose: string,
 *   knockoutScoringOpen: string, knockoutScoringClose: string,
 *   knockoutBudget: number
 * }
 */
export function getConfig() {
  return get('getConfig');
}

/**
 * Returns the full leaderboard.
 *
 * Response data: Array of {
 *   Rank, "Player Name", "Total Points",
 *   "Goal Points", "Captain Points", "Own Goal Points",
 *   "Card Points", "Last Updated"
 * }
 */
export function getLeaderboard() {
  return get('getLeaderboard');
}

/**
 * Returns all 32 teams with tier, FIFA ranking, flag emoji, and group.
 *
 * Response data: Array of {
 *   "Team Name", "FIFA Ranking", Tier, "Flag Emoji", Group
 * }
 */
export function getTeams() {
  return get('getTeams');
}

/**
 * Returns squad lists for all teams.
 *
 * Response data: {
 *   "France": [{ playerName, position, shirtNumber }, ...],
 *   "Brazil":  [...],
 *   ...
 * }
 */
export function getSquads() {
  return get('getSquads');
}

/**
 * Returns all match results.
 *
 * Response data: Array of {
 *   "Match ID", Date, Stage, Group,
 *   "Home Team", "Away Team", "Home Score", "Away Score"
 * }
 */
export function getMatches() {
  return get('getMatches');
}

// ─── PIN-gated endpoints ─────────────────────────────────────────────────────

/**
 * Returns the authenticated player's allocated teams plus any saved
 * group preferences.
 *
 * @param {string} pin
 * Response data: {
 *   player: { "Player ID", Name },
 *   allocations: Array of { "Player ID", "Player Name", "Team Name", Tier },
 *   groupPreferences: Array of {
 *     "Player ID", "Player Name", "Team Name", Tier,
 *     "Captain Name", "Tier 2 Mechanism"
 *   }
 * }
 */
export function getAllocations(pin) {
  return get('getAllocations', { pin });
}

/**
 * Returns the 16 knockout teams with prices.
 * If a PIN is supplied, also returns the player's existing knockout picks.
 *
 * @param {string} [pin]
 * Response data: {
 *   teams: Array of { "Team Name", "Flag Emoji", Price },
 *   myPreferences: Array of {
 *     "Player ID", "Player Name", "Team Purchased",
 *     "Price Paid", "Captain Name", "Total Spend"
 *   } | null
 * }
 */
export function getKnockoutTeams(pin = '') {
  return get('getKnockoutTeams', { pin });
}

// ─── Write endpoints ─────────────────────────────────────────────────────────

/**
 * Registers a new player.
 *
 * @param {string} name
 * @param {string} pin           4–8 characters
 * @param {string} registrationCode
 * Response data: { playerID, name, message }
 */
export function register(name, pin, registrationCode) {
  return post('register', { name, pin, registrationCode });
}

/**
 * Saves group stage captain selections and Tier 2 mechanism choice.
 *
 * @param {string} pin
 * @param {Array<{ team: string, tier: number, captain: string, tier2Mechanism?: "scored"|"conceded" }>} captains
 *   One entry per allocated team. tier2Mechanism is required on the Tier 2 entry.
 *
 * Response data: { message }
 */
export function submitGroupPreferences(pin, captains) {
  return post('submitGroupPreferences', { pin, captains });
}

/**
 * Saves knockout stage team purchases and captain selection.
 *
 * @param {string}   pin
 * @param {string[]} teamsPurchased  Array of team names
 * @param {string}   captain         Must be in one of the purchased teams' squads
 *
 * Response data: { message, totalSpend, remainingBudget }
 */
export function submitKnockoutPreferences(pin, teamsPurchased, captain) {
  return post('submitKnockoutPreferences', { pin, teamsPurchased, captain });
}
