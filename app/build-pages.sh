#!/usr/bin/env bash
# Builds the site served at https://rochano.github.io/chess/ into app/site:
# the Angular game at the root, the original single-file game at /chess/classic/, and the static SEO files.
set -euo pipefail
cd "$(dirname "$0")"
npx ng build --configuration production,pages
rm -rf site && mkdir -p site/classic
cp -R dist/app/browser/. site/
cd ..
cp about.html llms.txt manifest.webmanifest sitemap.xml app/site/
cp -R img/. app/site/img/
# The original game, kept for a while as a fallback. Its relative links (sounds/, img/, puzzles.json) point back to /chess/.
sed -e 's#<head>#<head>\n<base href="/chess/">\n<meta name="robots" content="noindex">#' \
    -e 's#<link rel="canonical"[^>]*>##' index.html > app/site/classic/index.html
# Old scores (Google Sheet behind the old game), merged into the leaderboard by the app. Keep going if the sheet is down.
SHEET='https://script.google.com/macros/s/AKfycbzR5Edv4-nxiu8JTiFFI6XN2dKPWkdO5pv2VUbx501zWHC3-KgDLwC8R9IN8wdZ8YkfwA/exec'
if curl -fsSL --max-time 60 "$SHEET?action=rows" -o app/site/season1.json && node -e "JSON.parse(require('fs').readFileSync('app/site/season1.json','utf8')).rows.length" ; then
  echo "season1.json: $(node -e "console.log(JSON.parse(require('fs').readFileSync('app/site/season1.json','utf8')).rows.length)") rows"
else
  echo '{"rows":[]}' > app/site/season1.json; echo "season1.json: sheet unavailable, empty"
fi
touch app/site/.nojekyll
echo "site ready: $(du -sh app/site | cut -f1)"
