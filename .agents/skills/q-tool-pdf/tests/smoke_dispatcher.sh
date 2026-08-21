#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PDF="$SKILL_DIR/scripts/pdf"
WORK="${1:-$(mktemp -d)}"
PYTHON_BIN="${PDF_SKILL_PYTHON:-python3}"
mkdir -p "$WORK/fixtures" "$WORK/node-project"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" "$SKILL_DIR/tests/make_fixtures.py" "$WORK/fixtures" >/dev/null

# Global-only invocation resolves a healthy backend and shows backend help.
"$PDF" --quiet > "$WORK/help.txt"
grep -q "Python PDF backend for q-tool-pdf\|Usage: pdf-tool" "$WORK/help.txt"

cat > "$WORK/node-project/package.json" <<'JSON'
{"private":true}
JSON

# A nearest-project marker is a preference, not proof of a healthy backend.
# Make the marked runtime deterministically unavailable and verify Python fallback.
FALLBACK="$({
  cd "$WORK/node-project"
  PDF_SKILL_NODE=/definitely/missing "$PDF" --quiet --json inspect "$WORK/fixtures/basic.pdf"
})"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" -c 'import json,sys; data=json.load(sys.stdin); assert data["ok"]; assert data["runtime"] == "python"' <<< "$FALLBACK"

# Disabling fallback must stop at the unavailable marked runtime.
set +e
(
  cd "$WORK/node-project"
  PDF_SKILL_NODE=/definitely/missing PDF_SKILL_NO_FALLBACK=1 \
    "$PDF" --quiet inspect "$WORK/fixtures/basic.pdf" >/dev/null 2>"$WORK/no-fallback.err"
)
NO_FALLBACK_CODE=$?
set -e
[[ $NO_FALLBACK_CODE -eq 4 ]]

# Operation constraints override project markers when fallback is allowed.
TABLE_RESULT="$({
  cd "$WORK/node-project"
  PDF_SKILL_NODE=/definitely/missing "$PDF" --quiet --json extract-tables \
    "$WORK/fixtures/basic.pdf" --pages 2 --output "$WORK/tables.json"
})"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" -c 'import json,sys; data=json.load(sys.stdin); assert data["runtime"] == "python"; assert data["details"]["table_count"] >= 1' <<< "$TABLE_RESULT"

# Explicit incompatible runtimes fail before touching inputs.
set +e
"$PDF" --runtime node --quiet extract-tables missing.pdf --output "$WORK/never.json" >/dev/null 2>&1
EXTRACT_TABLES_CODE=$?
"$PDF" --runtime node --quiet watermark missing.pdf --stamp missing-stamp.pdf --underlay --output "$WORK/never.pdf" >/dev/null 2>&1
UNDERLAY_CODE=$?
"$PDF" --runtime python --quiet form-fill missing.pdf --values missing.json --font=/tmp/missing.ttf --output "$WORK/never-font.pdf" >/dev/null 2>&1
FONT_CODE=$?
set -e
[[ $EXTRACT_TABLES_CODE -eq 5 ]]
[[ $UNDERLAY_CODE -eq 5 ]]
[[ $FONT_CODE -eq 5 ]]

# Native-only Node commands can run without pdf-lib/PDF.js.
if command -v node >/dev/null 2>&1 && command -v pdfimages >/dev/null 2>&1; then
  NODE_RESULT="$($PDF --runtime node --quiet --json extract-images \
    "$WORK/fixtures/basic.pdf" --output-dir "$WORK/node-images")"
  PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" -c 'import json,sys; data=json.load(sys.stdin); assert data["ok"]; assert data["runtime"] == "node"; assert data["backend"] == ["pdfimages"]' <<< "$NODE_RESULT"
fi

echo "Dispatcher smoke test passed: $WORK"
