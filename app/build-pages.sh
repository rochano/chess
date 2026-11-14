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
touch app/site/.nojekyll
echo "site ready: $(du -sh app/site | cut -f1)"
