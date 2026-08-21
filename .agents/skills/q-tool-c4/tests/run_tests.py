#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "detect_c4_backends.py"


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        text=True,
        capture_output=True,
        check=False,
        timeout=30,
    )


def main() -> int:
    passed = 0

    help_result = run("--help")
    assert help_result.returncode == 0
    assert "without network access or installation" in help_result.stdout
    passed += 1

    detection = run("--json")
    assert detection.returncode == 0, detection.stderr
    payload = json.loads(detection.stdout)
    assert payload["schema_version"] == "1.0"
    assert payload["network_used"] is False
    assert payload["installation_performed"] is False
    assert set(payload["backends"]) == {"mermaid", "structurizr", "c4-plantuml"}
    passed += 1

    missing = run("--json", "--mermaid-runtime", "/tmp/quasar-c4-missing-mermaid-runtime.mjs")
    assert missing.returncode == 0
    missing_payload = json.loads(missing.stdout)
    assert missing_payload["backends"]["mermaid"]["status"] == "unavailable"
    passed += 1

    text_result = run()
    assert text_result.returncode == 0
    assert all(name in text_result.stdout for name in ("mermaid:", "structurizr:", "c4-plantuml:"))
    passed += 1

    print(f"q-tool-c4 tests: {passed} passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
