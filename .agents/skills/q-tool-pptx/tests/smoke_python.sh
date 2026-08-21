#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$SKILL_DIR/scripts/python/pptx_tool.py"
WORK="${1:-$(mktemp -d)}"
PYTHON_BIN="${PPTX_SKILL_PYTHON:-python3}"
mkdir -p "$WORK/fixtures"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" "$SKILL_DIR/tests/make_fixtures.py" "$WORK/fixtures" >/dev/null
DECK="$WORK/fixtures/deck.pptx"

run() { PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" "$BACKEND" "$@"; }
assert_json() { PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" -c "import json,sys; d=json.load(sys.stdin); $1"; }

# doctor reports readiness without touching inputs.
run --json doctor | assert_json 'assert d["ok"] and d["details"]["modules"]["pptx"]'

# inspect sees the fixture's structure.
run --quiet --json inspect "$DECK" | assert_json '
assert d["details"]["slide_count"] == 4
assert d["details"]["slide_width_in"] == 10.0
assert d["details"]["slides"][1]["has_notes"]'

# extract-text captures body text, tables, and notes.
run --quiet extract-text "$DECK" --output "$WORK/text.md" --with-notes
grep -q "FIXTURE-TOKEN" "$WORK/text.md"
grep -q "| Latency | 42 | ms |" "$WORK/text.md"
grep -q "Notes: Speaker notes for slide two" "$WORK/text.md"

# extract-notes finds exactly one slide with notes.
run --quiet --json extract-notes "$DECK" --output "$WORK/notes.md" \
  | assert_json 'assert d["details"]["slides_with_notes"] == 1'

# extract-media exports the generated picture with a manifest.
run --quiet --json extract-media "$DECK" --output-dir "$WORK/media" \
  | assert_json 'assert d["details"]["media_count"] >= 1'
[[ -f "$WORK/media/manifest.json" ]]

# select keeps order and survives reopening; check validates the result.
run --quiet --json select "$DECK" --slides 2,1 --output "$WORK/subset.pptx" \
  | assert_json 'assert d["details"]["kept_order"] == [2, 1]'
run --quiet --json inspect "$WORK/subset.pptx" | assert_json '
assert d["details"]["slide_count"] == 2
assert d["details"]["slides"][0]["title"] == "Agenda"'
run --quiet check "$WORK/subset.pptx"

# select refuses duplication with the unsupported-capability code.
set +e
run --quiet select "$DECK" --slides 1,1 --output "$WORK/never.pptx" >/dev/null 2>&1
DUP_CODE=$?
set -e
[[ $DUP_CODE -eq 5 ]]

# replace-text preserves runs, counts hits, and warns on misses.
run --quiet --json replace-text "$DECK" --map "$WORK/fixtures/replacements.json" --output "$WORK/replaced.pptx" \
  | assert_json '
assert d["details"]["replacements"]["FIXTURE-TOKEN"] == 1
assert any("not-in-deck" in w for w in d["warnings"])'
run --quiet --json replace-text "$DECK" --map "$WORK/fixtures/replacements.json" --output "$WORK/fragmented.pptx" \
  | assert_json 'assert any("FRAGMENTED" in w and "multiple runs" in w for w in d["warnings"])'
run --quiet extract-text "$WORK/replaced.pptx" --output "$WORK/replaced.md"
grep -q "REPLACED-TOKEN" "$WORK/replaced.md"
run --quiet check "$WORK/replaced.pptx"

# Existing outputs are refused without --overwrite.
set +e
run --quiet extract-text "$DECK" --output "$WORK/text.md" >/dev/null 2>&1
OVERWRITE_CODE=$?
set -e
[[ $OVERWRITE_CODE -eq 6 ]]
run --quiet --overwrite extract-text "$DECK" --output "$WORK/text.md"

# --overwrite never authorizes replacing an input.
cp "$DECK" "$WORK/collision.pptx"
COLLISION_HASH_BEFORE="$(sha256sum "$WORK/collision.pptx" | cut -d' ' -f1)"
set +e
run --quiet --overwrite replace-text "$WORK/collision.pptx" --map "$WORK/fixtures/replacements.json" \
  --output "$WORK/collision.pptx" >/dev/null 2>&1
COLLISION_CODE=$?
set -e
[[ $COLLISION_CODE -eq 6 ]]
[[ "$COLLISION_HASH_BEFORE" == "$(sha256sum "$WORK/collision.pptx" | cut -d' ' -f1)" ]]

MAP_HASH_BEFORE="$(sha256sum "$WORK/fixtures/replacements.json" | cut -d' ' -f1)"
set +e
run --quiet --overwrite replace-text "$DECK" --map "$WORK/fixtures/replacements.json" \
  --output "$WORK/fixtures/replacements.json" >/dev/null 2>&1
MAP_COLLISION_CODE=$?
set -e
[[ $MAP_COLLISION_CODE -eq 6 ]]
[[ "$MAP_HASH_BEFORE" == "$(sha256sum "$WORK/fixtures/replacements.json" | cut -d' ' -f1)" ]]

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

# Invalid slide specifications fail fast.
set +e
run --quiet extract-text "$DECK" --output "$WORK/never.md" --slides 9 >/dev/null 2>&1
SPEC_CODE=$?
set -e
[[ $SPEC_CODE -eq 2 ]]

set +e
run --quiet render "$DECK" --output-dir "$WORK/never-render" --dpi 0 >/dev/null 2>&1
DPI_CODE=$?
set -e
[[ $DPI_CODE -eq 2 ]]

# Rendering commands run only when the native tools exist.
if command -v soffice >/dev/null 2>&1 && command -v pdftoppm >/dev/null 2>&1; then
  run --quiet --json render "$DECK" --output-dir "$WORK/render" --dpi 90 --slides 1,3 \
    | assert_json 'assert d["details"]["slides_rendered"] == [1, 3] and len(d["outputs"]) == 2'
  [[ -f "$WORK/render/manifest.json" ]]
  run --quiet --json contact-sheet "$DECK" --output "$WORK/sheet.png" \
    | assert_json 'assert d["ok"] and d["details"]["slide_count"] == 4'
fi

echo "Python smoke test passed: $WORK"
