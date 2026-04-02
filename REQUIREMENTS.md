# World Cup 2026 Sweepstake — Game Mechanics & Scoring Rules

## Document Purpose

This is the requirements specification for the scoring engine of a FIFA World Cup 2026 workplace sweepstake. Use this document to build the data model, scoring logic, and validation rules. Approximately 40 players will participate.

---

## 1. Tournament Structure

The competition has two distinct phases with different rules:

- **Group Stage** — all group matches (normal time + stoppage time only)
- **Knockout Stage** — round of 16 through to the final (normal time + stoppage time only)

**Critical rule:** Penalty shootout goals never count at any stage. Only goals in normal time and stoppage time are eligible for points.

---

## 2. Group Stage Rules

### 2.1 Team Allocation

The 32 World Cup teams are divided into **3 tiers** based on their FIFA ranking at the time of the tournament draw.

| Tier | Description | Approximate size |
|------|-------------|-----------------|
| Tier 1 | Highest-ranked teams | ~11 teams |
| Tier 2 | Mid-ranked teams | ~11 teams |
| Tier 3 | Lowest-ranked teams | ~10 teams |

> **Note:** The exact tier splits will depend on the final 32 qualifiers and their FIFA rankings. The tiers should be as evenly sized as possible.

Each player is **randomly allocated one team from each tier**, giving every player exactly **3 teams** for the group stage.

### 2.2 Goal Points — Group Stage

Each tier has a different points mechanism:

| Tier | Mechanism | Points |
|------|-----------|--------|
| Tier 1 | Goals **scored** by your team | +1 per goal |
| Tier 2 | Goals **scored** OR **conceded** by your team (player's choice) | +1 per goal |
| Tier 3 | Goals **conceded** by your team | +1 per goal |

#### Tier 2 Choice Rules

- Each player must declare whether their Tier 2 team earns points from goals **scored** or goals **conceded**.
- This choice must be submitted **before the first group stage match kicks off**.
- Once submitted, the choice is **locked for the entire group stage** and cannot be changed.
- If a player fails to submit a choice before the deadline, a default must be assigned (suggest: goals scored).

### 2.3 Captain Selection — Group Stage

For **each** of their three teams, a player nominates **one player as captain** (3 captains total per player).

| Event | Points |
|-------|--------|
| Captain scores a goal | **+3 points** |

**Captain rules:**

- The captain bonus is **always based on goals scored** — regardless of which tier the team is in. A Tier 3 captain earns +3 when they score, even though the Tier 3 team's main mechanism is goals conceded. The captain bonus is a separate, independent reward.
- The +3 points **replaces** the normal +1 goal point if applicable (e.g. for a Tier 1 team). It does **not** stack. A captain goal = 3 points total, not 4.
- For a Tier 3 team: a captain goal earns +3 (captain bonus). This is independent of and additional to any points from goals conceded under the tier mechanism.
- Captains are **locked for the entire group stage** — no changes between matches.
- Captains must be selected **before the first group stage match kicks off**.
- A captain must be a player registered in the team's World Cup squad.
- If a nominated captain is not in the matchday squad for a given game, no captain bonus applies for that match.

### 2.4 Own Goals

Own goals follow a simple, universal rule that applies identically across all tiers and all stages of the tournament:

| Event | Points |
|-------|--------|
| Your team scores an own goal | **-5 points** |
| The other team in the match (opposition) | **+1 point** |

**Clarifications:**

- The -5 penalty applies to the owner of the team whose player scored the own goal. This is the same regardless of tier.
- The +1 point goes to the owner of the opposition team. This is the same regardless of tier.
- Own goals are otherwise excluded from the tier mechanism — a Tier 3 team does not count an opposition own goal as a "conceded" goal, and a Tier 1 team does not count an own goal by the opposition as a "scored" goal. The +1 is a flat reward to the opposition owner.
- If a captain scores an own goal, the -5 penalty applies. The captain bonus does not apply to own goals.

### 2.5 Card Deductions — Group Stage

Card deductions apply to **all players** across **all three** of a participant's teams. Not just captains.

| Card Event | Points |
|------------|--------|
| Yellow card | **-1 point** |
| Straight red card | **-3 points** |

**Clarifications:**

- Every yellow card is -1, regardless of how many a player receives in the same match. Two yellows in the same match = -1 + -1 = -2.
- A straight red (no preceding yellow in that match) is -3.
- Cards received by substitutes and players on the bench also count.

---

## 3. Knockout Stage Rules

### 3.1 Team Auction

After the group stage concludes, a completely new team selection process occurs for the remaining **16 teams**.

#### Pricing

Each of the 16 remaining teams is assigned a **set price** based on a **combination of**:

1. **FIFA ranking** — higher-ranked teams cost more
2. **Group stage performance** — teams that performed well (points, goals scored, goal difference) cost more

> **Implementation note:** The exact pricing formula needs to be defined. Suggested approach: create a composite score from FIFA ranking position and group stage points/goal difference, then map to price bands. The organiser should be able to manually adjust prices if needed.

#### Auction Mechanics

- Every player receives the **same starting budget** (pot size TBD based on pricing structure).
- Players submit their team selections **independently** — this is a **blind selection**, not a live auction.
- Players can buy **as many teams as their budget allows**.
- There is **no exclusivity** — multiple players can own the same team.
- The auction happens **once only** — there are no re-drafts at the quarter-finals, semi-finals, or final.
- Unspent budget has no value — use it or lose it.

### 3.2 Goal Points — Knockout Stage

There are **no tiers** in the knockout stage. All teams work identically:

| Event | Points |
|-------|--------|
| Goal scored by your team | **+1 point** |
| Penalty shootout goal | **Does not count** |

### 3.3 Captain Selection — Knockout Stage

Each player nominates **one captain** across **all** of their knockout stage teams (not one per team — just one captain total).

| Event | Points |
|-------|--------|
| Captain scores a goal | **+3 points** (replaces the +1 goal point, no stacking) |

**Captain rules:**

- The captain can be any player from any of the teams the participant has purchased.
- Captain is locked once submitted — no changes between knockout rounds.
- Must be submitted before the first knockout match kicks off.

### 3.4 Own Goals — Knockout Stage

Same rules as group stage:

| Event | Points |
|-------|--------|
| Your team scores an own goal | **-5 points** |
| The other team in the match | **+1 point** |

### 3.5 Card Deductions — Knockout Stage

Same rules as group stage:

| Card Event | Points |
|------------|--------|
| Yellow card | **-1 point** |
| Straight red card | **-3 points** |

### 3.6 Team Elimination

Once a team is knocked out of the tournament, it **immediately stops earning or losing points**. There is no consolation mechanism.

---

## 4. Points Summary — Quick Reference

| Event | Group Stage | Knockout Stage |
|-------|-------------|----------------|
| Goal (Tier 1 — scored) | +1 | — |
| Goal (Tier 2 — player's choice) | +1 | — |
| Goal (Tier 3 — conceded) | +1 | — |
| Goal (any team) | — | +1 |
| Captain scores (always goals scored, any tier) | +3 (replaces goal point) | +3 (replaces goal point) |
| Own goal (your team) | -5 | -5 |
| Opposition in own goal match | +1 | +1 |
| Yellow card | -1 | -1 |
| Straight red card | -3 | -3 |
| Penalty shootout goal | Does not count | Does not count |
| Extra time goal | N/A (no extra time in groups) | Counts normally |

---

## 5. Edge Cases & Clarifications

### 5.1 Captain own goal
If a nominated captain scores an own goal, the -5 own goal penalty applies. The captain bonus does not apply to own goals.

### 5.2 Captain scores and gets carded in same match
Points are calculated independently. A captain who scores (+3) and receives a yellow (-1) nets +2 for those events.

### 5.3 Tier 3 captain scores
A Tier 3 team earns points from goals conceded. But the captain bonus is always based on goals **scored**. So if a Tier 3 captain scores, the owner gets +3 (captain bonus). This is independent of and in addition to any conceded-goal points.

### 5.4 Match abandoned or void
If a match is abandoned and replayed, only the completed replay counts. If a result stands from an abandoned match, that result counts.

### 5.5 Goals scored in extra time (knockout only)
Goals in extra time (the 30-minute period before penalties) **do count** — they are part of normal play, not a shootout. Only penalty shootout goals are excluded.

### 5.6 Player transferred or injured mid-tournament
Captain selections remain locked regardless. If a captain is injured or dropped, the participant does not get to change their captain.

### 5.7 Tier 2 default
If a player does not submit their Tier 2 choice before the deadline, it defaults to **goals scored**.

### 5.8 Multiple teams in the same match
In the group stage, a player could have two of their teams playing each other (e.g. their Tier 1 and Tier 3 teams in the same group). Both teams score independently according to their tier rules. In the knockout stage, a player could own both teams in a match — both earn points independently.

### 5.9 Own goal in a match where you own both teams
If you own both teams in a match and one scores an own goal: you get -5 for the own goal team and +1 for the other team. Net: -4.

### 5.10 Two yellows in the same match
Each yellow is counted individually as -1. Two yellows = -2. There is no separate "red card" penalty for a sending off caused by two yellows. Only a straight red (without a preceding yellow in that match) incurs the -3 penalty.

---

## 6. Data Requirements

### 6.1 Entities

- **Player** — a participant in the sweepstake (name, unique ID)
- **Team** — a World Cup team (name, FIFA ranking, tier, flag/emoji)
- **Allocation** — links a player to a team with tier and mechanism info
- **Captain** — links a player to a specific footballer for a specific team and phase
- **Match** — a World Cup match (teams, date, stage, group, score)
- **Match Event** — a goal or card within a match (type, minute, player, team)

### 6.2 Match Event Types

| Type | Description | Fields needed |
|------|-------------|--------------|
| `goal` | Normal goal | team, scorer, minute |
| `own_goal` | Own goal | team (who scored it), benefiting team, minute |
| `yellow_card` | Yellow card | team, player, minute |
| `red_card` | Straight red card | team, player, minute |
| `second_yellow` | Second yellow resulting in red | team, player, minute |
| `penalty_shootout_goal` | Shootout goal (ignored for points) | team, scorer |
| `penalty_shootout_miss` | Shootout miss (ignored for points) | team, player |

### 6.3 Scoring Calculation Logic

For each match, for each participant:

1. **Identify which of the participant's teams are playing**
2. **For each goal in the match** (excluding penalty shootout goals):
   a. Is it a normal goal or own goal?
   b. If **normal goal**:
      - **Tier mechanism check (group stage only):**
        - If the scoring team belongs to the participant and the tier mechanism is "scored" (Tier 1, or Tier 2 if player chose scored): award +1.
        - If the conceding team belongs to the participant and the tier mechanism is "conceded" (Tier 3, or Tier 2 if player chose conceded): award +1.
      - **Knockout stage:** If the scoring team belongs to the participant: award +1.
      - **Captain check (both stages):** If the scorer is the participant's captain for that team/phase, award +3 **instead of** +1. The captain bonus is always based on the captain scoring — it applies regardless of tier mechanism.
   c. If **own goal**:
      - The team that scored the own goal: **-5** to their owner.
      - The other team in the match: **+1** to their owner.
      - Own goals are independent of the tier mechanism — the +1 to the opposition is a flat reward.
      - Captain bonus does not apply to own goals.
3. **For each card in the match:**
   - Yellow card: -1 to the owner of the carded player's team.
   - Each yellow is counted individually (-1 each), even if multiple yellows lead to a sending off.
   - Straight red card: -3 to the owner.
4. **Sum all points** for the match for this participant.

---

## 7. App Flow & Phases

### 7.1 Overview

The app progresses through a series of phases. Each phase is **time-gated** — the admin sets open and close dates, and the app automatically locks/unlocks interfaces based on those dates. A status banner with a countdown is visible to all users showing the current phase and time remaining until the next deadline.

### 7.2 Phase Sequence

```
Phase 1: Registration
Phase 2: Group Stage Preferences
Phase 3: Group Stage (live scoring)
Phase 4: Knockout Preferences (auction)
Phase 5: Knockout Stage (live scoring)
Phase 6: Competition Complete
```

#### Phase 1 — Registration

- **Who can access:** Anyone with the registration code.
- **What happens:** Players visit the app, enter the shared registration code, provide their **name**, and set a **personal PIN** (their choice).
- **Output:** Player is created in the system with their name and PIN.
- **Closes:** When the admin-configured registration deadline passes.
- **After close:** No new sign-ups. Existing players can still log in with their PIN.

#### Phase 2 — Group Stage Preferences

- **Who can access:** Registered players (via PIN).
- **Prerequisites:** The admin has completed the team draw externally and entered team allocations via the admin panel (each player assigned one Tier 1, one Tier 2, one Tier 3 team).
- **What players do:**
  - View their three allocated teams.
  - Select a **captain** for each of their three teams (from that team's squad).
  - If they have a Tier 2 team: choose whether their Tier 2 mechanism is **goals scored** or **goals conceded**.
- **Defaults if not submitted:** Tier 2 mechanism defaults to "goals scored". Captain defaults to no captain (no bonus available — incentivises players to submit).
- **Closes:** Admin-configured deadline (suggested: 1 hour before the first group stage match).
- **After close:** Preferences are locked. Players can view but not edit.

#### Phase 3 — Group Stage (Live Scoring)

- **Who can access:** Everyone (leaderboard is public, no PIN needed).
- **What happens:** Match results are pulled from API-Football once daily by the backend script. Points are calculated and the leaderboard updates.
- **What users see:**
  - Public leaderboard with rankings, total points, and team flags.
  - Expandable player cards showing team-by-team breakdown.
  - Recent match results.
  - Phase status banner.
- **Closes:** When the last group stage match is completed.

#### Phase 4 — Knockout Preferences (Auction)

- **Who can access:** Registered players (via PIN).
- **Prerequisites:** The admin has configured team prices and budget via the admin panel.
- **What players do:**
  - View the 16 remaining teams with their prices.
  - Spend their budget to select teams (blind selection — they don't see what others have picked).
  - Nominate **one captain** across all their selected knockout teams.
- **What they see:** Their remaining budget, selected teams, total spend.
- **Defaults if not submitted:** No teams purchased, no captain — player earns no knockout points (incentivises participation).
- **Closes:** Admin-configured deadline (suggested: 1 hour before the first knockout match).
- **After close:** Selections are locked. Players can view but not edit.

#### Phase 5 — Knockout Stage (Live Scoring)

- **Who can access:** Everyone (public leaderboard).
- **What happens:** Same as Phase 3 but with knockout scoring rules. Eliminated teams stop earning points.
- **What users see:** Combined leaderboard (group stage points + knockout points), knockout bracket progress.
- **Closes:** When the final is completed.

#### Phase 6 — Competition Complete

- **What users see:** Final leaderboard, winner announcement, full stats summary.

### 7.3 Phase Timing

All phase dates are configured by the admin via the admin panel. The app checks the current date/time against phase boundaries and automatically:

- Shows/hides preference forms.
- Displays the appropriate status banner and countdown.
- Locks submissions after deadlines pass.

Example phase configuration:

| Phase | Opens | Closes |
|-------|-------|--------|
| Registration | Immediately | 2026-06-10 23:59 |
| Group Stage Preferences | 2026-06-11 00:00 | 2026-06-14 17:00 |
| Group Stage Scoring | 2026-06-14 18:00 | 2026-07-02 23:59 |
| Knockout Preferences | 2026-07-03 00:00 | 2026-07-05 17:00 |
| Knockout Scoring | 2026-07-05 18:00 | 2026-07-19 23:59 |

> **Note:** Exact dates TBD based on the FIFA match schedule.

---

## 8. Authentication & Access Control

### 8.1 Player Access

- **Registration:** Requires a shared registration code (one code for all players, configured in the Google Sheet by the admin).
- **Login:** Name + personal PIN (set by the player during registration).
- **What login grants:** Access to preference submission forms during open phases. No personal dashboard — the leaderboard is the same for everyone.
- **No login required to:** View the leaderboard, see match results, see the phase status banner.

### 8.2 Admin Access

There is **no admin panel in the app**. All admin tasks are performed by editing the Google Sheet directly. This keeps the app simple and gives the admin full visibility and control over the data in a familiar interface.

Admin tasks performed in the Google Sheet:

- Set/update the registration code.
- View all registered players and their PINs.
- Enter team allocations after the draw (assign Tier 1/2/3 teams to each player).
- Set phase open/close dates.
- Configure knockout team prices and budget.
- View all player preferences (captains, Tier 2 choices, knockout picks).
- Edit/correct match data if the API returns errors.
- Manually adjust points if needed.

### 8.3 Security Notes

- PINs are for lightweight access control in a workplace fun context — this is not a banking app. PINs are stored in the Google Sheet in plain text for admin visibility.
- The Google Sheet can be public or unlisted — the data is not sensitive.
- The registration code can be a simple word or phrase shared via Teams.
- No credentials, API keys, or tokens are exposed in the frontend React app code.
- The Google Apps Script endpoint is open (anyone with the URL can call it) — this is acceptable for this use case.

---

## 9. Technical Architecture

### 9.1 Overview

The app uses a **complete separation of frontend, data, and data pipeline**:

| Component | Where it lives | What it does |
|-----------|---------------|--------------|
| React app | GitHub repo (`worldcup-sweepstake`) → GitHub Pages | Frontend that players see and interact with |
| Google Sheet | Admin's Google account | Single source of truth for all data |
| Google Apps Script | Attached to the Google Sheet | API layer — handles reads and writes from the React app |
| Python script | Admin's Windows PC (Task Scheduler) | Daily job: pulls API-Football data, writes match results to the sheet |

### 9.2 Why This Architecture

- **No credentials in the frontend.** The React app calls the Google Apps Script URL — no API keys, tokens, or secrets in the code.
- **No data wipe risk.** Data lives in Google Sheets, completely separate from the GitHub Pages deployment. App redeployments never touch the data.
- **Admin uses a spreadsheet, not a custom UI.** All config, allocations, prices, and corrections are done by editing the Google Sheet directly — faster to build, easier to use.
- **Free.** GitHub Pages, Google Sheets, Google Apps Script, and API-Football free tier are all zero cost.

### 9.3 GitHub Repos

**Repo 1: `worldcup-sweepstake`**
- Contains the React app source code.
- Deployed to GitHub Pages via `gh-pages` branch.
- No data files — purely frontend.
- Can be redeployed at any time without affecting data.

**Repo 2: `worldcup-sweepstake-data`** (optional, for backup/versioning)
- The daily Python script can optionally push a JSON snapshot of the leaderboard here for version history.
- Not required for the app to function — the React app reads from Google Sheets via Apps Script.
- Useful as a backup and for git-based history of how the leaderboard changed over time.

### 9.4 Google Sheet Structure

The Google Sheet contains the following tabs (worksheets):

| Tab name | Purpose | Who writes | Who reads |
|----------|---------|-----------|-----------|
| `Config` | Phase dates, registration code, knockout budget | Admin (manual) | React app (via Apps Script) |
| `Teams` | All 32 teams: name, FIFA ranking, tier, flag emoji, squad list | Admin (manual, pre-tournament) | React app |
| `Players` | Registered players: name, PIN, registration timestamp | React app (on sign-up) + Admin (manual edits) | React app (for login validation) |
| `Allocations` | Team draw results: player ID, team, tier | Admin (manual, after draw) | React app |
| `GroupPreferences` | Captain picks and Tier 2 choices: player ID, team, captain name, mechanism | React app (player submissions) | React app + Admin |
| `KnockoutTeams` | The 16 remaining teams with prices | Admin (manual, after group stage) | React app |
| `KnockoutPreferences` | Knockout team purchases and captain: player ID, teams bought, spend, captain | React app (player submissions) | React app + Admin |
| `Matches` | Match results: date, teams, score, stage, group | Python script (daily) | React app |
| `MatchEvents` | Goals and cards: match ID, event type, player, team, minute | Python script (daily) | React app |
| `Leaderboard` | Calculated points per player (can be a formula-driven tab or written by the Python script) | Python script or Sheet formulas | React app |

### 9.5 Google Apps Script Endpoints

The Apps Script is deployed as a web app with the following endpoints (differentiated by a `action` parameter):

**Read endpoints (GET):**
- `?action=getConfig` — returns phase dates, registration code, current phase status.
- `?action=getLeaderboard` — returns ranked player list with points.
- `?action=getTeams` — returns all teams with tiers and squads.
- `?action=getMatches` — returns recent match results.
- `?action=getAllocations&pin=XXXX` — returns a player's allocated teams (requires valid PIN).
- `?action=getKnockoutTeams` — returns available knockout teams with prices.

**Write endpoints (POST):**
- `?action=register` — body: `{ name, pin, registrationCode }` — creates a new player.
- `?action=submitGroupPreferences` — body: `{ pin, captains: [...], tier2Mechanism }` — saves group stage preferences.
- `?action=submitKnockoutPreferences` — body: `{ pin, teamsPurchased: [...], captain }` — saves knockout picks.

**Validation rules in Apps Script:**
- Registration: check registration code matches, check name not already taken.
- Login: validate PIN matches the player name.
- Preferences: check current phase is open (compare dates from Config tab), reject submissions outside the window.
- Knockout budget: validate total spend does not exceed budget.

### 9.6 Python Data Pipeline (Daily Script)

Runs once daily on the admin's Windows PC via Task Scheduler (suggested: 7:00 AM).

**What it does:**
1. Calls API-Football free tier to fetch previous day's match results (fixtures, events).
2. Parses goals (normal + own goals), cards (yellow, second yellow, straight red). Excludes penalty shootout events.
3. Writes match results and events to the Google Sheet (`Matches` and `MatchEvents` tabs) via the Google Sheets API.
4. Reads all data from the sheet (players, allocations, preferences, events).
5. Runs the scoring engine — calculates points per player based on all the game rules.
6. Writes the updated leaderboard to the `Leaderboard` tab.
7. Optionally pushes a JSON snapshot to the `worldcup-sweepstake-data` GitHub repo for backup.

**Authentication:** Uses a Google Cloud service account with a JSON key file stored locally on the admin's PC. This key never appears in any public code or repo.

**API-Football free tier usage:** ~3-5 API calls per run (fixtures, events). Well within the 100 requests/day free limit.

### 9.7 Data Flow Diagram

```
┌─────────────┐     GET/POST      ┌──────────────────┐    read/write    ┌──────────────┐
│  React App  │ ─────────────────→ │ Google Apps Script│ ──────────────→ │ Google Sheet │
│ (GitHub     │ ←───────────────── │ (web app endpoint)│ ←────────────── │ (all data)   │
│  Pages)     │     JSON response  └──────────────────┘                  └──────────────┘
└─────────────┘                                                                 ↑
                                                                                │
                                                                          write results
                                                                                │
                                                                    ┌───────────────────┐
                                                                    │ Python Script      │
                                                                    │ (Windows PC, daily)│
                                                                    │                    │
                                                                    │ ← API-Football     │
                                                                    └───────────────────┘
```

---

## 10. User Interface Views

### 10.1 Public Views (no login required)

- **Leaderboard** — ranked list of all players with total points, expandable for team breakdown.
- **Match Results** — recent match results with scores.
- **Phase Banner** — current phase, countdown to next deadline, status messages.

### 10.2 Player Views (PIN required, only during open phases)

- **Registration Form** — name + PIN + registration code (Phase 1 only).
- **Group Stage Preferences** — view allocated teams, select captains, choose Tier 2 mechanism (Phase 2 only).
- **Knockout Preferences** — view available teams with prices, spend budget, select captain (Phase 4 only).
- **Confirmation Screen** — summary of submitted preferences before final lock-in.

---

## 11. Confirmed Decisions

All decisions have been confirmed by the organiser:

| Item | Decision |
|------|----------|
| Tier splits | Admin decides and enters manually in the Google Sheet. Number of teams per tier is flexible. |
| Knockout auction budget | **1,000 coins** per player (same for everyone). |
| Knockout team pricing | Admin prices each of the 16 teams **manually** in the Google Sheet after the group stage. |
| Captain & Tier 2 selection deadline | **1 hour before the first match** of each phase. Configured via phase dates in the Config sheet. |
| Tiebreaker | **Manual** — admin will decide if and when it happens. No automated tiebreaker logic required. |
| Registration code | Set once by admin in the Config sheet. **Fixed for the duration** — does not change between phases. |
| Phase dates | **All six phase dates set upfront** in the Config sheet before the tournament starts. |
| Captain squad data | Admin **manually enters squad lists** in the Google Sheet. The React app reads these to populate captain selection dropdowns. |
| Google Sheet sharing | **Unlisted** — the React app accesses data via the Google Apps Script endpoint, not the sheet URL directly. Only the admin needs the sheet link. |
