// Google Apps Script that receives finished games from the chess page
// and appends one row per game to a "Scores" tab.
// Setup: paste this file into Apps Script, then Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Open the web app URL in a browser
// to check it: it shows a link to the sheet the scores go to.

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

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    getScores().appendRow([
      new Date(d.finishedAt), clean(d.white), clean(d.black), clean(d.opponent), clean(d.winner),
      clean(d.result), clean(d.reason), Number(d.moves) || 0, clean(d.clock), Number(d.minutes) || 0,
    ]);
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const sheet = getScores();
  // ?action=rows returns recent games as JSON for the leaderboard in the game.
  if (e && e.parameter && e.parameter.action === "rows") {
    const last = sheet.getLastRow(), start = Math.max(2, last - 4999);
    const vals = last >= 2 ? sheet.getRange(start, 1, last - start + 1, 6).getValues() : [];
    const rows = vals.map(r => ({
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      white: String(r[1]), black: String(r[2]), opponent: String(r[3]), winner: String(r[4]), result: String(r[5]),
    }));
    return ContentService.createTextOutput(JSON.stringify({ rows: rows })).setMimeType(ContentService.MimeType.JSON);
  }
  const url = sheet.getParent().getUrl();
  return HtmlService.createHtmlOutput(
    '<p style="font:16px sans-serif">Score sheet is ready. Games recorded: ' + Math.max(0, sheet.getLastRow() - 1) +
    '</p><p style="font:16px sans-serif"><a target="_blank" href="' + url + '">Open the score sheet</a></p>'
  );
}

// Keep cells as plain text so a name like "=SUM(...)" is not run as a formula.
function clean(v) {
  const s = String(v == null ? "" : v).slice(0, 60);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
