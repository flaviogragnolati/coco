#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${1:-$(mktemp -d)}"
PYTHON_BIN="${PDF_SKILL_PYTHON:-python3}"
mkdir -p "$WORK"

PYTHONDONTWRITEBYTECODE=1 "$PYTHON_BIN" "$SKILL_DIR/tests/make_fixtures.py" "$WORK/fixtures" >/dev/null
PDF="$SKILL_DIR/scripts/pdf"
SOURCE_HASH="$(sha256sum "$WORK/fixtures/basic.pdf" | awk '{print $1}')"

"$PDF" --runtime python --quiet --json inspect "$WORK/fixtures/basic.pdf" > "$WORK/inspect.json"
"$PDF" --runtime python --quiet extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/basic.txt" --layout
"$PDF" --runtime python --quiet merge --output "$WORK/merged.pdf" "$WORK/fixtures/basic.pdf" "$WORK/fixtures/basic.pdf"
"$PDF" --runtime python --quiet select "$WORK/fixtures/basic.pdf" --pages 3,1,1 --output "$WORK/selected.pdf"
"$PDF" --runtime python --quiet select "$WORK/fixtures/form.pdf" --pages 1 --output "$WORK/form-selected.pdf"
"$PDF" --runtime python --quiet split "$WORK/fixtures/basic.pdf" --output-dir "$WORK/split" --chunk-size 2
"$PDF" --runtime python --quiet rotate "$WORK/fixtures/basic.pdf" --pages 2 --degrees 90 --output "$WORK/rotated.pdf"
"$PDF" --runtime python --quiet rotate "$WORK/fixtures/form.pdf" --pages 1 --degrees 90 --output "$WORK/form-rotated.pdf"
"$PDF" --runtime python --quiet crop "$WORK/fixtures/basic.pdf" --pages 1 --box 40,40,500,780 --output "$WORK/cropped.pdf"
"$PDF" --runtime python --quiet watermark "$WORK/fixtures/basic.pdf" --stamp "$WORK/fixtures/stamp.pdf" --pages all --output "$WORK/watermarked.pdf"
"$PDF" --runtime python --quiet form-list "$WORK/fixtures/form.pdf" --output "$WORK/fields.json"
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
cat > "$WORK/partial-values.json" <<'JSON'
{
  "fields": {
    "full_name": "Grace Hopper"
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
"$PDF" --runtime python --quiet form-fill "$WORK/fixtures/form.pdf" --values "$WORK/values.json" --output "$WORK/form-filled.pdf"
"$PDF" --runtime python --quiet form-fill "$WORK/fixtures/form.pdf" --values "$WORK/values.json" --output "$WORK/form-flattened.pdf" --flatten
"$PDF" --runtime python --quiet form-fill "$WORK/fixtures/form.pdf" --values "$WORK/partial-values.json" --output "$WORK/form-partial-flattened.pdf" --flatten
"$PDF" --runtime python --quiet render "$WORK/watermarked.pdf" --output-dir "$WORK/rendered" --dpi 96 --pages 1,3
"$PDF" --runtime python --quiet render "$WORK/form-flattened.pdf" --output-dir "$WORK/form-rendered" --dpi 120 --pages 1
"$PDF" --runtime python --quiet extract-tables "$WORK/fixtures/basic.pdf" --pages 2 --output "$WORK/tables.json"
"$PDF" --runtime python --quiet check "$WORK/form-flattened.pdf"

# Safety and argument validation paths.
set +e
"$PDF" --runtime python --quiet extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/basic.txt" --layout >/dev/null 2>&1
EXISTING_OUTPUT_CODE=$?
"$PDF" --runtime python --quiet extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/fixtures/basic.pdf" >/dev/null 2>&1
OVERWRITE_CODE=$?
"$PDF" --runtime python --quiet form-fill "$WORK/fixtures/form.pdf" --values "$WORK/invalid-values.json" --output "$WORK/invalid.pdf" >/dev/null 2>&1
INVALID_OPTION_CODE=$?
"$PDF" --runtime python --quiet select "$WORK/fixtures/form.pdf" --pages even --output "$WORK/even.pdf" >/dev/null 2>&1
EMPTY_SELECTION_CODE=$?
"$PDF" --runtime python --quiet split "$WORK/fixtures/basic.pdf" --output-dir "$WORK/split" --chunk-size 1 >/dev/null 2>&1
NONEMPTY_DIR_CODE=$?
set -e
[[ $EXISTING_OUTPUT_CODE -eq 2 ]]
[[ $OVERWRITE_CODE -eq 2 ]]
[[ $INVALID_OPTION_CODE -eq 2 ]]
[[ $EMPTY_SELECTION_CODE -eq 2 ]]
[[ $NONEMPTY_DIR_CODE -eq 2 ]]
[[ ! -e "$WORK/invalid.pdf" ]]
[[ ! -e "$WORK/even.pdf" ]]
[[ "$(sha256sum "$WORK/fixtures/basic.pdf" | awk '{print $1}')" == "$SOURCE_HASH" ]]
"$PDF" --runtime python --quiet --overwrite extract-text "$WORK/fixtures/basic.pdf" --output "$WORK/basic.txt" --layout

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
assert PdfReader(work / "form-selected.pdf").get_fields()
assert PdfReader(work / "form-rotated.pdf").get_fields()

fields_payload = json.loads((work / "fields.json").read_text())
field_map = {item["name"]: item for item in fields_payload["fields"]}
assert {"Engineer", "Researcher"}.issubset(set(field_map["role"]["options"]))
assert {"Argentina", "Chile", "Uruguay"}.issubset(set(field_map["country"]["options"]))

filled = PdfReader(work / "form-filled.pdf")
assert str(filled.get_fields()["full_name"]["/V"]) == "Ada Lovelace"
assert str(filled.get_fields()["country"]["/V"]) == "Uruguay"
radio_widgets = [ref.get_object() for ref in filled.pages[0].get("/Annots", [])[2:4]]
assert any(str(widget.get("/AS")) == "/Researcher" for widget in radio_widgets)

for name in ["form-flattened.pdf", "form-partial-flattened.pdf"]:
    flat = PdfReader(work / name)
    root = flat.trailer["/Root"]
    assert "/AcroForm" not in root
    for page in flat.pages:
        for ref in page.get("/Annots", []):
            assert str(ref.get_object().get("/Subtype")) != "/Widget"

assert json.loads((work / "tables.json").read_text())["table_count"] >= 1
assert json.loads((work / "split/manifest.json").read_text())["ok"] is True
assert json.loads((work / "rendered/manifest.json").read_text())["ok"] is True
assert (work / "rendered/page-0001.png").is_file()
assert (work / "rendered/page-0003.png").is_file()
assert (work / "form-rendered/page-0001.png").is_file()
image = Image.open(work / "form-rendered/page-0001.png").convert("RGB")
scale = 120 / 72
page_height = 841.8898
engineer = image.getpixel((round(160 * scale), round((page_height - 616.8898) * scale)))
researcher = image.getpixel((round(260 * scale), round((page_height - 616.8898) * scale)))
assert sum(researcher) + 200 < sum(engineer), (engineer, researcher)
print(f"Python smoke test passed: {work}")
PY
