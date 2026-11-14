# Chess Game: Angular version

The game is being rebuilt here as an Angular client with a Firebase backend.
The live game (`../index.html` on GitHub Pages) stays as it is until this version matches it.

| | |
|---|---|
| Client | Angular (standalone components, signals), `src/` |
| Rules + computer player | `src/app/core/engine.ts`, ported 1:1 from the old game; runs in a Web Worker (`cpu.worker.ts`) |
| Languages | `public/i18n/{en,th}.json`, extracted from the old `I18N` table; `I18nService` + `tr` pipe |
| Backend (phase 2) | Firebase Spark (free): Auth + Firestore |
| Preview hosting | Firebase Hosting (`firebase.json`) |

## Phases
0. Project, engine port with parity tests against the old game, playable board (done)
1. Port the full game screen and features
2. Login, scores, leaderboard, Elo, shop on Firestore (replaces Apps Script)
3. Online play through Firestore
4. Switch the live site

## Commands
```
npm ci
npm start                    # http://localhost:4200
npx ng test --watch=false    # includes parity tests that run the old engine from ../index.html
npx ng build                 # dist/app/browser
```

## Live site (phase 4)

`.github/workflows/pages.yml` builds `app/build-pages.sh` on every push to `main` and publishes `app/site` to
https://rochano.github.io/chess/ (needs Settings > Pages > Source = GitHub Actions). The original single-file game
stays in the repo root as `index.html` and is published at `/chess/classic/` as a fallback.
Firestore rules (`firestore.rules`) and Realtime Database rules (`database.rules.json`) are pasted in the Firebase console.
