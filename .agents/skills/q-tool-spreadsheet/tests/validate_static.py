#!/usr/bin/env python3
"""Static acceptance checks for q-tool-spreadsheet."""

from __future__ import annotations

import ast
import json
import os
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]

REQUIRED_FILES = {
    "SKILL.md",
    "agents/openai.yaml",
    "references/integration-contract.md",
    "references/node.md",
    "references/operations.md",
    "references/python.md",
    "references/runtime-routing.md",
    "references/spreadsheet-request.schema.yaml",
    "references/spreadsheet-result.schema.yaml",
    "scripts/spreadsheet",
    "scripts/spreadsheet.ps1",
    "scripts/node/package.json",
    "scripts/node/spreadsheet-tool.mjs",
    "scripts/python/pyproject.toml",
    "scripts/python/spreadsheet_tool.py",
    "tests/run_tests.py",
    "tests/trigger-cases.json",
    "tests/validate_static.py",
}


def which(name: str) -> str | None:
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(directory) / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def main() -> int:
    errors: list[str] = []
    actual = {
        str(path.relative_to(SKILL)).replace(os.sep, "/")
        for path in SKILL.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts
    }
    missing = sorted(REQUIRED_FILES - actual)
    if missing:
        errors.append("missing skill files: %s" % missing)

    skill_text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    if not skill_text.startswith("---\nname: q-tool-spreadsheet\n"):
        errors.append("SKILL.md identity is invalid")
    for phrase in (
        "Quasar",
        "q-core-contract",
        "--skill q-core-contract --skill q-tool-spreadsheet",
        "Never install a runtime or dependency",
        "creation_mode: derived",
        "semantic_authority: none",
        "input and output must be distinct",
        "spreadsheet-validation-needs-pdf-structure-or-rendered-page-inspection",
        "use-a-separately-verified-local-renderer-or-report-the-spreadsheet-visual-validation-gap",
        "route presentations to `q-report-deck`",
    ):
        if phrase not in skill_text:
            errors.append("SKILL.md is missing contract phrase %r" % phrase)

    interface = (SKILL / "agents" / "openai.yaml").read_text(encoding="utf-8")
    if "$q-tool-spreadsheet" not in interface:
        errors.append("agents/openai.yaml must mention $q-tool-spreadsheet")

    python_path = SKILL / "scripts" / "python" / "spreadsheet_tool.py"
    try:
        ast.parse(python_path.read_text(encoding="utf-8"), filename=str(python_path))
    except SyntaxError as exc:
        errors.append("Python syntax error: %s" % exc)

    node_path = SKILL / "scripts" / "node" / "spreadsheet-tool.mjs"
    node_source = node_path.read_text(encoding="utf-8")
    for command in ("doctor", "check", "inspect", "convert", "recalculate", "render"):
        if command not in node_source or command not in python_path.read_text(encoding="utf-8"):
            errors.append("both backends must expose command %r" % command)

    package = json.loads((SKILL / "scripts" / "node" / "package.json").read_text(encoding="utf-8"))
    if package.get("dependencies") != {"exceljs": "4.4.0"}:
        errors.append("Node backend must pin exactly exceljs 4.4.0")
    if package.get("overrides") != {"uuid": "11.1.1"}:
        errors.append("Node backend must override uuid to exactly 11.1.1")
    if package.get("engines", {}).get("node") != ">=18":
        errors.append("Node engine boundary must remain >=18")
    pyproject = (SKILL / "scripts" / "python" / "pyproject.toml").read_text(encoding="utf-8")
    if '"openpyxl>=3.1.5,<4"' not in pyproject or 'requires-python = ">=3.10"' not in pyproject:
        errors.append("Python backend dependency boundary is invalid")

    triggers = json.loads((SKILL / "tests" / "trigger-cases.json").read_text(encoding="utf-8"))
    if len(triggers.get("positive", [])) < 2 or len(triggers.get("negative", [])) < 2:
        errors.append("trigger cases require at least two positive and two negative prompts")
    if not any(case.get("owner") == "q-report-deck" for case in triggers.get("negative", []) if isinstance(case, dict)):
        errors.append("trigger cases must preserve the PowerPoint boundary")

    combined = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in SKILL.rglob("*")
        if path.is_file()
        and "__pycache__" not in path.parts
        and path.resolve() != Path(__file__).resolve()
    )
    for forbidden in (
        "Anthropic, PBC. All rights reserved",
        "RecalculateAndSave",
        "lo_socket_shim",
        "allowed-tools: Read Write Edit Bash Grep Glob",
    ):
        if forbidden in combined:
            errors.append("restricted or superseded staging material entered the skill: %r" % forbidden)

    node = which("node")
    if node:
        checked = subprocess.run(
            [node, "--check", str(node_path)], text=True, capture_output=True,
            check=False, timeout=15
        )
        if checked.returncode != 0:
            errors.append("Node syntax check failed: %s" % checked.stderr.strip())

    bash = which("bash")
    if bash:
        checked = subprocess.run(
            [bash, "-n", str(SKILL / "scripts" / "spreadsheet")],
            text=True, capture_output=True, check=False, timeout=15
        )
        if checked.returncode != 0:
            errors.append("dispatcher syntax check failed: %s" % checked.stderr.strip())

    if errors:
        print("q-tool-spreadsheet static validation failed:", file=sys.stderr)
        for error in errors:
            print("- %s" % error, file=sys.stderr)
        return 1
    print("q-tool-spreadsheet static validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
