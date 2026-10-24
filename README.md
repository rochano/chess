# Chess Game

A playable chess game in a single HTML page: two players on one device, two players on separate devices (online room code), or against the computer, with a training room, a tutorial, a leaderboard, clocks, hints, undo and full rules (castling, en passant, promotion, stalemate and draw rules).

Play it at https://rochano.github.io/chess/

© 2026 Rochanapan. All rights reserved. See [LICENSE](LICENSE). The game only runs on its official site; a saved or copied page shows a link back to it.

## Saving scores to Google Sheets

1. Create a Google Sheet, then open Extensions > Apps Script.
2. Replace the code with [`apps-script/Code.gs`](apps-script/Code.gs) and save.
3. Deploy > New deployment > type Web app. Execute as: Me. Who has access: Anyone. Deploy and copy the web app URL.
4. Put that URL in `SHEET_URL` near the top of the script in `index.html`.

Every finished game then adds a row to the sheet's Scores tab.

## Leaderboard

The Leaderboard's "Everyone" tab reads the Scores tab through the same web app (`?action=rows`). After updating `Code.gs`, publish it as a new version so the existing URL keeps working: Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy.

## Online play

Online games connect the two devices directly with [PeerJS](https://peerjs.com/) (WebRTC) and its free public signalling server. The host creates a room and shares the code or link; the host plays White.

## Credits

Music uses orchestral samples from the FluidR3 GM soundfont by Frank Wen (CC BY 3.0), taken from [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) by Benjamin Gleitzman. A sparse set of notes per instrument is stored in `sounds/`.
