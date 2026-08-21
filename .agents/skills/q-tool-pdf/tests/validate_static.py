#!/usr/bin/env python3
"""Static package checks for q-tool-pdf using only the Python standard library."""

from __future__ import annotations

import ast
import json
import os
import re
import stat
import sys
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # Python 3.10 support; use a bounded fallback below.
    tomllib = None

SKILL = Path(__file__).resolve().parents[1]


def discover_package_root() -> Path:
    """Find the containing bundle/repository without assuming fixed parent depth."""
    for candidate in (SKILL, *SKILL.parents):
        if (candidate / "skill-manifest.yaml").is_file():
            return candidate
        if (candidate / "integration" / "skills-sh-group.json").is_file():
            return candidate
    return SKILL


PACKAGE = discover_package_root()

REQUIRED_SKILL_FILES = {
    "SKILL.md",
    "agents/openai.yaml",
    "references/forms.md",
    "references/integration-contract.md",
    "references/node.md",
    "references/operations.md",
    "references/pdf-request.schema.yaml",
    "references/pdf-result.schema.yaml",
    "references/python.md",
    "references/runtime-routing.md",
    "references/troubleshooting.md",
    "scripts/pdf",
    "scripts/pdf.ps1",
    "scripts/python/pdf_tool.py",
    "scripts/python/pyproject.toml",
    "scripts/node/pdf-tool.mjs",
    "scripts/node/package.json",
    "tests/make_fixtures.py",
    "tests/smoke_dispatcher.sh",
    "tests/smoke_node.sh",
    "tests/smoke_python.sh",
    "tests/validate_static.py",
}

EXPECTED_COMMANDS = {
    "doctor",
    "inspect",
    "extract-text",
    "merge",
    "select",
    "split",
    "rotate",
    "crop",
    "watermark",
    "form-list",
    "form-fill",
    "render",
    "extract-images",
    "extract-tables",
    "check",
    "repair",
    "linearize",
    "decrypt",
    "encrypt",
    "ocr",
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def parse_frontmatter(path: Path, errors: list[str]) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        fail(errors, f"{path}: missing opening frontmatter")
        return {}
    try:
        end = lines.index("---", 1)
    except ValueError:
        fail(errors, f"{path}: missing closing frontmatter")
        return {}
    data: dict[str, str] = {}
    for line in lines[1:end]:
        match = re.fullmatch(r"([a-z_]+):\s*(.*)", line)
        if not match:
            fail(errors, f"{path}: unsupported frontmatter line: {line!r}")
            continue
        key, raw = match.groups()
        raw = raw.strip()
        if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in {'"', "'"}:
            raw = raw[1:-1]
        data[key] = raw
    return data


def parse_simple_yaml_strings(path: Path, errors: list[str]) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.fullmatch(r"\s{2}([a-z_]+):\s*\"(.*)\"\s*", line)
        if match:
            values[match.group(1)] = match.group(2)
    if not path.read_text(encoding="utf-8").startswith("interface:\n"):
        fail(errors, f"{path}: expected top-level interface mapping")
    return values


def local_link_errors(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")
    for target in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", text):
        target = target.strip().split()[0].strip("<>")
        if target.startswith(("http://", "https://", "mailto:")):
            continue
        file_part = target.partition("#")[0]
        resolved = path if not file_part else (path.parent / file_part).resolve()
        try:
            resolved.relative_to(PACKAGE.resolve())
        except ValueError:
            errors.append(f"{path}: local link escapes package: {target}")
            continue
        if not resolved.exists():
            errors.append(f"{path}: broken local link: {target}")
    return errors


def main() -> int:
    errors: list[str] = []

    actual = {
        str(path.relative_to(SKILL)).replace(os.sep, "/")
        for path in SKILL.rglob("*")
        if path.is_file()
        and "__pycache__" not in path.parts
        and not any(part.endswith(".egg-info") for part in path.parts)
        and "build" not in path.parts
    }
    missing = sorted(REQUIRED_SKILL_FILES - actual)
    if missing:
        fail(errors, f"missing skill files: {missing}")

    metadata = parse_frontmatter(SKILL / "SKILL.md", errors)
    if set(metadata) != {"name", "description"}:
        fail(errors, f"SKILL.md frontmatter keys must be name and description; got {sorted(metadata)}")
    if metadata.get("name") != "q-tool-pdf":
        fail(errors, f"unexpected skill name: {metadata.get('name')!r}")
    description = metadata.get("description", "")
    if not 1 <= len(description) <= 1024:
        fail(errors, f"description length must be 1-1024; got {len(description)}")
    if "Quasar" not in description:
        fail(errors, "public skill description must name Quasar")

    interface = parse_simple_yaml_strings(SKILL / "agents/openai.yaml", errors)
    for key in ("display_name", "short_description", "default_prompt"):
        if not interface.get(key):
            fail(errors, f"agents/openai.yaml missing interface.{key}")
    short = interface.get("short_description", "")
    if not 25 <= len(short) <= 64:
        fail(errors, f"short_description length must be 25-64; got {len(short)}")
    if "$q-tool-pdf" not in interface.get("default_prompt", ""):
        fail(errors, "default_prompt must mention $q-tool-pdf")

    for path in (SKILL / "scripts/node/package.json",):
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 - report all parse errors
            fail(errors, f"{path}: invalid JSON: {exc}")

    pyproject_text = (SKILL / "scripts/python/pyproject.toml").read_text(encoding="utf-8")
    if tomllib is not None:
        try:
            pyproject = tomllib.loads(pyproject_text)
            scripts = pyproject.get("project", {}).get("scripts", {})
            if scripts.get("q-tool-pdf-python") != "pdf_tool:main":
                fail(errors, "pyproject console entry point must be q-tool-pdf-python = pdf_tool:main")
        except Exception as exc:  # noqa: BLE001
            fail(errors, f"invalid pyproject.toml: {exc}")
    elif not re.search(
        r'(?ms)^\[project\.scripts\]\s*.*?^q-tool-pdf-python\s*=\s*"pdf_tool:main"\s*$',
        pyproject_text,
    ):
        fail(errors, "Python 3.10 fallback could not verify the pyproject console entry point")

    python_source = (SKILL / "scripts/python/pdf_tool.py").read_text(encoding="utf-8")
    try:
        ast.parse(python_source, filename=str(SKILL / "scripts/python/pdf_tool.py"))
    except SyntaxError as exc:
        fail(errors, f"Python backend syntax error: {exc}")
    python_commands = set(re.findall(r'add_parser\("([a-z-]+)"\)', python_source))
    if python_commands != EXPECTED_COMMANDS:
        fail(errors, f"Python command set mismatch: missing={sorted(EXPECTED_COMMANDS-python_commands)} extra={sorted(python_commands-EXPECTED_COMMANDS)}")

    node_source = (SKILL / "scripts/node/pdf-tool.mjs").read_text(encoding="utf-8")

    # Security invariant: qpdf receives all arguments through stdin so password
    # values do not appear in process listings, and verbose encryption reports
    # that may reconstruct credential material are not used.
    if "--show-encryption" in python_source or "--show-encryption" in node_source:
        fail(errors, "backends must not request raw qpdf --show-encryption reports")
    if '["qpdf", "@-"]' not in python_source or "secret=True" not in python_source:
        fail(errors, "Python qpdf wrapper must use @- stdin arguments with secret diagnostics")
    if 'runProcess("qpdf", ["@-"]' not in node_source or "secret: true" not in node_source:
        fail(errors, "Node qpdf wrapper must use @- stdin arguments with secret diagnostics")
    if "--overwrite" not in python_source or "--overwrite" not in node_source:
        fail(errors, "both backends must refuse existing outputs unless --overwrite is explicit")
    if re.search(r"\b(?:bun|deno)\b", (SKILL / "scripts/pdf").read_text(encoding="utf-8"), re.I):
        fail(errors, "dispatcher must advertise only the supported Python and Node runtimes")

    handler_match = re.search(r"const handlers = \{(.*?)\n\};", node_source, flags=re.S)
    if not handler_match:
        fail(errors, "Node handlers object not found")
    else:
        node_commands = set(re.findall(r'^\s*"?([a-z][a-z-]+)"?\s*:', handler_match.group(1), flags=re.M))
        if node_commands != EXPECTED_COMMANDS:
            fail(errors, f"Node command set mismatch: missing={sorted(EXPECTED_COMMANDS-node_commands)} extra={sorted(node_commands-EXPECTED_COMMANDS)}")

    operations = (SKILL / "references/operations.md").read_text(encoding="utf-8")
    for command in sorted(EXPECTED_COMMANDS):
        if command not in operations:
            fail(errors, f"operations reference does not mention command {command}")

    powershell_source = (SKILL / "scripts/pdf.ps1").read_text(encoding="utf-8")
    if '@("--help")' not in powershell_source or 'Stop-PdfTool' not in powershell_source:
        fail(errors, "PowerShell dispatcher must expose no-argument help and explicit exit handling")

    for path in SKILL.rglob("*.md"):
        errors.extend(local_link_errors(path))

    for relative in ("scripts/pdf", "scripts/python/pdf_tool.py", "scripts/node/pdf-tool.mjs", "tests/make_fixtures.py", "tests/smoke_python.sh", "tests/smoke_dispatcher.sh", "tests/smoke_node.sh"):
        path = SKILL / relative
        if path.exists() and not path.stat().st_mode & stat.S_IXUSR:
            fail(errors, f"{path}: expected executable owner bit")

    transient = []
    for path in SKILL.rglob("*"):
        if "__pycache__" in path.parts or any(part.endswith(".egg-info") for part in path.parts) or "build" in path.parts:
            transient.append(str(path.relative_to(SKILL)))
    if transient:
        fail(errors, "transient build/cache artifacts present: " + ", ".join(sorted(transient)[:20]))

    if errors:
        print("q-tool-pdf static validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("q-tool-pdf static validation passed")
    print(f"- skill files checked: {len(actual)}")
    print(f"- unified commands checked: {len(EXPECTED_COMMANDS)}")
    print("- frontmatter, agent interface, JSON, TOML, local links, and executable bits checked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
