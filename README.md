# Chess Game

A playable chess game in a single HTML page: two players on one device or against the computer, with clocks, hints, undo and full rules (castling, en passant, promotion, stalemate and draw rules).

Play it at https://rochano.github.io/chess/

## Saving scores to Google Sheets

1. Create a Google Sheet, then open Extensions > Apps Script.
2. Replace the code with [`apps-script/Code.gs`](apps-script/Code.gs) and save.
3. Deploy > New deployment > type Web app. Execute as: Me. Who has access: Anyone. Deploy and copy the web app URL.
4. Put that URL in `SHEET_URL` near the top of the script in `index.html`.

Every finished game then adds a row to the sheet's Scores tab.
