#!/usr/bin/env python3
"""Detect local C4 backend candidates without installing or contacting anything."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any


def run(command: list[str], timeout: int = 15) -> tuple[int, str]:
    try:
        result = subprocess.run(
            command,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 1, str(exc)
    return result.returncode, (result.stdout or result.stderr).strip()


def mermaid(runtime: Path) -> dict[str, Any]:
    node = shutil.which("node")
    base = {
        "status": "unavailable",
        "command": node,
        "runtime": str(runtime),
        "validation": "not-run",
        "version": None,
        "formats": [],
    }
    if not node or not runtime.is_file():
        base["reason"] = "node or q-tool-mermaid runtime not found"
        return base
    code, output = run([node, str(runtime), "doctor", "--json"])
    if code != 0:
        base["reason"] = output or "q-tool-mermaid doctor failed"
        return base
    try:
        doctor = json.loads(output)
    except json.JSONDecodeError:
        base["reason"] = "q-tool-mermaid doctor returned non-JSON output"
        return base
    canonical = doctor.get("canonical", {})
    if doctor.get("status") == "passed" and canonical.get("available") is True:
        base.update(
            status="available",
            validation="doctor-passed",
            version=canonical.get("version"),
            formats=canonical.get("formats", []),
        )
    else:
        base["reason"] = "canonical Mermaid renderer unavailable"
    return base


def configured_file(variable: str) -> str | None:
    value = os.environ.get(variable)
    if not value:
        return None
    path = Path(value).expanduser()
    return str(path) if path.is_file() else None


def structurizr() -> dict[str, Any]:
    command = configured_file("STRUCTURIZR_CLI")
    if command is None:
        command = shutil.which("structurizr") or shutil.which("structurizr.sh")
    if command is None:
        return {
            "status": "unavailable",
            "command": None,
            "validation": "not-run",
            "version": None,
            "reason": "Structurizr CLI not found",
        }
    return {
        "status": "candidate",
        "command": command,
        "validation": "validate actual workspace before use",
        "version": None,
    }


def plantuml() -> dict[str, Any]:
    command = shutil.which("plantuml")
    jar = configured_file("PLANTUML_JAR")
    java = shutil.which("java")
    if command:
        code, output = run([command, "-version"])
        first = output.splitlines()[0] if output else None
        return {
            "status": "candidate" if code == 0 else "unavailable",
            "command": command,
            "validation": "render actual C4 source before use" if code == 0 else "version probe failed",
            "version": first,
        }
    if jar and java:
        code, output = run([java, "-jar", jar, "-version"])
        first = output.splitlines()[0] if output else None
        return {
            "status": "candidate" if code == 0 else "unavailable",
            "command": f"{java} -jar {jar}",
            "validation": "render actual C4 source before use" if code == 0 else "version probe failed",
            "version": first,
        }
    return {
        "status": "unavailable",
        "command": None,
        "validation": "not-run",
        "version": None,
        "reason": "PlantUML executable or PLANTUML_JAR not found",
    }


def detect(runtime: Path) -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "network_used": False,
        "installation_performed": False,
        "backends": {
            "mermaid": mermaid(runtime),
            "structurizr": structurizr(),
            "c4-plantuml": plantuml(),
        },
    }


def main() -> int:
    skill_dir = Path(__file__).resolve().parents[1]
    default_runtime = skill_dir.parent / "q-tool-mermaid" / "runtime" / "mermaid.mjs"
    parser = argparse.ArgumentParser(
        description="Detect local C4 backend candidates without network access or installation."
    )
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    parser.add_argument(
        "--mermaid-runtime",
        type=Path,
        default=default_runtime,
        help="path to q-tool-mermaid runtime/mermaid.mjs",
    )
    args = parser.parse_args()
    result = detect(args.mermaid_runtime.resolve())
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        for name, backend in result["backends"].items():
            print(f"{name}: {backend['status']} ({backend['validation']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
