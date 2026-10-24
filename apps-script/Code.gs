// Google Apps Script that receives finished games from the chess page
// and appends one row per game to a "Scores" tab.
// Setup: paste this file into Apps Script, then Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Open the web app URL in a browser
// to check it: it shows how many games are recorded.

const HEADERS = ["Finished at", "White", "Black", "Opponent", "Winner", "Result", "Reason", "Moves", "Clock", "Minutes"];

// Works both when the script is attached to a sheet (Extensions > Apps Script)
// and when it was created on its own at script.google.com: then it makes a
// "Chess Scores" spreadsheet in your Drive the first time and reuses it.
function getBook() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  const book = SpreadsheetApp.create("Chess Scores");
  props.setProperty("SHEET_ID", book.getId());
  return book;
}

function getScores() {
  const book = getBook();
  const sheet = book.getSheetByName("Scores") || book.insertSheet("Scores");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// The web app URL is public (the game page has to call it), so every row is checked
// before it is written and the number of rows per minute is capped.
const OPPONENTS = ["Computer (Easy)", "Computer (Normal)", "Computer (Hard)", "Online", "Friend"];
const RESULTS = ["1-0", "0-1", "1/2-1/2"];
const MAX_ROWS_PER_MINUTE = 30;

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return reply("bad"); }
  if (!d || OPPONENTS.indexOf(d.opponent) < 0 || RESULTS.indexOf(d.result) < 0) return reply("bad");
  const moves = Math.floor(Number(d.moves)), minutes = Number(d.minutes);
  if (!(moves >= 0 && moves <= 600) || !(minutes >= 0 && minutes <= 600)) return reply("bad");
  const cache = CacheService.getScriptCache(), slot = "n" + Math.floor(Date.now() / 60000);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const n = Number(cache.get(slot) || 0);
    if (n >= MAX_ROWS_PER_MINUTE) return reply("busy");
    cache.put(slot, String(n + 1), 120);
    // Use the server's clock when the game's clock looks wrong.
    let at = new Date(d.finishedAt);
    if (isNaN(at) || Math.abs(at - Date.now()) > 86400000) at = new Date();
    getScores().appendRow([
      at, clean(d.white), clean(d.black), d.opponent, clean(d.winner),
      d.result, clean(d.reason), moves, clean(d.clock), minutes,
    ]);
    cache.remove("rows");
    return reply("ok");
  } finally {
    lock.releaseLock();
  }
}
function reply(text) { return ContentService.createTextOutput(text); }

function doGet(e) {
  const sheet = getScores();
  // ?action=rows returns recent games as JSON for the leaderboard in the game.
  if (e && e.parameter && e.parameter.action === "rows") {
    // Reading the sheet is the slow part, so keep the answer for a minute (cleared on each new game).
    const cache = CacheService.getScriptCache(), hit = cache.get("rows");
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    const last = sheet.getLastRow(), start = Math.max(2, last - 4999);
    const vals = last >= 2 ? sheet.getRange(start, 1, last - start + 1, 6).getValues() : [];
    const rows = vals.map(r => ({
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      white: String(r[1]), black: String(r[2]), opponent: String(r[3]), winner: String(r[4]), result: String(r[5]),
    }));
    const json = JSON.stringify({ rows: rows });
    try { cache.put("rows", json, 60); } catch (err) {} // over 100 KB is not cached
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }
  // Anyone can open this URL, so it does not show where the sheet is.
  return HtmlService.createHtmlOutput(
    '<p style="font:16px sans-serif">Score sheet is ready. Games recorded: ' + Math.max(0, sheet.getLastRow() - 1) + '</p>'
  );
}

// Keep cells as plain text so a name like "=SUM(...)" is not run as a formula.
function clean(v) {
  const s = String(v == null ? "" : v).slice(0, 60);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
