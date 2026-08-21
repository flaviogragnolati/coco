#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$SKILL_DIR/scripts/node/pptx-tool.mjs"
WORK="${1:-$(mktemp -d)}"
PYTHON_BIN="${PPTX_SKILL_PYTHON:-python3}"
NODE_BIN="${PPTX_SKILL_NODE:-node}"
mkdir -p "$WORK/fixtures"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" "$SKILL_DIR/tests/make_fixtures.py" "$WORK/fixtures" >/dev/null
DECK="$WORK/fixtures/deck.pptx"

run() { "$NODE_BIN" "$BACKEND" "$@"; }
assert_json() { PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" -c "import json,sys; d=json.load(sys.stdin); $1"; }

# doctor reports engine and dependency readiness.
run --json doctor | assert_json '
assert d["ok"] and d["details"]["modules"]["jszip"]
assert d["details"]["python_only_commands"] == ["select", "replace-text", "contact-sheet"]'

# inspect resolves slide order from sldIdLst, size, notes, and media.
run --quiet --json inspect "$DECK" | assert_json '
assert d["details"]["slide_count"] == 4
assert d["details"]["slide_width_in"] == 10
assert d["details"]["slides"][1]["has_notes"]
assert d["details"]["media_count"] >= 1'

# extract-text captures body, table cells, and notes.
run --quiet extract-text "$DECK" --output "$WORK/text.md" --with-notes
grep -q "FIXTURE-TOKEN" "$WORK/text.md"
grep -q "Latency" "$WORK/text.md"
grep -q "Notes: Speaker notes for slide two" "$WORK/text.md"

# extract-notes filters slide-number placeholders out of notes bodies.
run --quiet --json extract-notes "$DECK" --output "$WORK/notes.md" \
  | assert_json 'assert d["details"]["slides_with_notes"] == 1'
grep -q "Speaker notes for slide two" "$WORK/notes.md"

# extract-media exports media with a manifest.
run --quiet --json extract-media "$DECK" --output-dir "$WORK/media" \
  | assert_json 'assert d["details"]["media_count"] >= 1'
[[ -f "$WORK/media/manifest.json" ]]

# check passes on a healthy deck.
run --quiet check "$DECK"

# Python-only commands answer with the unsupported-capability code.
set +e
run --quiet select "$DECK" --slides 1 --output "$WORK/never.pptx" >/dev/null 2>&1
SELECT_CODE=$?
run --quiet replace-text "$DECK" --map missing.json --output "$WORK/never2.pptx" >/dev/null 2>&1
REPLACE_CODE=$?
set -e
[[ $SELECT_CODE -eq 5 ]]
[[ $REPLACE_CODE -eq 5 ]]

# Existing outputs are refused without --overwrite.
set +e
run --quiet extract-text "$DECK" --output "$WORK/text.md" >/dev/null 2>&1
OVERWRITE_CODE=$?
set -e
[[ $OVERWRITE_CODE -eq 6 ]]

# --overwrite never authorizes replacing an input.
cp "$DECK" "$WORK/collision.pptx"
COLLISION_HASH_BEFORE="$(sha256sum "$WORK/collision.pptx" | cut -d' ' -f1)"
set +e
run --quiet --overwrite extract-text "$WORK/collision.pptx" --output "$WORK/collision.pptx" >/dev/null 2>&1
COLLISION_CODE=$?
set -e
[[ $COLLISION_CODE -eq 6 ]]
[[ "$COLLISION_HASH_BEFORE" == "$(sha256sum "$WORK/collision.pptx" | cut -d' ' -f1)" ]]

# Untrusted-package boundaries reject unsafe paths and macro-bearing content.
set +e
run --quiet check "$WORK/fixtures/unsafe-member.pptx" >/dev/null 2>&1
UNSAFE_CODE=$?
run --quiet check "$WORK/fixtures/macro-bearing.pptx" >/dev/null 2>&1
MACRO_CODE=$?
run --quiet check "$WORK/fixtures/protected.pptx" >/dev/null 2>&1
PROTECTED_CODE=$?
run --quiet render "$WORK/fixtures/external-relationship.pptx" --output-dir "$WORK/external-render" >/dev/null 2>&1
EXTERNAL_RENDER_CODE=$?
set -e
[[ $UNSAFE_CODE -eq 3 ]]
[[ $MACRO_CODE -eq 5 ]]
[[ $PROTECTED_CODE -eq 5 ]]
[[ $EXTERNAL_RENDER_CODE -eq 5 ]]

set +e
run --quiet render "$DECK" --output-dir "$WORK/never-render" --dpi 0 >/dev/null 2>&1
DPI_CODE=$?
set -e
[[ $DPI_CODE -eq 2 ]]

# Rendering runs only when the native tools exist.
if command -v soffice >/dev/null 2>&1 && command -v pdftoppm >/dev/null 2>&1; then
  run --quiet --json render "$DECK" --output-dir "$WORK/render" --dpi 90 --slides 2 \
    | assert_json 'assert d["details"]["slides_rendered"] == [2] and len(d["outputs"]) == 1'
  [[ -f "$WORK/render/manifest.json" ]]
fi

echo "Node smoke test passed: $WORK"
