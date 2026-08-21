#!/usr/bin/env python3
"""Cross-runtime smoke tests for q-tool-spreadsheet."""

from __future__ import annotations

import json
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
import warnings
import zipfile
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
PYTHON = os.environ.get("SPREADSHEET_SKILL_PYTHON", sys.executable)
PYTHON_BACKEND = SKILL / "scripts" / "python" / "spreadsheet_tool.py"
NODE_BACKEND = SKILL / "scripts" / "node" / "spreadsheet-tool.mjs"
DISPATCHER = SKILL / "scripts" / "spreadsheet"


def run(arguments: list[str], *, expected: int = 0) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        arguments, text=True, capture_output=True, check=False, timeout=45, env=os.environ.copy()
    )
    if result.returncode != expected:
        raise AssertionError(
            "command %r returned %d, expected %d\nstdout=%s\nstderr=%s"
            % (arguments, result.returncode, expected, result.stdout, result.stderr)
        )
    return result


def payload(result: subprocess.CompletedProcess[str]) -> dict[str, object]:
    return json.loads(result.stdout)


def write_minimal_xlsx(path: Path, formula: str = "A2*2", protected: bool = False) -> None:
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""
    workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets>
</workbook>"""
    workbook_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>"""
    protection = '<sheetProtection sheet="1"/>' if protected else ""
    worksheet = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Value</t></is></c><c r="B1" t="inlineStr"><is><t>Double</t></is></c></row>
    <row r="2"><c r="A2"><v>2</v></c><c r="B2"><f>%s</f><v>4</v></c></row>
  </sheetData>%s
</worksheet>""" % (formula, protection)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        archive.writestr("xl/worksheets/sheet1.xml", worksheet)


def main() -> int:
    node = shutil.which("node")
    if not node:
        print("q-tool-spreadsheet tests: Node is required for dual-runtime package checks", file=sys.stderr)
        return 1
    passed = 0
    gaps: list[str] = []
    with tempfile.TemporaryDirectory(prefix="q-tool-spreadsheet-tests-") as temporary:
        root = Path(temporary)
        workbook = root / "fixture.xlsx"
        write_minimal_xlsx(workbook)

        python_check = payload(run([PYTHON, str(PYTHON_BACKEND), "check", str(workbook), "--json"]))
        node_check = payload(run([node, str(NODE_BACKEND), "check", str(workbook), "--json"]))
        assert python_check["status"] == node_check["status"] == "passed"
        assert python_check["entries"] == node_check["entries"] == 5
        passed += 1

        unsafe = root / "unsafe.xlsx"
        write_minimal_xlsx(unsafe)
        with zipfile.ZipFile(unsafe, "a") as archive:
            archive.writestr("../escape.xml", "bad")
        python_unsafe = run([PYTHON, str(PYTHON_BACKEND), "check", str(unsafe), "--json"], expected=4)
        node_unsafe = run([node, str(NODE_BACKEND), "check", str(unsafe), "--json"], expected=4)
        assert "unsafe ZIP member" in python_unsafe.stdout and "unsafe ZIP member" in node_unsafe.stdout
        passed += 1

        duplicate = root / "duplicate.xlsx"
        write_minimal_xlsx(duplicate)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(duplicate, "a") as archive:
                archive.writestr("xl/workbook.xml", "<workbook/>")
        python_duplicate = run([PYTHON, str(PYTHON_BACKEND), "check", str(duplicate), "--json"], expected=4)
        node_duplicate = run([node, str(NODE_BACKEND), "check", str(duplicate), "--json"], expected=4)
        assert "duplicate ZIP member" in python_duplicate.stdout and "duplicate ZIP member" in node_duplicate.stdout
        passed += 1

        dispatcher_python = payload(run(["bash", str(DISPATCHER), "--runtime", "python", "check", str(workbook), "--json"]))
        dispatcher_node = payload(run(["bash", str(DISPATCHER), "--runtime", "node", "check", str(workbook), "--json"]))
        assert dispatcher_python["runtime"] == "python" and dispatcher_node["runtime"] == "node"
        passed += 1

        python_doctor = payload(run([PYTHON, str(PYTHON_BACKEND), "doctor", "--json"]))
        node_doctor = payload(run([node, str(NODE_BACKEND), "doctor", "--json"]))
        assert python_doctor["installs_dependencies"] is False
        assert node_doctor["installs_dependencies"] is False
        passed += 1

        if python_doctor["openpyxl"]:
            inspected = payload(run([PYTHON, str(PYTHON_BACKEND), "inspect", str(workbook), "--json"]))
            assert inspected["formula_count"] == 1 and inspected["formula_error_count"] == 0
            csv_path = root / "identifiers.csv"
            csv_path.write_text('id,name,value\n001,Ada,"=WEBSERVICE(""https://example.invalid"")"\n', encoding="utf-8")
            python_output = root / "python.xlsx"
            run([PYTHON, str(PYTHON_BACKEND), "convert", str(csv_path), str(python_output), "--json"])
            converted = payload(run([PYTHON, str(PYTHON_BACKEND), "inspect", str(python_output), "--json"]))
            assert python_output.is_file() and converted["formula_count"] == 0
            assert any(cell["value"] == "001" for cell in converted["preview"])
            previous_hash = hashlib.sha256(python_output.read_bytes()).hexdigest()
            refused = payload(run([
                PYTHON, str(PYTHON_BACKEND), "convert", str(csv_path), str(python_output), "--json"
            ], expected=4))
            assert "--overwrite" in refused["blockers"][0]
            assert hashlib.sha256(python_output.read_bytes()).hexdigest() == previous_hash
            passed += 1
        else:
            gaps.append("Python cell operations untested: openpyxl >=3.1.5 is unavailable")

        if node_doctor["exceljs"]:
            inspected = payload(run([node, str(NODE_BACKEND), "inspect", str(workbook), "--json"]))
            assert inspected["formula_count"] == 1 and inspected["formula_error_count"] == 0
            tsv_path = root / "identifiers.tsv"
            tsv_path.write_text('id\tname\tvalue\n001\tAda\t=WEBSERVICE("https://example.invalid")\n', encoding="utf-8")
            node_output = root / "node.xlsx"
            run([node, str(NODE_BACKEND), "convert", str(tsv_path), str(node_output), "--json"])
            converted = payload(run([node, str(NODE_BACKEND), "inspect", str(node_output), "--json"]))
            assert node_output.is_file() and converted["formula_count"] == 0
            assert any(cell["value"] == "001" for cell in converted["preview"])
            previous_hash = hashlib.sha256(node_output.read_bytes()).hexdigest()
            refused = payload(run([
                node, str(NODE_BACKEND), "convert", str(tsv_path), str(node_output), "--json"
            ], expected=4))
            assert "--overwrite" in refused["blockers"][0]
            assert hashlib.sha256(node_output.read_bytes()).hexdigest() == previous_hash
            passed += 1
        else:
            gaps.append("Node cell operations untested: exceljs 4.4.0 is unavailable")

        if python_doctor["openpyxl"] and node_doctor["exceljs"]:
            external = root / "external-formula.xlsx"
            write_minimal_xlsx(external, 'WEBSERVICE("https://example.invalid")')
            python_external = payload(run([PYTHON, str(PYTHON_BACKEND), "inspect", str(external), "--json"]))
            node_external = payload(run([node, str(NODE_BACKEND), "inspect", str(external), "--json"]))
            assert python_external["external_formula_count"] == node_external["external_formula_count"] == 1
            passed += 1

            python_refused = payload(run([
                PYTHON, str(PYTHON_BACKEND), "render", str(external),
                "--output-dir", str(root / "python-external-render"), "--json"
            ], expected=4))
            node_refused = payload(run([
                node, str(NODE_BACKEND), "render", str(external),
                "--output-dir", str(root / "node-external-render"), "--json"
            ], expected=4))
            assert "external data" in python_refused["blockers"][0]
            assert "external data" in node_refused["blockers"][0]
            passed += 1

            protected = root / "protected.xlsx"
            write_minimal_xlsx(protected, protected=True)
            python_protected = payload(run([PYTHON, str(PYTHON_BACKEND), "inspect", str(protected), "--json"]))
            node_protected = payload(run([node, str(NODE_BACKEND), "inspect", str(protected), "--json"]))
            assert python_protected["protected_sheet_count"] == node_protected["protected_sheet_count"] == 1
            python_refused = payload(run([
                PYTHON, str(PYTHON_BACKEND), "render", str(protected),
                "--output-dir", str(root / "python-protected-render"), "--json"
            ], expected=4))
            node_refused = payload(run([
                node, str(NODE_BACKEND), "render", str(protected),
                "--output-dir", str(root / "node-protected-render"), "--json"
            ], expected=4))
            assert "protected workbook" in python_refused["blockers"][0]
            assert "protected workbook" in node_refused["blockers"][0]
            passed += 1

            macro_named = root / "macro-named.xlsm"
            shutil.copy2(workbook, macro_named)
            python_refused = payload(run([
                PYTHON, str(PYTHON_BACKEND), "render", str(macro_named),
                "--output-dir", str(root / "python-macro-render"), "--json"
            ], expected=4))
            node_refused = payload(run([
                node, str(NODE_BACKEND), "render", str(macro_named),
                "--output-dir", str(root / "node-macro-render"), "--json"
            ], expected=4))
            assert "accept .xlsx only" in python_refused["blockers"][0]
            assert "accept .xlsx only" in node_refused["blockers"][0]
            passed += 1

        if not python_doctor["soffice"]:
            if python_doctor["openpyxl"]:
                refused = payload(run([
                    PYTHON, str(PYTHON_BACKEND), "render", str(workbook),
                    "--output-dir", str(root / "rendered"), "--json"
                ], expected=4))
                assert any("LibreOffice" in blocker for blocker in refused["blockers"])
                passed += 1
            gaps.append("calculation and rendered-output behavior untested: LibreOffice is unavailable")

    print("q-tool-spreadsheet tests: %d passed" % passed)
    for gap in gaps:
        print("coverage gap: %s" % gap)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
