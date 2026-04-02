/**
 * Code.gs — World Cup 2026 Sweepstake API
 *
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 *
 * ── Expected Google Sheet tabs & column headers ────────────────────────────
 *
 * Config        │ Key                  │ Value
 *               ├──────────────────────┼──────────────────────
 *               │ RegistrationCode     │ (shared secret, e.g. "worldcup2026")
 *               │ RegistrationClose    │ 2026-06-10T23:59:00
 *               │ GroupPrefsOpen       │ 2026-06-11T00:00:00
 *               │ GroupPrefsClose      │ 2026-06-14T17:00:00
 *               │ GroupScoringOpen     │ 2026-06-14T18:00:00
 *               │ GroupScoringClose    │ 2026-07-02T23:59:00
 *               │ KnockoutPrefsOpen    │ 2026-07-03T00:00:00
 *               │ KnockoutPrefsClose   │ 2026-07-05T17:00:00
 *               │ KnockoutScoringOpen  │ 2026-07-05T18:00:00
 *               │ KnockoutScoringClose │ 2026-07-19T23:59:00
 *               │ KnockoutBudget       │ 1000
 *
 * Teams         │ TeamID │ Name │ FIFARanking │ Tier │ FlagEmoji │ Squads
 *               Squads column: comma-separated player names, e.g. "Mbappe,Giroud,..."
 *
 * Players       │ PlayerID │ Name │ PIN │ Timestamp
 *
 * Allocations   │ PlayerID │ TeamName │ Tier
 *
 * GroupPreferences  │ PlayerID │ PlayerName │ Captains │ Tier2Mechanism │ Timestamp
 *                   Captains column: JSON array, e.g. [{"team":"France","captain":"Mbappe"},...]
 *
 * KnockoutTeams │ Name │ Price │ Eliminated
 *
 * KnockoutPreferences │ PlayerID │ PlayerName │ TeamsPurchased │ TotalSpend │ Captain │ Timestamp
 *                       TeamsPurchased: JSON array of team name strings
 *
 * Matches       │ MatchID │ HomeTeam │ AwayTeam │ HomeScore │ AwayScore │ Stage │ Group │ Date │ Status
 *
 * Leaderboard   │ PlayerID │ PlayerName │ GroupPoints │ KnockoutPoints │ TotalPoints
 * ──────────────────────────────────────────────────────────────────────────
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

/**
 * Returns all data rows from a sheet as an array of objects keyed by header row.
 */
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
 * Reads the Config tab (Key / Value pairs) into a plain object.
 */
function readConfig() {
  var sheet = getSheet('Config');
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (key) config[key] = data[i][1];
  }
  return config;
}

/**
 * Determines which named phase is currently active.
 */
function getCurrentPhase(config) {
  var now = new Date();

  function d(key) { return config[key] ? new Date(config[key]) : null; }

  var regClose        = d('RegistrationClose');
  var gpOpen          = d('GroupPrefsOpen');
  var gpClose         = d('GroupPrefsClose');
  var gsOpen          = d('GroupScoringOpen');
  var gsClose         = d('GroupScoringClose');
  var koPrefsOpen     = d('KnockoutPrefsOpen');
  var koPrefsClose    = d('KnockoutPrefsClose');
  var koScoringOpen   = d('KnockoutScoringOpen');
  var koScoringClose  = d('KnockoutScoringClose');

  if (regClose && now <= regClose)               return 'registration';
  if (gpOpen   && gpClose  && now >= gpOpen  && now <= gpClose)  return 'group_preferences';
  if (gsOpen   && gsClose  && now >= gsOpen  && now <= gsClose)  return 'group_scoring';
  if (koPrefsOpen && koPrefsClose && now >= koPrefsOpen && now <= koPrefsClose) return 'knockout_preferences';
  if (koScoringOpen && koScoringClose && now >= koScoringOpen && now <= koScoringClose) return 'knockout_scoring';
  if (koScoringClose && now > koScoringClose)    return 'complete';
  return 'between_phases';
}

/**
 * Returns true when the given phase window is currently open.
 */
function isPhaseOpen(phase, config) {
  var now = new Date();
  function d(key) { return config[key] ? new Date(config[key]) : null; }

  switch (phase) {
    case 'registration':
      var rc = d('RegistrationClose');
      return rc && now <= rc;
    case 'group_preferences':
      var o = d('GroupPrefsOpen'), c = d('GroupPrefsClose');
      return o && c && now >= o && now <= c;
    case 'knockout_preferences':
      var ko = d('KnockoutPrefsOpen'), kc = d('KnockoutPrefsClose');
      return ko && kc && now >= ko && now <= kc;
    default:
      return false;
  }
}

// ─── Player Helpers ──────────────────────────────────────────────────────────

/**
 * Finds a player row by PIN. Returns the player object (with _row) or null.
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

/**
 * Finds a player row by name (case-insensitive). Returns the player object or null.
 */
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

// ─── GET Handlers ────────────────────────────────────────────────────────────

function handleGetConfig() {
  var config = readConfig();
  var phase = getCurrentPhase(config);
  return ok({
    registrationClose:    config['RegistrationClose']    || null,
    groupPrefsOpen:       config['GroupPrefsOpen']       || null,
    groupPrefsClose:      config['GroupPrefsClose']      || null,
    groupScoringOpen:     config['GroupScoringOpen']     || null,
    groupScoringClose:    config['GroupScoringClose']    || null,
    knockoutPrefsOpen:    config['KnockoutPrefsOpen']    || null,
    knockoutPrefsClose:   config['KnockoutPrefsClose']   || null,
    knockoutScoringOpen:  config['KnockoutScoringOpen']  || null,
    knockoutScoringClose: config['KnockoutScoringClose'] || null,
    knockoutBudget:       Number(config['KnockoutBudget']) || 1000,
    currentPhase:         phase
  });
}

function handleGetLeaderboard() {
  var sheet = getSheet('Leaderboard');
  return ok(sheetToObjects(sheet));
}

/**
 * Returns all teams, parsing the Squads column into an array.
 */
function handleGetTeams() {
  var sheet = getSheet('Teams');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return ok([]);
  var headers = data[0];
  var teams = data.slice(1).map(function (row) {
    var team = {};
    headers.forEach(function (h, i) {
      if (h === 'Squads') {
        team.squads = row[i]
          ? String(row[i]).split(',').map(function (p) { return p.trim(); }).filter(Boolean)
          : [];
      } else {
        team[h] = row[i];
      }
    });
    return team;
  });
  return ok(teams);
}

/**
 * Returns squad lists as an object keyed by team name.
 */
function handleGetSquads() {
  var sheet = getSheet('Teams');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return ok({});
  var headers = data[0];
  var nameCol = headers.indexOf('Name');
  var squadsCol = headers.indexOf('Squads');
  if (nameCol === -1) return fail('Teams sheet is missing a "Name" column');
  if (squadsCol === -1) return fail('Teams sheet is missing a "Squads" column');

  var result = {};
  for (var i = 1; i < data.length; i++) {
    var teamName = data[i][nameCol];
    if (!teamName) continue;
    result[teamName] = data[i][squadsCol]
      ? String(data[i][squadsCol]).split(',').map(function (p) { return p.trim(); }).filter(Boolean)
      : [];
  }
  return ok(result);
}

function handleGetMatches() {
  var sheet = getSheet('Matches');
  return ok(sheetToObjects(sheet));
}

/**
 * Returns the requesting player's allocations plus any saved group preferences.
 * Requires a valid PIN.
 */
function handleGetAllocations(pin) {
  if (!pin) return fail('PIN is required', 400);
  var player = findPlayerByPin(pin);
  if (!player) return fail('Invalid PIN', 401);

  var allocSheet = getSheet('Allocations');
  var allocData  = allocSheet.getDataRange().getValues();
  var allocs = [];

  if (allocData.length >= 2) {
    var headers  = allocData[0];
    var pidCol   = headers.indexOf('PlayerID');
    for (var i = 1; i < allocData.length; i++) {
      if (String(allocData[i][pidCol]) === String(player['PlayerID'])) {
        var row = {};
        headers.forEach(function (h, j) { row[h] = allocData[i][j]; });
        allocs.push(row);
      }
    }
  }

  var groupPrefs = getGroupPrefsForPlayer(player['PlayerID']);

  return ok({
    player:           { PlayerID: player['PlayerID'], Name: player['Name'] },
    allocations:      allocs,
    groupPreferences: groupPrefs
  });
}

/**
 * Returns available knockout teams with prices.
 * Optionally includes the requesting player's existing knockout preferences if a PIN is supplied.
 */
function handleGetKnockoutTeams(pin) {
  var sheet = getSheet('KnockoutTeams');
  var teams = sheetToObjects(sheet);

  var myPreferences = null;
  if (pin) {
    var player = findPlayerByPin(pin);
    if (player) {
      var raw = getKnockoutPrefsForPlayer(player['PlayerID']);
      if (raw) {
        // Parse stored JSON array back to a real array
        try { raw['TeamsPurchased'] = JSON.parse(raw['TeamsPurchased']); } catch (e) { /* leave as-is */ }
        myPreferences = raw;
      }
    }
  }

  return ok({ teams: teams, myPreferences: myPreferences });
}

// ─── Preference Lookup Helpers ───────────────────────────────────────────────

function getGroupPrefsForPlayer(playerId) {
  var sheet = getSheet('GroupPreferences');
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var pidCol  = headers.indexOf('PlayerID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][pidCol]) === String(playerId)) {
      var prefs = {};
      headers.forEach(function (h, j) { prefs[h] = data[i][j]; });
      // Parse captains JSON
      try { prefs['Captains'] = JSON.parse(prefs['Captains']); } catch (e) { /* leave as-is */ }
      return prefs;
    }
  }
  return null;
}

function getKnockoutPrefsForPlayer(playerId) {
  var sheet = getSheet('KnockoutPreferences');
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var pidCol  = headers.indexOf('PlayerID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][pidCol]) === String(playerId)) {
      var prefs = {};
      headers.forEach(function (h, j) { prefs[h] = data[i][j]; });
      return prefs;
    }
  }
  return null;
}

// ─── POST Handlers ───────────────────────────────────────────────────────────

/**
 * POST register
 * Body: { name, pin, registrationCode }
 */
function handleRegister(body) {
  var name = body.name ? String(body.name).trim() : '';
  var pin  = body.pin  ? String(body.pin).trim()  : '';
  var code = body.registrationCode ? String(body.registrationCode).trim() : '';

  if (!name) return fail('Name is required');
  if (!pin)  return fail('PIN is required');
  if (!code) return fail('Registration code is required');

  // PIN must be 4–8 characters (lightweight sanity check)
  if (pin.length < 4 || pin.length > 8) return fail('PIN must be between 4 and 8 characters');

  var config = readConfig();

  if (!isPhaseOpen('registration', config)) {
    return fail('Registration is currently closed', 403);
  }

  // Validate registration code (case-insensitive)
  var storedCode = String(config['RegistrationCode'] || '');
  if (storedCode.toLowerCase() !== code.toLowerCase()) {
    return fail('Invalid registration code', 403);
  }

  // Check name is not already taken
  if (findPlayerByName(name)) {
    return fail('That name is already registered. Please choose a different name.', 409);
  }

  // Check PIN is not already in use (PINs must be unique — they act as a login token)
  if (findPlayerByPin(pin)) {
    return fail('That PIN is already in use. Please choose a different PIN.', 409);
  }

  var sheet   = getSheet('Players');
  var lastRow = sheet.getLastRow();

  // Write header row if the sheet is empty
  if (lastRow === 0) {
    sheet.appendRow(['PlayerID', 'Name', 'PIN', 'Timestamp']);
    lastRow = 1;
  }

  // Generate a PlayerID: P + last-6-digits-of-epoch + current-row-count
  var playerId  = 'P' + String(Date.now()).slice(-6) + String(lastRow);
  var timestamp = new Date().toISOString();

  sheet.appendRow([playerId, name, pin, timestamp]);

  return ok({ playerID: playerId, name: name, message: 'Registration successful' });
}

/**
 * POST submitGroupPreferences
 * Body: { pin, captains: [{ team, captain }, ...], tier2Mechanism: "scored"|"conceded" }
 */
function handleSubmitGroupPreferences(body) {
  var pin           = body.pin            ? String(body.pin).trim()            : '';
  var captains      = body.captains;
  var tier2Mechanism = body.tier2Mechanism ? String(body.tier2Mechanism).trim() : 'scored';

  if (!pin) return fail('PIN is required');

  var player = findPlayerByPin(pin);
  if (!player) return fail('Invalid PIN', 401);

  var config = readConfig();
  if (!isPhaseOpen('group_preferences', config)) {
    return fail('Group stage preferences are currently closed', 403);
  }

  if (!Array.isArray(captains) || captains.length === 0) {
    return fail('captains must be a non-empty array');
  }

  for (var i = 0; i < captains.length; i++) {
    if (!captains[i].team || !captains[i].captain) {
      return fail('Each entry in captains must have "team" and "captain" fields');
    }
  }

  if (tier2Mechanism !== 'scored' && tier2Mechanism !== 'conceded') {
    tier2Mechanism = 'scored';
  }

  var sheet      = getSheet('GroupPreferences');
  var timestamp  = new Date().toISOString();
  var playerId   = player['PlayerID'];
  var playerName = player['Name'];
  var captainsJson = JSON.stringify(captains);

  var rowData = [playerId, playerName, captainsJson, tier2Mechanism, timestamp];

  // Upsert: update existing row if found, otherwise append
  var existingRow = findExistingPreferenceRow(sheet, 'PlayerID', playerId);

  if (existingRow === -1) {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['PlayerID', 'PlayerName', 'Captains', 'Tier2Mechanism', 'Timestamp']);
    }
    sheet.appendRow(rowData);
  } else {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  }

  return ok({ message: 'Group preferences saved successfully' });
}

/**
 * POST submitKnockoutPreferences
 * Body: { pin, teamsPurchased: ["TeamA", "TeamB", ...], captain: "PlayerName" }
 */
function handleSubmitKnockoutPreferences(body) {
  var pin            = body.pin     ? String(body.pin).trim()     : '';
  var teamsPurchased = body.teamsPurchased;
  var captain        = body.captain ? String(body.captain).trim() : '';

  if (!pin) return fail('PIN is required');

  var player = findPlayerByPin(pin);
  if (!player) return fail('Invalid PIN', 401);

  var config = readConfig();
  if (!isPhaseOpen('knockout_preferences', config)) {
    return fail('Knockout preferences are currently closed', 403);
  }

  if (!Array.isArray(teamsPurchased) || teamsPurchased.length === 0) {
    return fail('teamsPurchased must be a non-empty array of team names');
  }

  if (!captain) return fail('captain is required');

  // ── Budget validation ──────────────────────────────────────────────────────
  var ktSheet  = getSheet('KnockoutTeams');
  var ktData   = ktSheet.getDataRange().getValues();
  if (ktData.length < 2) return fail('Knockout teams have not been configured yet');

  var ktHeaders  = ktData[0];
  var nameCol    = ktHeaders.indexOf('Name');
  var priceCol   = ktHeaders.indexOf('Price');

  if (nameCol === -1)  return fail('KnockoutTeams sheet is missing a "Name" column');
  if (priceCol === -1) return fail('KnockoutTeams sheet is missing a "Price" column');

  var priceMap = {};
  for (var i = 1; i < ktData.length; i++) {
    var tName = String(ktData[i][nameCol]);
    if (tName) priceMap[tName] = Number(ktData[i][priceCol]) || 0;
  }

  var totalSpend = 0;
  for (var t = 0; t < teamsPurchased.length; t++) {
    var team = String(teamsPurchased[t]);
    if (!(team in priceMap)) return fail('Unknown team: "' + team + '"');
    totalSpend += priceMap[team];
  }

  var budget = Number(config['KnockoutBudget']) || 1000;
  if (totalSpend > budget) {
    return fail(
      'Total spend (' + totalSpend + ') exceeds your budget (' + budget + '). ' +
      'Please remove some teams.',
      400
    );
  }

  // ── Captain validation ─────────────────────────────────────────────────────
  // The captain must appear in the Squads column of at least one purchased team.
  var teamsSheet = getSheet('Teams');
  var teamsData  = teamsSheet.getDataRange().getValues();
  var tHeaders   = teamsData[0];
  var tNameCol   = tHeaders.indexOf('Name');
  var tSquadsCol = tHeaders.indexOf('Squads');
  var captainLower = captain.toLowerCase();
  var captainValid = false;

  if (tNameCol !== -1 && tSquadsCol !== -1) {
    for (var ti = 1; ti < teamsData.length; ti++) {
      var rowTeamName = String(teamsData[ti][tNameCol]);
      if (teamsPurchased.indexOf(rowTeamName) === -1) continue;
      var squad = teamsData[ti][tSquadsCol]
        ? String(teamsData[ti][tSquadsCol]).split(',').map(function (p) { return p.trim().toLowerCase(); })
        : [];
      if (squad.indexOf(captainLower) !== -1) {
        captainValid = true;
        break;
      }
    }
    if (!captainValid) {
      return fail('Captain must be a player from one of your purchased teams\' squads');
    }
  }
  // If Teams sheet has no Squads column we skip the check (allow the submission).

  // ── Write ──────────────────────────────────────────────────────────────────
  var sheet      = getSheet('KnockoutPreferences');
  var timestamp  = new Date().toISOString();
  var playerId   = player['PlayerID'];
  var playerName = player['Name'];
  var teamsJson  = JSON.stringify(teamsPurchased);

  var rowData = [playerId, playerName, teamsJson, totalSpend, captain, timestamp];

  var existingRow = findExistingPreferenceRow(sheet, 'PlayerID', playerId);

  if (existingRow === -1) {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['PlayerID', 'PlayerName', 'TeamsPurchased', 'TotalSpend', 'Captain', 'Timestamp']);
    }
    sheet.appendRow(rowData);
  } else {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  }

  return ok({
    message:         'Knockout preferences saved successfully',
    totalSpend:      totalSpend,
    remainingBudget: budget - totalSpend
  });
}

// ─── Upsert Helper ───────────────────────────────────────────────────────────

/**
 * Scans a sheet for an existing row where the given column header matches value.
 * Returns the 1-indexed row number, or -1 if not found.
 */
function findExistingPreferenceRow(sheet, headerName, value) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  var col = data[0].indexOf(headerName);
  if (col === -1) return -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][col]) === String(value)) return r + 1;
  }
  return -1;
}

// ─── Main Router ─────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || '';
    var pin    = (e.parameter && e.parameter.pin)    || '';

    switch (action) {
      case 'getConfig':        return handleGetConfig();
      case 'getLeaderboard':   return handleGetLeaderboard();
      case 'getTeams':         return handleGetTeams();
      case 'getSquads':        return handleGetSquads();
      case 'getMatches':       return handleGetMatches();
      case 'getAllocations':   return handleGetAllocations(pin);
      case 'getKnockoutTeams': return handleGetKnockoutTeams(pin);
      default:
        return fail('Unknown action: "' + action + '". Valid GET actions: getConfig, getLeaderboard, getTeams, getSquads, getMatches, getAllocations, getKnockoutTeams', 404);
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

    // Action can come from the URL query string or the JSON body
    var action = (e.parameter && e.parameter.action) || body.action || '';

    switch (action) {
      case 'register':                  return handleRegister(body);
      case 'submitGroupPreferences':    return handleSubmitGroupPreferences(body);
      case 'submitKnockoutPreferences': return handleSubmitKnockoutPreferences(body);
      default:
        return fail('Unknown action: "' + action + '". Valid POST actions: register, submitGroupPreferences, submitKnockoutPreferences', 404);
    }
  } catch (err) {
    return fail('Server error: ' + err.message, 500);
  }
}
