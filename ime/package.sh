#!/bin/bash
# Rebuild the schemas from data/tangut.json and make dist/rime-tangut-<version>.zip
# (needs python3 with fonttools + brotli to turn the site's woff2 font into a desktop .ttf)
set -e
cd "$(dirname "$0")"
python3 build.py
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('../fonts/NotoSerifTangut.woff2'); f.flavor = None; f.save('fonts/NotoSerifTangut-Regular.ttf')"
V=$(sed -n "s/^VERSION = '\(.*\)'/\1/p" build.py)
rm -rf dist && mkdir -p dist/rime-tangut
cp -r rime fonts README.md install-mac.command install-windows.bat install-windows.ps1 dist/rime-tangut/
chmod +x dist/rime-tangut/install-mac.command
(cd dist && zip -qr "rime-tangut-$V.zip" rime-tangut)
echo "dist/rime-tangut-$V.zip"
