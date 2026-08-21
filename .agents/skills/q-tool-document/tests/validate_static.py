#!/usr/bin/env python3
"""Static acceptance checks for q-tool-document using the standard library."""

from __future__ import annotations

import ast
import json
import os
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]

REQUIRED_FILES = {
    "SKILL.md",
    "agents/openai.yaml",
    "references/document-request.schema.yaml",
    "references/document-result.schema.yaml",
    "references/integration-contract.md",
    "references/node.md",
    "references/operations.md",
    "references/python.md",
    "references/runtime-routing.md",
    "scripts/document",
    "scripts/document.ps1",
    "scripts/node/document-tool.mjs",
    "scripts/node/package.json",
    "scripts/python/document_tool.py",
    "scripts/python/pyproject.toml",
    "tests/run_tests.py",
    "tests/validate_static.py",
}

COMMANDS = {
    "doctor",
    "inspect",
    "extract-text",
    "create",
    "replace-text",
    "comment",
    "redline",
    "accept-changes",
    "convert",
    "render",
    "check",
}


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
    if not skill_text.startswith("---\nname: q-tool-document\n"):
        errors.append("SKILL.md identity is invalid")
    for phrase in (
        "Quasar",
        "q-core-contract",
        "--skill q-core-contract --skill q-tool-document",
        "The local runtime never installs dependencies",
        "creation_mode: derived",
        "semantic_authority: none",
        "paragraph-mark deletions",
        "document-validation-needs-pdf-structure-or-rendered-page-inspection",
        "use-a-separately-verified-local-renderer-or-report-the-visual-validation-gap",
    ):
        if phrase not in skill_text:
            errors.append("SKILL.md is missing contract phrase %r" % phrase)

    interface = (SKILL / "agents" / "openai.yaml").read_text(encoding="utf-8")
    if "$q-tool-document" not in interface:
        errors.append("agents/openai.yaml must mention $q-tool-document")

    python_path = SKILL / "scripts" / "python" / "document_tool.py"
    python_source = python_path.read_text(encoding="utf-8")
    try:
        ast.parse(python_source, filename=str(python_path))
    except SyntaxError as exc:
        errors.append("Python syntax error: %s" % exc)
    for command in COMMANDS:
        if '"%s"' % command not in python_source:
            errors.append("Python backend does not expose command %r" % command)

    node_path = SKILL / "scripts" / "node" / "document-tool.mjs"
    node_source = node_path.read_text(encoding="utf-8")
    node_commands = set(re.findall(r'command === "([a-z-]+)"', node_source))
    node_commands.update(re.findall(r'\["([a-z-]+)", "[a-z-]+"', node_source))
    for command in COMMANDS:
        if command not in node_source:
            errors.append("Node backend does not expose command %r" % command)
    if 'from "node:zlib"' not in node_source or "built-in ZIP reader/writer" not in node_source:
        errors.append("Node backend must keep its dependency-free ZIP implementation")

    package = json.loads((SKILL / "scripts" / "node" / "package.json").read_text(encoding="utf-8"))
    if package.get("dependencies"):
        errors.append("Node backend must not declare runtime dependencies")
    if package.get("engines", {}).get("node") != ">=18":
        errors.append("Node engine boundary must remain >=18")

    forbidden = [
        path for path in SKILL.rglob("*")
        if path.is_file()
        and (
            path.name == "LICENSE.txt"
            or path.suffix.lower() == ".xsd"
            or "ISO-IEC29500" in str(path)
            or ("Anthropic, PBC." + " All rights reserved") in path.read_text(encoding="utf-8", errors="ignore")
        )
    ]
    if forbidden:
        errors.append("restricted or non-functional source assets entered the skill: %s" % [str(path.relative_to(SKILL)) for path in forbidden])

    node = shutil_which("node")
    if node:
        checked = subprocess.run([node, "--check", str(node_path)], text=True, capture_output=True, check=False, timeout=15)
        if checked.returncode != 0:
            errors.append("Node syntax check failed: %s" % checked.stderr.strip())

    if errors:
        print("q-tool-document static validation failed:", file=sys.stderr)
        for error in errors:
            print("- %s" % error, file=sys.stderr)
        return 1
    print("q-tool-document static validation passed")
    return 0


def shutil_which(name: str) -> str | None:
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(directory) / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


if __name__ == "__main__":
    raise SystemExit(main())
