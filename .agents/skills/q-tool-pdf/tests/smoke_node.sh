#!/usr/bin/env bash
set -euo pipefail

RUNTIME="${1:-node}"
[[ "$RUNTIME" == "node" ]] || { echo "Only Node is supported: $RUNTIME" >&2; exit 2; }
SKILL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${2:-$(mktemp -d)}"
PYTHON_BIN="${PDF_SKILL_PYTHON:-python3}"
mkdir -p "$WORK"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" "$SKILL_DIR/tests/make_fixtures.py" "$WORK/fixtures" >/dev/null
SOURCE_HASH="$(sha256sum "$WORK/fixtures/basic.pdf" | awk '{print $1}')"

run_node() {
  node "$SKILL_DIR/scripts/node/pdf-tool.mjs" "$@"
}

run_node --quiet --json doctor > "$WORK/doctor.json"
run_node --quiet --json inspect "$WORK/fixtures/basic.pdf" > "$WORK/inspect.json"
run_node --quiet extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/basic.txt" --layout
run_node --quiet merge --output "$WORK/merged.pdf" "$WORK/fixtures/basic.pdf" "$WORK/fixtures/basic.pdf"
run_node --quiet select "$WORK/fixtures/basic.pdf" --pages 3,1,1 --output "$WORK/selected.pdf"
run_node --quiet split "$WORK/fixtures/basic.pdf" --output-dir "$WORK/split" --chunk-size 2
run_node --quiet rotate "$WORK/fixtures/basic.pdf" --pages 2 --degrees 90 --output "$WORK/rotated.pdf"
run_node --quiet crop "$WORK/fixtures/basic.pdf" --pages 1 --box 40,40,500,780 --output "$WORK/cropped.pdf"
run_node --quiet watermark "$WORK/fixtures/basic.pdf" --stamp "$WORK/fixtures/stamp.pdf" --output "$WORK/watermarked.pdf"
run_node --quiet form-list "$WORK/fixtures/form.pdf" --output "$WORK/fields.json"
cat > "$WORK/values.json" <<'JSON'
{
  "fields": {
    "full_name": "Ada Lovelace",
    "accept_terms": true,
    "role": "Researcher",
    "country": "Uruguay"
  }
}
JSON
cat > "$WORK/invalid-values.json" <<'JSON'
{
  "fields": {
    "role": "Unknown role"
  }
}
JSON
run_node --quiet form-fill "$WORK/fixtures/form.pdf" --values "$WORK/values.json" --output "$WORK/form-filled.pdf"
run_node --quiet form-fill "$WORK/fixtures/form.pdf" --values "$WORK/values.json" --output "$WORK/form-flattened.pdf" --flatten
if command -v pdftoppm >/dev/null 2>&1; then
  run_node --quiet render "$WORK/watermarked.pdf" --output-dir "$WORK/rendered" --dpi 96 --pages 1,3
  run_node --quiet render "$WORK/form-flattened.pdf" --output-dir "$WORK/form-rendered" --dpi 120 --pages 1
fi
run_node --quiet check "$WORK/form-flattened.pdf"

# Safety, operation-boundary, and argument-validation paths.
set +e
run_node --quiet extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/basic.txt" --layout >/dev/null 2>&1
EXISTING_OUTPUT_CODE=$?
run_node --quiet extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/fixtures/basic.pdf" >/dev/null 2>&1
OVERWRITE_CODE=$?
run_node --quiet form-fill "$WORK/fixtures/form.pdf" --values "$WORK/invalid-values.json" --output "$WORK/invalid.pdf" >/dev/null 2>&1
INVALID_OPTION_CODE=$?
run_node --quiet select "$WORK/fixtures/stamp.pdf" --pages even --output "$WORK/even.pdf" >/dev/null 2>&1
EMPTY_SELECTION_CODE=$?
run_node --quiet split "$WORK/fixtures/basic.pdf" --output-dir "$WORK/split" --chunk-size 1 >/dev/null 2>&1
NONEMPTY_DIR_CODE=$?
run_node --quiet select "$WORK/fixtures/form.pdf" --pages 1 --output "$WORK/form-selected.pdf" >/dev/null 2>&1
FORM_PAGE_COPY_CODE=$?
set -e
[[ $EXISTING_OUTPUT_CODE -eq 2 ]]
[[ $OVERWRITE_CODE -eq 2 ]]
[[ $INVALID_OPTION_CODE -eq 2 ]]
[[ $EMPTY_SELECTION_CODE -eq 2 ]]
[[ $NONEMPTY_DIR_CODE -eq 2 ]]
[[ $FORM_PAGE_COPY_CODE -eq 5 ]]
[[ ! -e "$WORK/invalid.pdf" ]]
[[ ! -e "$WORK/even.pdf" ]]
[[ ! -e "$WORK/form-selected.pdf" ]]
[[ "$(sha256sum "$WORK/fixtures/basic.pdf" | awk '{print $1}')" == "$SOURCE_HASH" ]]
run_node --quiet --overwrite extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/basic.txt" --layout

PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" - "$WORK" <<'PY'
from pathlib import Path
from pypdf import PdfReader
from PIL import Image
import json, sys

work = Path(sys.argv[1])
assert len(PdfReader(work / "merged.pdf").pages) == 6
assert len(PdfReader(work / "selected.pdf").pages) == 3
assert int(PdfReader(work / "rotated.pdf").pages[1].get("/Rotate", 0)) % 360 == 90
assert "P3" in (PdfReader(work / "selected.pdf").pages[0].extract_text() or "")

fields_payload = json.loads((work / "fields.json").read_text())
field_map = {item["name"]: item for item in fields_payload["fields"]}
assert {"Engineer", "Researcher"}.issubset(set(field_map["role"]["options"]))
assert {"Argentina", "Chile", "Uruguay"}.issubset(set(field_map["country"]["options"]))

filled = PdfReader(work / "form-filled.pdf")
assert str(filled.get_fields()["full_name"]["/V"]) == "Ada Lovelace"
assert str(filled.get_fields()["country"]["/V"]) == "Uruguay"

flat = PdfReader(work / "form-flattened.pdf")
assert not flat.get_fields()
for page in flat.pages:
    for ref in page.get("/Annots", []):
        assert str(ref.get_object().get("/Subtype")) != "/Widget"

assert json.loads((work / "split/manifest.json").read_text())["ok"] is True
form_render = work / "form-rendered/page-0001.png"
if form_render.is_file():
    assert json.loads((work / "rendered/manifest.json").read_text())["ok"] is True
    assert (work / "rendered/page-0001.png").is_file()
    assert (work / "rendered/page-0003.png").is_file()
    image = Image.open(form_render).convert("RGB")
    scale = 120 / 72
    page_height = 841.8898
    engineer = image.getpixel((round(160 * scale), round((page_height - 616.8898) * scale)))
    researcher = image.getpixel((round(260 * scale), round((page_height - 616.8898) * scale)))
    assert sum(researcher) + 200 < sum(engineer), (engineer, researcher)
print(f"Node smoke test passed for {sys.argv[1]}")
PY
