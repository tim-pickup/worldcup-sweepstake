/**
 * Code.gs — World Cup 2026 Sweepstake API
 *
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 *
 * ── Google Sheet tab structure (matches worldcup_sweepstake_datastructure.xlsx) ─
 *
 * Config            │ Setting              │ Value    │ Notes
 *                   ├──────────────────────┼──────────┤
 *                   │ RegistrationCode     │ ...      │
 *                   │ RegistrationClose    │ ISO date │
 *                   │ GroupDrawDate        │ ISO date │ Live draw event date/time
 *                   │ GroupPrefsOpen       │ ISO date │
 *                   │ GroupPrefsClose      │ ISO date │
 *                   │ GroupScoringOpen     │ ISO date │
 *                   │ GroupScoringClose    │ ISO date │
 *                   │ KnockoutPrefsOpen    │ ISO date │
 *                   │ KnockoutPrefsClose   │ ISO date │
 *                   │ KnockoutScoringOpen  │ ISO date │
 *                   │ KnockoutScoringClose │ ISO date │
 *                   │ KnockoutBudget       │ 1000     │
 *
 * Teams             │ Team Name │ FIFA Ranking │ Tier │ Flag Emoji │ Group
 *
 * Squads            │ Team Name │ Player Name │ Position │ Shirt Number │ PlayerPrice
 *
 * Players           │ Player ID │ Name │ PIN │ Registered At
 *
 * Allocations       │ Player ID │ Player Name │ Team Name │ Tier
 *
 * GroupPreferences  │ Player ID │ Player Name │ Team Name │ Tier │ Captain Name │ Tier 2 Mechanism
 *                   One row per allocated team per player (up to 3 rows per player).
 *                   "Tier 2 Mechanism" is "scored" or "conceded"; blank for tiers 1 & 3.
 *
 * KnockoutTeams     │ Team Name │ Flag Emoji │ Price
 *
 * KnockoutPreferences │ Player ID │ Player Name │ Team Purchased │ Price Paid │ Captain Name │ Captain Price Paid │ Total Spend
 *                     One row per team purchased per player.
 *                     Captain Name, Captain Price Paid and Total Spend are repeated on every row for the player.
 *
 * Matches           │ Match ID │ Date │ Stage │ Group │ Home Team │ Away Team │ Home Score │ Away Score
 *                   Stage values: "Group Stage" │ "Round of 16" │ "Quarterfinal" │ "Semifinal" │ "Final"
 *                   Group values: "Group A" … "Group L" (group stage only; blank for knockout rounds)
 *
 * MatchEvents       │ Match ID │ Event Type │ Team │ Player Name │ Minute │ Benefiting Team
 *
 * Leaderboard       │ Rank │ Player ID │ Player Name │ Total Points │ Goal Points │ Captain Points │ Own Goal Points │ Card Points
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─── Response Helpers ────────────────────────────────────────────────────────

function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function ok(data) {
  return jsonResponse({ ok: true, data: data });
}

function fail(message, code) {
  return jsonResponse({ ok: false, error: message, code: code || 400 });
}

// ─── Sheet Helpers ───────────────────────────────────────────────────────────

function getSheet(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" not found');
  return sheet;
}

/** Returns all data rows as an array of objects keyed by the header row. */
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// ─── Config Helpers ──────────────────────────────────────────────────────────

/**
 * Reads the Config tab into a plain object.
 * Expects columns: Key | Value
 * The "Key" column is used as the key.
 */
function readConfig() {
  var sheet = getSheet('Config');
  var data = sheet.getDataRange().getValues();
  var config = {};
  // Row 0 is the header; column 0 = Setting, column 1 = Value
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (key) config[key] = data[i][1];
  }
  return config;
}

/** Returns a string identifying the currently active phase. */
function getCurrentPhase(config) {
  var now = new Date();
  function d(key) { return config[key] ? new Date(config[key]) : null; }

  var regClose       = d('RegistrationClose');
  var gpOpen         = d('GroupPrefsOpen');
  var gpClose        = d('GroupPrefsClose');
  var gsOpen         = d('GroupScoringOpen');
  var gsClose        = d('GroupScoringClose');
  var koPrefsOpen    = d('KnockoutPrefsOpen');
  var koPrefsClose   = d('KnockoutPrefsClose');
  var koScoringOpen  = d('KnockoutScoringOpen');
  var koScoringClose = d('KnockoutScoringClose');

  if (regClose && now <= regClose) return 'registration';
  if (gpOpen && gpClose && now >= gpOpen && now <= gpClose) return 'group_preferences';
  if (gsOpen && gsClose && now >= gsOpen && now <= gsClose) return 'group_scoring';
  if (koPrefsOpen && koPrefsClose && now >= koPrefsOpen && now <= koPrefsClose) return 'knockout_preferences';
  if (koScoringOpen && koScoringClose && now >= koScoringOpen && now <= koScoringClose) return 'knockout_scoring';
  if (koScoringClose && now > koScoringClose) return 'complete';
  return 'between_phases';
}

/** Returns true when the given named phase window is currently open. */
function isPhaseOpen(phase, config) {
  var now = new Date();
  function d(key) { return config[key] ? new Date(config[key]) : null; }

  switch (phase) {
    case 'registration': {
      var rc = d('RegistrationClose');
      return !!(rc && now <= rc);
    }
    case 'group_preferences': {
      var o = d('GroupPrefsOpen'), c = d('GroupPrefsClose');
      return !!(o && c && now >= o && now <= c);
    }
    case 'knockout_preferences': {
      var ko = d('KnockoutPrefsOpen'), kc = d('KnockoutPrefsClose');
      return !!(ko && kc && now >= ko && now <= kc);
    }
    default:
      return false;
  }
}

// ─── Player Helpers ──────────────────────────────────────────────────────────

/**
 * Finds a player by PIN. Returns the player object (with _row) or null.
 * Players tab columns: Player ID | Name | PIN | Registered At
 */
function findPlayerByPin(pin) {
  var sheet = getSheet('Players');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var pinCol = headers.indexOf('PIN');
  if (pinCol === -1) return null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][pinCol]) === String(pin)) {
      var player = {};
      headers.forEach(function (h, j) { player[h] = data[i][j]; });
      player._row = i + 1; // 1-indexed sheet row
      return player;
    }
  }
  return null;
}

/** Finds a player by name (case-insensitive). Returns the player object or null. */
function findPlayerByName(name) {
  var sheet = getSheet('Players');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var nameCol = headers.indexOf('Name');
  if (nameCol === -1) return null;
  var needle = name.toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][nameCol]).toLowerCase() === needle) {
      var player = {};
      headers.forEach(function (h, j) { player[h] = data[i][j]; });
      return player;
    }
  }
  return null;
}

// ─── Multi-row Delete Helper ─────────────────────────────────────────────────

/**
 * Deletes all rows in a sheet where the given column matches playerId.
 * Iterates bottom-to-top to avoid row-index shifting.
 */
function deleteRowsForPlayer(sheet, playerIdColName, playerId) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  var col = data[0].indexOf(playerIdColName);
  if (col === -1) return;
  for (var r = data.length - 1; r >= 1; r--) {
    if (String(data[r][col]) === String(playerId)) {
      sheet.deleteRow(r + 1); // convert 0-indexed to 1-indexed sheet row
    }
  }
}

// ─── GET Handlers ────────────────────────────────────────────────────────────

function handleGetConfig() {
  var config = readConfig();
  return ok({
    registrationClose:    config['RegistrationClose']    || null,
    groupDrawDate:        config['GroupDrawDate']        || null,
    groupPrefsOpen:       config['GroupPrefsOpen']       || null,
    groupPrefsClose:      config['GroupPrefsClose']      || null,
    groupScoringOpen:     config['GroupScoringOpen']     || null,
    groupScoringClose:    config['GroupScoringClose']    || null,
    knockoutPrefsOpen:    config['KnockoutPrefsOpen']    || null,
    knockoutPrefsClose:   config['KnockoutPrefsClose']   || null,
    knockoutScoringOpen:  config['KnockoutScoringOpen']  || null,
    knockoutScoringClose: config['KnockoutScoringClose'] || null,
    knockoutBudget:       Number(config['KnockoutBudget']) || 1000,
    currentPhase:         getCurrentPhase(config)
  });
}

function handleGetLeaderboard() {
  // Columns: Rank | Player Name | Total Points | Goal Points | Captain Points | Own Goal Points | Card Points | Last Updated
  return ok(sheetToObjects(getSheet('Leaderboard')));
}

function handleGetTeams() {
  // Columns: Team Name | FIFA Ranking | Tier | Flag Emoji | Group
  return ok(sheetToObjects(getSheet('Teams')));
}

/**
 * Returns squad lists from the dedicated Squads tab.
 * Response: { "France": [{ playerName, position, shirtNumber }, ...], ... }
 */
function handleGetSquads() {
  var sheet = getSheet('Squads');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return ok({});

  var headers    = data[0];
  var teamCol    = headers.indexOf('Team Name');
  var playerCol  = headers.indexOf('Player Name');
  var posCol     = headers.indexOf('Position');
  var shirtCol   = headers.indexOf('Shirt Number');
  var priceCol   = headers.indexOf('PlayerPrice');

  if (teamCol === -1)   return fail('Squads sheet is missing a "Team Name" column');
  if (playerCol === -1) return fail('Squads sheet is missing a "Player Name" column');

  var result = {};
  for (var i = 1; i < data.length; i++) {
    var team = String(data[i][teamCol]);
    if (!team) continue;
    if (!result[team]) result[team] = [];
    result[team].push({
      playerName:  data[i][playerCol],
      position:    posCol   !== -1 ? data[i][posCol]   : '',
      shirtNumber: shirtCol !== -1 ? data[i][shirtCol] : '',
      playerPrice: priceCol !== -1 ? (Number(data[i][priceCol]) || 0) : 0
    });
  }
  return ok(result);
}

function handleGetMatches() {
  // Columns: Match ID | Date | Stage | Group | Home Team | Away Team | Home Score | Away Score
  return ok(sheetToObjects(getSheet('Matches')));
}

/**
 * Returns all rows from the Allocations sheet.
 * Public — no auth required. Used for the post-draw allocations table.
 * Allocations columns: Player ID | Player Name | Team Name | Tier
 */
function handleGetAllAllocations() {
  return ok(sheetToObjects(getSheet('Allocations')));
}

/**
 * Returns an alphabetically-sorted list of registered player names.
 * Public — no PIN required. Used to populate the login name picker.
 */
function handleGetPlayerNames() {
  var sheet = getSheet('Players');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return ok([]);
  var headers = data[0];
  var nameCol = headers.indexOf('Name');
  if (nameCol === -1) return fail('Players sheet is missing a "Name" column');
  var names = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][nameCol]) names.push(String(data[i][nameCol]));
  }
  names.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
  return ok(names);
}

/**
 * Returns a player's allocations, group preferences, and knockout preferences.
 * Public — no PIN required. Used by the leaderboard detail view.
 */
function handleGetPlayerPicks(playerName) {
  if (!playerName) return fail('playerName is required');
  var player = findPlayerByName(playerName);
  if (!player) return fail('Player not found', 404);
  var playerId = player['Player ID'];

  var allocSheet = getSheet('Allocations');
  var allocData  = allocSheet.getDataRange().getValues();
  var allocs = [];
  if (allocData.length >= 2) {
    var aHeaders = allocData[0];
    var aPidCol  = aHeaders.indexOf('Player ID');
    for (var i = 1; i < allocData.length; i++) {
      if (String(allocData[i][aPidCol]) === String(playerId)) {
        var aRow = {};
        aHeaders.forEach(function (h, j) { aRow[h] = allocData[i][j]; });
        allocs.push(aRow);
      }
    }
  }

  return ok({
    player:               { 'Player ID': playerId, Name: player['Name'] },
    allocations:          allocs,
    groupPreferences:     getGroupPrefsForPlayer(playerId),
    knockoutPreferences:  getKnockoutPrefsForPlayer(playerId)
  });
}

/**
 * Returns the requesting player's allocations plus any saved group preferences.
 * Requires both name AND pin — validates they match the same player row.
 * Allocations columns: Player ID | Player Name | Team Name | Tier
 */
function handleGetAllocations(name, pin) {
  if (!name) return fail('Name is required', 400);
  if (!pin)  return fail('PIN is required', 400);
  var player = findPlayerByName(name);
  if (!player || String(player['PIN']) !== String(pin)) {
    return fail('Invalid name or PIN', 401);
  }

  var playerId  = player['Player ID'];
  var allocSheet = getSheet('Allocations');
  var allocData  = allocSheet.getDataRange().getValues();
  var allocs = [];

  if (allocData.length >= 2) {
    var headers = allocData[0];
    var pidCol  = headers.indexOf('Player ID');
    for (var i = 1; i < allocData.length; i++) {
      if (String(allocData[i][pidCol]) === String(playerId)) {
        var row = {};
        headers.forEach(function (h, j) { row[h] = allocData[i][j]; });
        allocs.push(row);
      }
    }
  }

  return ok({
    player:           { 'Player ID': playerId, Name: player['Name'] },
    allocations:      allocs,
    groupPreferences: getGroupPrefsForPlayer(playerId)
  });
}

/**
 * Returns available knockout teams with prices, and optionally the player's existing picks.
 * KnockoutTeams columns: Team Name | Flag Emoji | Price
 */
function handleGetKnockoutTeams(pin) {
  var teams = sheetToObjects(getSheet('KnockoutTeams'));

  var myPreferences = null;
  if (pin) {
    var player = findPlayerByPin(pin);
    if (player) {
      myPreferences = getKnockoutPrefsForPlayer(player['Player ID']);
    }
  }

  return ok({ teams: teams, myPreferences: myPreferences });
}

// ─── Preference Lookup Helpers ───────────────────────────────────────────────

/**
 * Returns all GroupPreferences rows for a player as an array.
 * Each row: { Player ID, Player Name, Team Name, Tier, Captain Name, Tier 2 Mechanism }
 */
function getGroupPrefsForPlayer(playerId) {
  var sheet = getSheet('GroupPreferences');
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var pidCol  = headers.indexOf('Player ID');
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][pidCol]) === String(playerId)) {
      var row = {};
      headers.forEach(function (h, j) { row[h] = data[i][j]; });
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Returns all KnockoutPreferences rows for a player as an array.
 * Each row: { Player ID, Player Name, Team Purchased, Price Paid, Captain Name, Captain Price Paid, Total Spend }
 */
function getKnockoutPrefsForPlayer(playerId) {
  var sheet = getSheet('KnockoutPreferences');
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var pidCol  = headers.indexOf('Player ID');
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][pidCol]) === String(playerId)) {
      var row = {};
      headers.forEach(function (h, j) { row[h] = data[i][j]; });
      rows.push(row);
    }
  }
  return rows;
}

// ─── POST Handlers ───────────────────────────────────────────────────────────

/**
 * POST register
 * Body: { name, pin, registrationCode }
 * Writes one row to Players: Player ID | Name | PIN | Registered At
 */
function handleRegister(body) {
  var name = body.name             ? String(body.name).trim()             : '';
  var pin  = body.pin              ? String(body.pin).trim()              : '';
  var code = body.registrationCode ? String(body.registrationCode).trim() : '';

  if (!name) return fail('Name is required');
  if (!pin)  return fail('PIN is required');
  if (!code) return fail('Registration code is required');
  if (pin.length < 4 || pin.length > 8) return fail('PIN must be between 4 and 8 characters');

  var config = readConfig();

  if (!isPhaseOpen('registration', config)) {
    return fail('Registration is currently closed', 403);
  }

  var storedCode = String(config['RegistrationCode'] || '');
  if (storedCode.toLowerCase() !== code.toLowerCase()) {
    return fail('Invalid registration code', 403);
  }

  if (findPlayerByName(name)) {
    return fail('That name is already registered. Please choose a different name.', 409);
  }

  var sheet   = getSheet('Players');
  var lastRow = sheet.getLastRow();

  if (lastRow === 0) {
    sheet.appendRow(['Player ID', 'Name', 'PIN', 'Registered At']);
    lastRow = 1;
  }

  var playerId     = 'P' + String(Date.now()).slice(-6) + String(lastRow);
  var registeredAt = new Date().toISOString();

  sheet.appendRow([playerId, name, pin, registeredAt]);

  return ok({ playerID: playerId, name: name, message: 'Registration successful' });
}

/**
 * POST submitGroupPreferences
 *
 * Body: {
 *   pin: "1234",
 *   captains: [
 *     { team: "France",   tier: 1, captain: "Mbappe"   },
 *     { team: "Brazil",   tier: 2, captain: "Vinicius", tier2Mechanism: "scored" },
 *     { team: "Iran",     tier: 3, captain: "Taremi"   }
 *   ]
 * }
 *
 * Writes one row per entry to GroupPreferences:
 *   Player ID | Player Name | Team Name | Tier | Captain Name | Tier 2 Mechanism
 *
 * Re-submissions overwrite all previous rows for this player.
 */
function handleSubmitGroupPreferences(body) {
  var name     = body.name     ? String(body.name).trim()     : '';
  var pin      = body.pin      ? String(body.pin).trim()      : '';
  var captains = body.captains;

  if (!name) return fail('Name is required', 400);
  if (!pin)  return fail('PIN is required', 400);

  var player = findPlayerByName(name);
  if (!player || String(player['PIN']) !== String(pin)) return fail('Invalid name or PIN', 401);

  var config = readConfig();
  if (!isPhaseOpen('group_preferences', config)) {
    return fail('Group stage preferences are currently closed', 403);
  }

  if (!Array.isArray(captains) || captains.length === 0) {
    return fail('captains must be a non-empty array');
  }

  for (var i = 0; i < captains.length; i++) {
    var entry = captains[i];
    if (!entry.team)    return fail('Each captain entry must include a "team" field');
    if (!entry.captain) return fail('Each captain entry must include a "captain" field');
    if (!entry.tier)    return fail('Each captain entry must include a "tier" field (1, 2, or 3)');
    var tier2Mech = String(entry.tier2Mechanism || '');
    if (Number(entry.tier) === 2 && tier2Mech !== 'scored' && tier2Mech !== 'conceded') {
      return fail('tier2Mechanism must be "scored" or "conceded" for the Tier 2 entry');
    }
  }

  var sheet      = getSheet('GroupPreferences');
  var playerId   = player['Player ID'];
  var playerName = player['Name'];

  // Ensure headers exist before deleting (sheet may be empty)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Player ID', 'Player Name', 'Team Name', 'Tier', 'Captain Name', 'Tier 2 Mechanism']);
  }

  // Delete all existing rows for this player, then append fresh rows
  deleteRowsForPlayer(sheet, 'Player ID', playerId);

  for (var j = 0; j < captains.length; j++) {
    var c = captains[j];
    var tier2Mechanism = (Number(c.tier) === 2) ? String(c.tier2Mechanism || 'scored') : '';
    sheet.appendRow([playerId, playerName, c.team, c.tier, c.captain, tier2Mechanism]);
  }

  return ok({ message: 'Group preferences saved successfully' });
}

/**
 * POST submitKnockoutPreferences
 *
 * Body: {
 *   pin: "1234",
 *   teamsPurchased: ["France", "Brazil"],
 *   captain: "Mbappe"
 * }
 *
 * Writes one row per purchased team to KnockoutPreferences:
 *   Player ID | Player Name | Team Purchased | Price Paid | Captain Name | Total Spend
 *
 * Captain Name and Total Spend are repeated on every row for the player.
 * Re-submissions overwrite all previous rows for this player.
 */
function handleSubmitKnockoutPreferences(body) {
  var name           = body.name    ? String(body.name).trim()    : '';
  var pin            = body.pin     ? String(body.pin).trim()     : '';
  var teamsPurchased = body.teamsPurchased;
  var captain        = body.captain ? String(body.captain).trim() : '';

  if (!name) return fail('Name is required', 400);
  if (!pin)  return fail('PIN is required', 400);

  var player = findPlayerByName(name);
  if (!player || String(player['PIN']) !== String(pin)) return fail('Invalid name or PIN', 401);

  var config = readConfig();
  if (!isPhaseOpen('knockout_preferences', config)) {
    return fail('Knockout preferences are currently closed', 403);
  }

  if (!Array.isArray(teamsPurchased) || teamsPurchased.length === 0) {
    return fail('teamsPurchased must be a non-empty array of team names');
  }

  if (!captain) return fail('captain is required');

  // ── Build price map from KnockoutTeams ────────────────────────────────────
  // Columns: Team Name | Flag Emoji | Price
  var ktSheet  = getSheet('KnockoutTeams');
  var ktData   = ktSheet.getDataRange().getValues();
  if (ktData.length < 2) return fail('Knockout teams have not been configured yet');

  var ktHeaders = ktData[0];
  var ktNameCol  = ktHeaders.indexOf('Team Name');
  var ktPriceCol = ktHeaders.indexOf('Price');

  if (ktNameCol === -1)  return fail('KnockoutTeams sheet is missing a "Team Name" column');
  if (ktPriceCol === -1) return fail('KnockoutTeams sheet is missing a "Price" column');

  var priceMap = {};
  for (var i = 1; i < ktData.length; i++) {
    var tn = String(ktData[i][ktNameCol]);
    if (tn) priceMap[tn] = Number(ktData[i][ktPriceCol]) || 0;
  }

  // All team names in this season's knockout round (used for captain validation)
  var knockoutTeamNames = Object.keys(priceMap);

  // ── Validate teams and calculate team spend ───────────────────────────────
  var totalSpend = 0;
  for (var t = 0; t < teamsPurchased.length; t++) {
    var teamName = String(teamsPurchased[t]);
    if (!(teamName in priceMap)) return fail('Unknown team: "' + teamName + '"');
    totalSpend += priceMap[teamName];
  }

  // ── Validate captain and add their price to total spend ───────────────────
  // Captain can be any player from any knockout team's squad (not limited to purchased teams).
  // Each player's price is in column E (PlayerPrice) of the Squads sheet.
  var squadsSheet = getSheet('Squads');
  var squadsData  = squadsSheet.getDataRange().getValues();
  var captainPrice = 0;

  if (squadsData.length >= 2) {
    var sqHeaders   = squadsData[0];
    var sqTeamCol   = sqHeaders.indexOf('Team Name');
    var sqPlayerCol = sqHeaders.indexOf('Player Name');
    var sqPriceCol  = sqHeaders.indexOf('PlayerPrice');
    var captainLower = captain.toLowerCase();
    var captainValid = false;

    if (sqTeamCol !== -1 && sqPlayerCol !== -1) {
      for (var s = 1; s < squadsData.length; s++) {
        if (knockoutTeamNames.indexOf(String(squadsData[s][sqTeamCol])) !== -1 &&
            String(squadsData[s][sqPlayerCol]).toLowerCase() === captainLower) {
          captainValid = true;
          captainPrice = sqPriceCol !== -1 ? (Number(squadsData[s][sqPriceCol]) || 0) : 0;
          break;
        }
      }
      if (!captainValid) {
        return fail('Captain must be a player from a knockout tournament team\'s squad');
      }
    }
  }
  // If Squads sheet is empty, skip the captain validation check.

  totalSpend += captainPrice;

  var budget = Number(config['KnockoutBudget']) || 1000;
  if (totalSpend > budget) {
    return fail(
      'Total spend (' + totalSpend + ') exceeds your budget (' + budget + '). Please remove some teams or choose a cheaper captain.',
      400
    );
  }

  // ── Write to KnockoutPreferences ─────────────────────────────────────────
  var sheet      = getSheet('KnockoutPreferences');
  var playerId   = player['Player ID'];
  var playerName = player['Name'];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Player ID', 'Player Name', 'Team Purchased', 'Price Paid', 'Captain Name', 'Captain Price Paid', 'Total Spend']);
  }

  // Delete all existing rows for this player, then append one row per team
  deleteRowsForPlayer(sheet, 'Player ID', playerId);

  for (var r = 0; r < teamsPurchased.length; r++) {
    var tName = String(teamsPurchased[r]);
    sheet.appendRow([playerId, playerName, tName, priceMap[tName], captain, captainPrice, totalSpend]);
  }

  return ok({
    message:         'Knockout preferences saved successfully',
    totalSpend:      totalSpend,
    remainingBudget: budget - totalSpend
  });
}

// ─── Main Router ─────────────────────────────────────────────────────────────

/**
 * All requests arrive as GET to avoid CORS preflight issues.
 * Apps Script's 302 redirect causes browsers to send an OPTIONS preflight
 * for any POST, which Apps Script returns 405 for. GET requests are never
 * preflighted regardless of redirect, so write actions are sent as GET
 * with the JSON body encoded in the `payload` query parameter.
 */
function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || '';
    var pin    = (e.parameter && e.parameter.pin)    || '';

    // Parse the payload parameter for write actions
    var body = {};
    if (e.parameter && e.parameter.payload) {
      try {
        body = JSON.parse(e.parameter.payload);
      } catch (parseErr) {
        return fail('Invalid payload JSON: ' + parseErr.message);
      }
    }

    switch (action) {
      // ── Read actions ──────────────────────────────────────────────────────
      case 'getConfig':        return handleGetConfig();
      case 'getLeaderboard':   return handleGetLeaderboard();
      case 'getTeams':         return handleGetTeams();
      case 'getSquads':        return handleGetSquads();
      case 'getMatches':       return handleGetMatches();
      case 'getPlayerNames':   return handleGetPlayerNames();
      case 'getAllAllocations': return handleGetAllAllocations();
      case 'getPlayerPicks':   return handleGetPlayerPicks(e.parameter.playerName || '');
      case 'getAllocations':   return handleGetAllocations(e.parameter.name || '', pin);
      case 'getKnockoutTeams': return handleGetKnockoutTeams(pin);
      // ── Write actions (body arrives via ?payload=...) ─────────────────────
      case 'register':                  return handleRegister(body);
      case 'submitGroupPreferences':    return handleSubmitGroupPreferences(body);
      case 'submitKnockoutPreferences': return handleSubmitKnockoutPreferences(body);
      default:
        return fail('Unknown action: "' + action + '"', 404);
    }
  } catch (err) {
    return fail('Server error: ' + err.message, 500);
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    // Action can be a URL query parameter or a field in the JSON body
    var action = (e.parameter && e.parameter.action) || body.action || '';

    switch (action) {
      case 'register':                  return handleRegister(body);
      case 'submitGroupPreferences':    return handleSubmitGroupPreferences(body);
      case 'submitKnockoutPreferences': return handleSubmitKnockoutPreferences(body);
      default:
        return fail(
          'Unknown action: "' + action + '". Valid POST actions: ' +
          'register, submitGroupPreferences, submitKnockoutPreferences',
          404
        );
    }
  } catch (err) {
    return fail('Server error: ' + err.message, 500);
  }
}
