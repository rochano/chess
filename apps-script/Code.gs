// Google Apps Script that receives finished games from the chess page
// and appends one row per game to a "Scores" tab.
// Setup: Extensions > Apps Script in your Google Sheet, paste this file,
// then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).

const HEADERS = ["Finished at", "White", "Black", "Opponent", "Winner", "Result", "Reason", "Moves", "Clock", "Minutes"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Scores") || ss.insertSheet("Scores");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      new Date(d.finishedAt), clean(d.white), clean(d.black), clean(d.opponent), clean(d.winner),
      clean(d.result), clean(d.reason), Number(d.moves) || 0, clean(d.clock), Number(d.minutes) || 0,
    ]);
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

// Keep cells as plain text so a name like "=SUM(...)" is not run as a formula.
function clean(v) {
  const s = String(v == null ? "" : v).slice(0, 60);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
