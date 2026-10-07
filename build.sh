#!/bin/sh
# Builds the deployable files (index.html, app.js, platform.js) from src/.
# Run from the repository root:  sh build.sh
set -e
cd "$(dirname "$0")"
HASHES=$(tr -d '\n' < src/seat-hashes.json)
sed "s|__SEAT_HASHES__|$HASHES|" src/platform-firebase.js > platform.js
cat src/icons.js src/part2-core.js src/part3-app.js src/part4-team.js src/part5-abwork.js > app.js
{
 sed 's|<link rel="stylesheet" href="https://fonts.googleapis.com|<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="https://fonts.googleapis.com|' src/part1-head.html
 echo '<div id="app"></div>'
 for f in preact.umd.js hooks.umd.js htm.umd.js firebase-app-compat.js firebase-auth-compat.js firebase-firestore-compat.js; do echo "<script src=\"vendor/$f\"></script>"; done
 echo "<script src=\"platform.js?v=$(date +%s)\"></script>"
 echo "<script src=\"app.js?v=$(date +%s)\"></script>"
} > index.body
{ echo '<!doctype html><html lang="ko"><head>'; sed -n '1,/<\/style>/p' index.body; echo '</head><body>'; sed '1,/<\/style>/d' index.body; echo '</body></html>'; } > index.html
rm index.body
echo built
