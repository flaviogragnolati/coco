#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PPTX="$SKILL_DIR/scripts/pptx"
WORK="${1:-$(mktemp -d)}"
PYTHON_BIN="${PPTX_SKILL_PYTHON:-python3}"
mkdir -p "$WORK/fixtures" "$WORK/node-project"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" "$SKILL_DIR/tests/make_fixtures.py" "$WORK/fixtures" >/dev/null
DECK="$WORK/fixtures/deck.pptx"

assert_json() { PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" -c "import json,sys; d=json.load(sys.stdin); $1"; }

# Global-only invocation resolves a healthy backend and shows backend help.
"$PPTX" --quiet > "$WORK/help.txt"
grep -q "pptx-tool" "$WORK/help.txt"

cat > "$WORK/node-project/package.json" <<'JSON'
{"private":true}
JSON

# A nearest-project marker is a preference, not proof of a healthy backend.
# Make Node deterministically unavailable and verify Python fallback.
FALLBACK="$({
  cd "$WORK/node-project"
  PPTX_SKILL_NODE=/definitely/missing "$PPTX" --quiet --json inspect "$DECK"
})"
assert_json 'assert d["ok"] and d["runtime"] == "python"' <<< "$FALLBACK"

# Disabling fallback must stop at the unavailable marked runtime.
set +e
(
  cd "$WORK/node-project"
  PPTX_SKILL_NODE=/definitely/missing PPTX_SKILL_NO_FALLBACK=1 \
    "$PPTX" --quiet inspect "$DECK" >/dev/null 2>"$WORK/no-fallback.err"
)
NO_FALLBACK_CODE=$?
set -e
[[ $NO_FALLBACK_CODE -eq 4 ]]

# Operation constraints override project markers when fallback is allowed.
SELECT_RESULT="$({
  cd "$WORK/node-project"
  PPTX_SKILL_NODE=/definitely/missing "$PPTX" --quiet --json select "$DECK" --slides 2,1 --output "$WORK/subset.pptx"
})"
assert_json 'assert d["runtime"] == "python" and d["details"]["kept_order"] == [2, 1]' <<< "$SELECT_RESULT"

# Explicit incompatible runtimes fail before touching inputs.
set +e
"$PPTX" --runtime node --quiet select missing.pptx --slides 1 --output "$WORK/never.pptx" >/dev/null 2>&1
NODE_SELECT_CODE=$?
"$PPTX" --runtime node --quiet replace-text missing.pptx --map missing.json --output "$WORK/never2.pptx" >/dev/null 2>&1
NODE_REPLACE_CODE=$?
"$PPTX" --runtime unsupported-runtime --quiet doctor >/dev/null 2>&1
INVALID_RUNTIME_CODE=$?
set -e
[[ $NODE_SELECT_CODE -eq 5 ]]
[[ $NODE_REPLACE_CODE -eq 5 ]]
[[ $INVALID_RUNTIME_CODE -eq 2 ]]

# The Node route reports the declared runtime when it is healthy.
if command -v node >/dev/null 2>&1; then
  NODE_RESULT="$("$PPTX" --runtime node --quiet --json inspect "$DECK")"
  assert_json 'assert d["ok"] and d["runtime"] == "node"' <<< "$NODE_RESULT"
fi

echo "Dispatcher smoke test passed: $WORK"
