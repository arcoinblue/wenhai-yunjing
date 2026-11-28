#!/bin/bash
# Install the Tangut schemas into Squirrel (鼠鬚管, the Rime input method for macOS).
# Double-click this file, or run:  bash install-mac.command
set -e
cd "$(dirname "$0")"

RIME="$HOME/Library/Rime"
SQUIRREL="/Library/Input Methods/Squirrel.app"
SCHEMAS="tangut_downes tangut_downes_reduced tangut_ghc"

if [ ! -d "$SQUIRREL" ]; then
  echo "Squirrel is not installed. Install it first from https://rime.im (or: brew install --cask squirrel-app),"
  echo "add it in System Settings → Keyboard → Input Sources, then run this again."
  exit 1
fi

echo "Copying schemas to $RIME"
mkdir -p "$RIME/lua"
cp rime/*.yaml rime/*.txt "$RIME/"
cp rime/lua/*.lua "$RIME/lua/"

if ls fonts/*.ttf >/dev/null 2>&1; then
  echo "Installing the Tangut font to ~/Library/Fonts"
  mkdir -p "$HOME/Library/Fonts"
  cp fonts/*.ttf "$HOME/Library/Fonts/"
fi

# Add the schemas to the schema list in default.custom.yaml, keeping whatever is there.
CUSTOM="$RIME/default.custom.yaml"
if [ ! -f "$CUSTOM" ]; then
  {
    echo "patch:"
    echo '  "schema_list/+":'
    for s in $SCHEMAS; do echo "    - schema: $s"; done
  } > "$CUSTOM"
  echo "Created $CUSTOM"
elif grep -q "tangut_downes" "$CUSTOM"; then
  echo "$CUSTOM already lists the Tangut schemas"
else
  cp "$CUSTOM" "$CUSTOM.bak"
  if grep -Eq '^[[:space:]]*"?schema_list"?[[:space:]]*:[[:space:]]*(#.*)?$' "$CUSTOM"; then
    # append to the end of the existing block-style schema_list
    awk -v schemas="$SCHEMAS" '
      function emit(ind,   n, a, i) { n = split(schemas, a, " "); for (i = 1; i <= n; i++) print ind "- schema: " a[i] }
      function indent(s) { match(s, /^[ \t]*/); return substr(s, 1, RLENGTH) }
      {
        if (state == 1) {
          if ($0 ~ /^[ \t]*-[ \t]/) { ind = indent($0); state = 2; print; next }
          if ($0 ~ /^[ \t]*(#.*)?$/) { print; next }
          emit(base "  "); state = 3
        } else if (state == 2) {
          if ($0 ~ /^[ \t]*(#.*)?$/ || length(indent($0)) > length(ind) || ($0 ~ /^[ \t]*-[ \t]/ && indent($0) == ind)) { print; next }
          emit(ind); state = 3
        }
        if (state == 0 && $0 ~ /^[ \t]*"?schema_list"?[ \t]*:[ \t]*(#.*)?$/) { base = indent($0); state = 1 }
        print
      }
      END { if (state == 2) emit(ind); else if (state == 1) emit(base "  ") }
    ' "$CUSTOM.bak" > "$CUSTOM"
  elif grep -q '^patch:' "$CUSTOM"; then
    awk -v schemas="$SCHEMAS" '
      { print }
      /^patch:/ && !done { print "  \"schema_list/+\":"; n = split(schemas, a, " "); for (i = 1; i <= n; i++) print "    - schema: " a[i]; done = 1 }
    ' "$CUSTOM.bak" > "$CUSTOM"
  else
    {
      cat "$CUSTOM.bak"
      echo "patch:"
      echo '  "schema_list/+":'
      for s in $SCHEMAS; do echo "    - schema: $s"; done
    } > "$CUSTOM"
  fi
  echo "Added the Tangut schemas to $CUSTOM (old file kept as default.custom.yaml.bak)"
fi

echo "Deploying (this can take a minute the first time)…"
"$SQUIRREL/Contents/MacOS/Squirrel" --reload || true
echo
echo "Done. Switch to Squirrel, press Control+\` (or F4) and choose 西夏 Downes, 西夏 Downes 寬 or 西夏 GHC."
