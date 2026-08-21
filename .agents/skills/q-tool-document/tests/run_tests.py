#!/usr/bin/env python3
"""Cross-runtime smoke tests for q-tool-document."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
PYTHON = SKILL / "scripts" / "python" / "document_tool.py"
NODE = SKILL / "scripts" / "node" / "document-tool.mjs"
DISPATCHER = SKILL / "scripts" / "document"


def run(arguments: list[str], *, expected: int = 0) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(arguments, text=True, capture_output=True, check=False, timeout=30)
    if result.returncode != expected:
        raise AssertionError(
            "command %r returned %d, expected %d\nstdout=%s\nstderr=%s"
            % (arguments, result.returncode, expected, result.stdout, result.stderr)
        )
    return result


def payload(result: subprocess.CompletedProcess[str]) -> dict[str, object]:
    return json.loads(result.stdout)


def main() -> int:
    node = shutil.which("node")
    if not node:
        print("q-tool-document tests: Node is required for dual-runtime acceptance", file=sys.stderr)
        return 1
    passed = 0
    with tempfile.TemporaryDirectory(prefix="q-tool-document-tests-") as temporary:
        root = Path(temporary)
        source = root / "python.docx"
        created = payload(run([sys.executable, str(PYTHON), "create", str(source), "--text", "Alpha agreement", "--json"]))
        assert created["status"] == "completed"
        passed += 1

        inspected = payload(run([node, str(NODE), "inspect", str(source), "--json"]))
        assert inspected["status"] == "passed" and inspected["paragraphs"] == 1
        passed += 1

        node_edit = root / "node-edit.docx"
        replaced = payload(run([node, str(NODE), "replace-text", str(source), str(node_edit), "--old", "Alpha", "--new", "Beta", "--json"]))
        assert replaced["replacements"] == 1
        extracted = payload(run([sys.executable, str(PYTHON), "extract-text", str(node_edit), "--json"]))
        assert extracted["text"] == "Beta agreement\n"
        passed += 1

        commented = root / "commented.docx"
        comment = payload(run([
            sys.executable, str(PYTHON), "comment", str(node_edit), str(commented),
            "--target", "Beta", "--comment", "Confirm this term", "--author", "Reviewer", "--json",
        ]))
        assert comment["comment_id"] == 0
        comment_inspect = payload(run([node, str(NODE), "inspect", str(commented), "--json"]))
        assert comment_inspect["comments"] == 1
        passed += 1

        node_source = root / "node.docx"
        run([node, str(NODE), "create", str(node_source), "--text", "Hello", "--json"])
        node_commented = root / "node-commented.docx"
        node_comment = payload(run([
            node, str(NODE), "comment", str(node_source), str(node_commented),
            "--target", "Hello", "--comment", "Node comment", "--author", "Reviewer", "--json",
        ]))
        assert node_comment["comment_id"] == 0
        assert payload(run([sys.executable, str(PYTHON), "inspect", str(node_commented), "--json"]))["comments"] == 1
        passed += 1

        redlined = root / "redlined.docx"
        run([
            node, str(NODE), "redline", str(node_source), str(redlined),
            "--old", "Hello", "--new", "Goodbye", "--author", "Reviewer", "--json",
        ])
        accepted_view = payload(run([sys.executable, str(PYTHON), "extract-text", str(redlined), "--track-changes", "accept", "--json"]))
        rejected_view = payload(run([sys.executable, str(PYTHON), "extract-text", str(redlined), "--track-changes", "reject", "--json"]))
        assert accepted_view["text"] == "Goodbye\n" and rejected_view["text"] == "Hello\n"
        passed += 1

        accepted = root / "accepted.docx"
        run([node, str(NODE), "accept-changes", str(redlined), str(accepted), "--json"])
        final_text = payload(run([sys.executable, str(PYTHON), "extract-text", str(accepted), "--json"]))
        assert final_text["text"] == "Goodbye\n"
        passed += 1

        python_redline = root / "python-redline.docx"
        run([
            sys.executable, str(PYTHON), "redline", str(node_source), str(python_redline),
            "--old", "Hello", "--new", "Welcome", "--author", "Reviewer", "--json",
        ])
        node_view = payload(run([node, str(NODE), "extract-text", str(python_redline), "--track-changes", "accept", "--json"]))
        assert node_view["text"] == "Welcome\n"
        python_accepted = root / "python-accepted.docx"
        run([sys.executable, str(PYTHON), "accept-changes", str(python_redline), str(python_accepted), "--json"])
        assert payload(run([node, str(NODE), "extract-text", str(python_accepted), "--json"]))["text"] == "Welcome\n"
        passed += 1

        refused = run([sys.executable, str(PYTHON), "create", str(source), "--text", "Overwrite"], expected=4)
        assert "already exists" in refused.stderr
        passed += 1

        unsafe = root / "unsafe.docx"
        with zipfile.ZipFile(unsafe, "w") as archive:
            archive.writestr("[Content_Types].xml", "<Types/>")
            archive.writestr("_rels/.rels", "<Relationships/>")
            archive.writestr("word/document.xml", "<w:document/>")
            archive.writestr("../escape.xml", "bad")
        python_unsafe = run([sys.executable, str(PYTHON), "check", str(unsafe)], expected=4)
        node_unsafe = run([node, str(NODE), "check", str(unsafe)], expected=4)
        assert "unsafe ZIP member" in python_unsafe.stderr and "unsafe ZIP member" in node_unsafe.stderr
        passed += 1

        dispatcher_python = payload(run(["bash", str(DISPATCHER), "--runtime", "python", "doctor", "--json"]))
        dispatcher_node = payload(run(["bash", str(DISPATCHER), "--runtime", "node", "doctor", "--json"]))
        assert dispatcher_python["runtime"] == "python" and dispatcher_node["runtime"] == "node"
        passed += 1

    print("q-tool-document tests: %d passed" % passed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
