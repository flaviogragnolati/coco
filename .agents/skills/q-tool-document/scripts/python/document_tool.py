#!/usr/bin/env python3
"""Safe, standard-library DOCX/DOTX mechanics for q-tool-document."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import posixpath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
CP_NS = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
DC_NS = "http://purl.org/dc/elements/1.1/"
DCTERMS_NS = "http://purl.org/dc/terms/"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"
W = "{%s}" % W_NS
REL = "{%s}" % REL_NS
CT = "{%s}" % CT_NS
MAX_ENTRIES = 4096
MAX_EXPANDED_BYTES = 256 * 1024 * 1024
MAX_COMPRESSION_RATIO = 250

for prefix, uri in (
    ("w", W_NS),
    ("r", R_NS),
    ("cp", CP_NS),
    ("dc", DC_NS),
    ("dcterms", DCTERMS_NS),
    ("xsi", XSI_NS),
):
    ET.register_namespace(prefix, uri)


class DocumentError(RuntimeError):
    """A bounded document-operation failure with a user-facing message."""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_utc(value: str | None) -> str:
    if not value:
        return utc_now()
    candidate = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError as exc:
        raise DocumentError("--date must be an ISO-8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise DocumentError("--date must include a timezone")
    return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def ensure_output(source: Path | None, output: Path, overwrite: bool) -> None:
    output = output.resolve()
    if source is not None and source.resolve() == output:
        raise DocumentError("input and output paths must be distinct")
    if output.exists() and not overwrite:
        raise DocumentError("output already exists; pass --overwrite only after replacement approval")
    output.parent.mkdir(parents=True, exist_ok=True)


def safe_member_name(name: str) -> bool:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    return bool(normalized) and not path.is_absolute() and ".." not in path.parts and not re.match(r"^[A-Za-z]:", normalized)


def read_package(path: Path) -> tuple[dict[str, bytes], dict[str, zipfile.ZipInfo]]:
    if not path.is_file():
        raise DocumentError("input document does not exist: %s" % path)
    if path.suffix.lower() not in {".docx", ".dotx"}:
        raise DocumentError("package operations support only .docx and .dotx inputs")
    try:
        archive = zipfile.ZipFile(path)
    except (zipfile.BadZipFile, OSError) as exc:
        raise DocumentError("input is not a readable Open XML ZIP package") from exc
    with archive:
        infos = archive.infolist()
        if len(infos) > MAX_ENTRIES:
            raise DocumentError("package contains too many ZIP members")
        total = 0
        data: dict[str, bytes] = {}
        metadata: dict[str, zipfile.ZipInfo] = {}
        for info in infos:
            if not safe_member_name(info.filename):
                raise DocumentError("unsafe ZIP member path: %s" % info.filename)
            mode = (info.external_attr >> 16) & 0o170000
            if mode == stat.S_IFLNK:
                raise DocumentError("symlink ZIP members are not supported: %s" % info.filename)
            total += info.file_size
            if total > MAX_EXPANDED_BYTES:
                raise DocumentError("expanded package exceeds the 256 MiB safety limit")
            if info.compress_size and info.file_size / info.compress_size > MAX_COMPRESSION_RATIO:
                raise DocumentError("suspicious compression ratio in ZIP member: %s" % info.filename)
            if info.is_dir():
                continue
            if info.filename in data:
                raise DocumentError("duplicate ZIP member is not supported: %s" % info.filename)
            data[info.filename] = archive.read(info)
            metadata[info.filename] = info
        bad = archive.testzip()
        if bad:
            raise DocumentError("ZIP integrity check failed at member: %s" % bad)
    required = {"[Content_Types].xml", "_rels/.rels", "word/document.xml"}
    missing = sorted(required - set(data))
    if missing:
        raise DocumentError("missing required Open XML parts: %s" % ", ".join(missing))
    if any(name.lower().endswith("vbaproject.bin") for name in data):
        raise DocumentError("macro-bearing packages are outside this version's compatibility boundary")
    return data, metadata


def xml_root(raw: bytes, part: str) -> ET.Element:
    try:
        return ET.fromstring(raw)
    except ET.ParseError as exc:
        raise DocumentError("malformed XML in %s: %s" % (part, exc)) from exc


def xml_bytes(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def write_package(
    source: Path | None,
    output: Path,
    parts: dict[str, bytes],
    metadata: dict[str, zipfile.ZipInfo] | None,
    overwrite: bool,
) -> None:
    ensure_output(source, output, overwrite)
    descriptor, temporary = tempfile.mkstemp(prefix=".%s." % output.name, suffix=".tmp", dir=output.parent)
    os.close(descriptor)
    temp_path = Path(temporary)
    try:
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED, strict_timestamps=False) as archive:
            ordered = sorted(parts, key=lambda item: (item != "[Content_Types].xml", item))
            for name in ordered:
                info = metadata.get(name) if metadata else None
                if info is not None:
                    clone = copy.copy(info)
                    clone.filename = name
                    archive.writestr(clone, parts[name])
                else:
                    archive.writestr(name, parts[name])
        os.replace(temp_path, output)
    finally:
        temp_path.unlink(missing_ok=True)


def relationship_base(part: str) -> PurePosixPath:
    if part == "_rels/.rels":
        return PurePosixPath("")
    marker = "/_rels/"
    if marker not in part or not part.endswith(".rels"):
        return PurePosixPath("")
    prefix, leaf = part.split(marker, 1)
    return PurePosixPath(prefix, leaf[:-5]).parent


def relationship_report(parts: dict[str, bytes]) -> tuple[list[str], list[str]]:
    external: list[str] = []
    missing: list[str] = []
    for name, raw in parts.items():
        if not name.endswith(".rels"):
            continue
        root = xml_root(raw, name)
        base = relationship_base(name)
        for rel in root.findall(REL + "Relationship"):
            target = rel.get("Target", "")
            if rel.get("TargetMode") == "External" or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", target):
                external.append(target)
                continue
            target = target.split("#", 1)[0].split("?", 1)[0]
            normalized = posixpath.normpath(str(base / target).lstrip("/"))
            if normalized.startswith("../") or not safe_member_name(normalized):
                missing.append("unsafe relationship target %s from %s" % (target, name))
            elif normalized not in parts:
                missing.append("missing relationship target %s from %s" % (normalized, name))
    return external, missing


def package_check(path: Path) -> dict[str, Any]:
    parts, _ = read_package(path)
    xml_parts = [name for name in parts if name.endswith((".xml", ".rels"))]
    for name in xml_parts:
        xml_root(parts[name], name)
    external, relationship_errors = relationship_report(parts)
    document = xml_root(parts["word/document.xml"], "word/document.xml")
    tracked = sum(1 for tag in (W + "ins", W + "del", W + "moveFrom", W + "moveTo") for _ in document.iter(tag))
    comments = 0
    if "word/comments.xml" in parts:
        comments = sum(1 for _ in xml_root(parts["word/comments.xml"], "word/comments.xml").iter(W + "comment"))
    return {
        "status": "passed" if not relationship_errors else "failed",
        "path": str(path),
        "sha256": sha256(path),
        "format": path.suffix.lower().lstrip("."),
        "parts": len(parts),
        "xml_parts_checked": len(xml_parts),
        "tracked_change_elements": tracked,
        "comments": comments,
        "external_relationships": external,
        "relationship_errors": relationship_errors,
        "full_xsd_validation": "unavailable",
    }


def node_text(node: ET.Element, mode: str) -> str:
    if node.tag in {W + "del", W + "moveFrom"} and mode == "accept":
        return ""
    if node.tag in {W + "ins", W + "moveTo"} and mode == "reject":
        return ""
    if node.tag in {W + "t", W + "delText", W + "instrText"}:
        return node.text or ""
    if node.tag == W + "tab":
        return "\t"
    if node.tag in {W + "br", W + "cr"}:
        return "\n"
    return "".join(node_text(child, mode) for child in node)


def extract_parts_text(parts: dict[str, bytes], mode: str) -> str:
    selected = ["word/document.xml"]
    selected.extend(sorted(name for name in parts if re.fullmatch(r"word/(?:header|footer)[0-9]+\.xml", name)))
    selected.extend(name for name in ("word/footnotes.xml", "word/endnotes.xml") if name in parts)
    blocks: list[str] = []
    for name in selected:
        root = xml_root(parts[name], name)
        paragraphs = [node_text(paragraph, mode).strip("\n") for paragraph in root.iter(W + "p")]
        text = "\n".join(item for item in paragraphs if item)
        if text:
            if name != "word/document.xml":
                blocks.append("[%s]\n%s" % (name, text))
            else:
                blocks.append(text)
    return "\n\n".join(blocks) + ("\n" if blocks else "")


def inspect_package(path: Path) -> dict[str, Any]:
    result = package_check(path)
    parts, _ = read_package(path)
    document = xml_root(parts["word/document.xml"], "word/document.xml")
    result.update(
        {
            "paragraphs": sum(1 for _ in document.iter(W + "p")),
            "tables": sum(1 for _ in document.iter(W + "tbl")),
            "accepted_text_characters": len(extract_parts_text(parts, "accept")),
            "signatures": sorted(name for name in parts if name.startswith("_xmlsignatures/")),
            "embedded_objects": sorted(name for name in parts if name.startswith("word/embeddings/")),
        }
    )
    return result


def paragraph_xml(text: str) -> str:
    space = ' xml:space="preserve"' if text[:1].isspace() or text[-1:].isspace() else ""
    return '<w:p><w:r><w:t%s>%s</w:t></w:r></w:p>' % (space, escape(text))


def create_parts(text: str, template: bool) -> dict[str, bytes]:
    paragraphs = "".join(paragraph_xml(line) for line in text.splitlines()) or paragraph_xml("")
    main_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml"
        if template
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
    )
    created = utc_now()
    values = {
        "[Content_Types].xml": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="{CT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="{main_type}"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>''',
        "_rels/.rels": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>''',
        "word/_rels/document.xml.rels": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>''',
        "word/document.xml": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{W_NS}" xmlns:r="{R_NS}"><w:body>{paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>''',
        "word/styles.xml": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W_NS}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>''',
        "docProps/core.xml": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="{CP_NS}" xmlns:dc="{DC_NS}" xmlns:dcterms="{DCTERMS_NS}" xmlns:xsi="{XSI_NS}"><dc:creator>Quasar q-tool-document</dc:creator><cp:lastModifiedBy>Quasar q-tool-document</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{created}</dcterms:modified></cp:coreProperties>''',
        "docProps/app.xml": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Quasar q-tool-document</Application></Properties>''',
    }
    return {name: value.encode("utf-8") for name, value in values.items()}


def exact_text_nodes(root: ET.Element, old: str) -> list[tuple[ET.Element, int]]:
    found: list[tuple[ET.Element, int]] = []
    for element in root.iter(W + "t"):
        count = (element.text or "").count(old)
        if count:
            found.append((element, count))
    return found


def replace_text(parts: dict[str, bytes], old: str, new: str, replace_all: bool) -> int:
    if not old:
        raise DocumentError("--old must not be empty")
    root = xml_root(parts["word/document.xml"], "word/document.xml")
    found = exact_text_nodes(root, old)
    total = sum(count for _, count in found)
    if total == 0:
        raise DocumentError("target text was not found inside one Open XML text node")
    if total != 1 and not replace_all:
        raise DocumentError("target is ambiguous (%d occurrences); narrow it or pass --all explicitly" % total)
    remaining = total if replace_all else 1
    changed = 0
    for element, _ in found:
        if remaining <= 0:
            break
        count = -1 if replace_all else 1
        before = element.text or ""
        after = before.replace(old, new, count)
        changed_here = before.count(old) if replace_all else 1
        element.text = after
        remaining -= changed_here
        changed += changed_here
    parts["word/document.xml"] = xml_bytes(root)
    return changed


def simple_run_target(root: ET.Element, target: str) -> tuple[ET.Element, ET.Element, ET.Element, str, str]:
    if not target:
        raise DocumentError("target text must not be empty")
    parent = {child: node for node in root.iter() for child in node}
    candidates: list[tuple[ET.Element, ET.Element, ET.Element, str, str]] = []
    for text in root.iter(W + "t"):
        value = text.text or ""
        if target not in value:
            continue
        run = parent.get(text)
        paragraph = parent.get(run) if run is not None else None
        if run is None or paragraph is None or run.tag != W + "r" or paragraph.tag != W + "p":
            continue
        if len(list(run.iter(W + "t"))) != 1:
            continue
        disallowed = {W + "fldChar", W + "instrText", W + "drawing", W + "object", W + "footnoteReference"}
        if any(node.tag in disallowed for node in run.iter()):
            continue
        prefix, suffix = value.split(target, 1)
        candidates.append((paragraph, run, text, prefix, suffix))
    if len(candidates) != 1:
        raise DocumentError("target must resolve to exactly one simple direct paragraph run; found %d" % len(candidates))
    return candidates[0]


def set_run_text(run: ET.Element, value: str, *, deleted: bool = False) -> ET.Element:
    clone = copy.deepcopy(run)
    texts = list(clone.iter(W + "t"))
    if len(texts) != 1:
        raise DocumentError("target run is not a supported single-text run")
    text = texts[0]
    text.text = value
    if deleted:
        text.tag = W + "delText"
    if value[:1].isspace() or value[-1:].isspace():
        text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    return clone


def add_relationship(parts: dict[str, bytes], rel_type: str, target: str) -> None:
    name = "word/_rels/document.xml.rels"
    if name in parts:
        root = xml_root(parts[name], name)
    else:
        root = ET.Element(REL + "Relationships")
    for rel in root.findall(REL + "Relationship"):
        if rel.get("Type") == rel_type and rel.get("Target") == target:
            parts[name] = xml_bytes(root)
            return
    used = {rel.get("Id", "") for rel in root.findall(REL + "Relationship")}
    index = 1
    while "rId%d" % index in used:
        index += 1
    ET.SubElement(root, REL + "Relationship", {"Id": "rId%d" % index, "Type": rel_type, "Target": target})
    parts[name] = xml_bytes(root)


def add_content_type(parts: dict[str, bytes], part_name: str, content_type: str) -> None:
    root = xml_root(parts["[Content_Types].xml"], "[Content_Types].xml")
    for override in root.findall(CT + "Override"):
        if override.get("PartName") == part_name:
            override.set("ContentType", content_type)
            parts["[Content_Types].xml"] = xml_bytes(root)
            return
    ET.SubElement(root, CT + "Override", {"PartName": part_name, "ContentType": content_type})
    parts["[Content_Types].xml"] = xml_bytes(root)


def next_revision_id(root: ET.Element) -> int:
    values: list[int] = []
    for element in root.iter():
        raw = element.get(W + "id")
        if raw and raw.isdigit():
            values.append(int(raw))
    return max(values, default=-1) + 1


def add_comment(parts: dict[str, bytes], target: str, body: str, author: str, date: str) -> int:
    if not author.strip() or not body:
        raise DocumentError("comment author and body must be non-empty")
    document = xml_root(parts["word/document.xml"], "word/document.xml")
    paragraph, run, _, prefix, suffix = simple_run_target(document, target)
    if "word/comments.xml" in parts:
        comments = xml_root(parts["word/comments.xml"], "word/comments.xml")
    else:
        comments = ET.Element(W + "comments")
    ids = [int(item.get(W + "id", "-1")) for item in comments.findall(W + "comment") if item.get(W + "id", "").isdigit()]
    comment_id = max(ids, default=-1) + 1
    comment = ET.SubElement(comments, W + "comment", {W + "id": str(comment_id), W + "author": author, W + "date": date})
    comment_p = ET.SubElement(comment, W + "p")
    comment_r = ET.SubElement(comment_p, W + "r")
    ET.SubElement(comment_r, W + "t").text = body

    index = list(paragraph).index(run)
    paragraph.remove(run)
    additions: list[ET.Element] = []
    if prefix:
        additions.append(set_run_text(run, prefix))
    additions.append(ET.Element(W + "commentRangeStart", {W + "id": str(comment_id)}))
    additions.append(set_run_text(run, target))
    additions.append(ET.Element(W + "commentRangeEnd", {W + "id": str(comment_id)}))
    reference = ET.Element(W + "r")
    rpr = ET.SubElement(reference, W + "rPr")
    ET.SubElement(rpr, W + "rStyle", {W + "val": "CommentReference"})
    ET.SubElement(reference, W + "commentReference", {W + "id": str(comment_id)})
    additions.append(reference)
    if suffix:
        additions.append(set_run_text(run, suffix))
    for offset, element in enumerate(additions):
        paragraph.insert(index + offset, element)

    parts["word/document.xml"] = xml_bytes(document)
    parts["word/comments.xml"] = xml_bytes(comments)
    add_relationship(parts, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments", "comments.xml")
    add_content_type(parts, "/word/comments.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml")
    return comment_id


def add_redline(parts: dict[str, bytes], old: str, new: str, author: str, date: str) -> tuple[int, int | None]:
    if not author.strip() or not old:
        raise DocumentError("redline author and --old must be non-empty")
    document = xml_root(parts["word/document.xml"], "word/document.xml")
    paragraph, run, _, prefix, suffix = simple_run_target(document, old)
    revision_id = next_revision_id(document)
    deleted = ET.Element(W + "del", {W + "id": str(revision_id), W + "author": author, W + "date": date})
    deleted.append(set_run_text(run, old, deleted=True))
    inserted: ET.Element | None = None
    if new:
        inserted = ET.Element(W + "ins", {W + "id": str(revision_id + 1), W + "author": author, W + "date": date})
        inserted.append(set_run_text(run, new))
    index = list(paragraph).index(run)
    paragraph.remove(run)
    additions: list[ET.Element] = []
    if prefix:
        additions.append(set_run_text(run, prefix))
    additions.append(deleted)
    if inserted is not None:
        additions.append(inserted)
    if suffix:
        additions.append(set_run_text(run, suffix))
    for offset, element in enumerate(additions):
        paragraph.insert(index + offset, element)
    parts["word/document.xml"] = xml_bytes(document)
    return revision_id, revision_id + 1 if inserted is not None else None


def accept_tree(root: ET.Element) -> int:
    if any(node.tag in {W + "moveFrom", W + "moveTo", W + "moveFromRangeStart", W + "moveToRangeStart"} for node in root.iter()):
        raise DocumentError("move revisions require a specialist editor; no output was written")
    for ppr in root.iter(W + "pPr"):
        if any(node.tag == W + "del" for node in ppr.iter()):
            raise DocumentError("deleted paragraph marks require a specialist editor; no output was written")
    changed = 0
    change_property_names = {
        W + "rPrChange", W + "pPrChange", W + "tblPrChange", W + "tblGridChange",
        W + "trPrChange", W + "tcPrChange", W + "sectPrChange", W + "numberingChange",
    }

    def visit(parent: ET.Element) -> None:
        nonlocal changed
        index = 0
        while index < len(parent):
            child = parent[index]
            if child.tag == W + "del":
                parent.remove(child)
                changed += 1
                continue
            if child.tag == W + "ins":
                parent.remove(child)
                for offset, grandchild in enumerate(list(child)):
                    parent.insert(index + offset, grandchild)
                changed += 1
                index += len(child)
                continue
            if child.tag in change_property_names:
                parent.remove(child)
                changed += 1
                continue
            visit(child)
            index += 1

    visit(root)
    return changed


def accept_changes(parts: dict[str, bytes]) -> int:
    selected = ["word/document.xml"]
    selected.extend(sorted(name for name in parts if re.fullmatch(r"word/(?:header|footer)[0-9]+\.xml", name)))
    selected.extend(name for name in ("word/footnotes.xml", "word/endnotes.xml") if name in parts)
    changed = 0
    parsed: dict[str, ET.Element] = {}
    for name in selected:
        root = xml_root(parts[name], name)
        changed += accept_tree(root)
        parsed[name] = root
    if not changed:
        raise DocumentError("no supported tracked changes were found")
    for name, root in parsed.items():
        parts[name] = xml_bytes(root)
    return changed


def native_version(executable: str) -> str:
    try:
        result = subprocess.run([executable, "--version"], text=True, capture_output=True, timeout=10, check=False)
    except OSError:
        return "unavailable"
    return (result.stdout or result.stderr).splitlines()[0].strip() if result.returncode == 0 else "unavailable"


def soffice_convert(source: Path, output: Path, target: str, overwrite: bool) -> Path:
    executable = shutil.which("soffice") or shutil.which("libreoffice")
    if not executable:
        raise DocumentError("LibreOffice is unavailable; conversion/rendering is blocked")
    ensure_output(source, output, overwrite)
    with tempfile.TemporaryDirectory(prefix="q-tool-document-soffice-") as tmp:
        workspace = Path(tmp)
        profile = workspace / "profile"
        converted = workspace / (source.stem + "." + target)
        command = [
            executable,
            "--headless",
            "-env:UserInstallation=file://%s" % profile,
            "--convert-to",
            target,
            "--outdir",
            str(workspace),
            str(source.resolve()),
        ]
        run = subprocess.run(command, text=True, capture_output=True, timeout=120, check=False)
        if run.returncode != 0 or not converted.is_file():
            diagnostic = (run.stderr or run.stdout).strip()
            raise DocumentError("LibreOffice conversion failed: %s" % (diagnostic or run.returncode))
        descriptor, temporary = tempfile.mkstemp(prefix=".%s." % output.name, suffix=".tmp", dir=output.parent)
        os.close(descriptor)
        temp_path = Path(temporary)
        try:
            shutil.copyfile(converted, temp_path)
            os.replace(temp_path, output)
        finally:
            temp_path.unlink(missing_ok=True)
    return output


def render_document(source: Path, output_dir: Path, dpi: int, overwrite: bool) -> list[Path]:
    if output_dir.exists() and any(output_dir.iterdir()) and not overwrite:
        raise DocumentError("validation directory is not empty; pass --overwrite only after replacement approval")
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf = output_dir / (source.stem + ".pdf")
    soffice_convert(source, pdf, "pdf", overwrite=True)
    outputs = [pdf]
    rasterizer = shutil.which("pdftoppm")
    if rasterizer:
        prefix = output_dir / "page"
        run = subprocess.run(
            [rasterizer, "-png", "-r", str(dpi), str(pdf), str(prefix)],
            text=True,
            capture_output=True,
            timeout=120,
            check=False,
        )
        if run.returncode != 0:
            raise DocumentError("pdftoppm failed: %s" % ((run.stderr or run.stdout).strip() or run.returncode))
        outputs.extend(sorted(output_dir.glob("page-*.png")))
    return outputs


def emit(value: Any, as_json: bool) -> None:
    if as_json:
        print(json.dumps(value, ensure_ascii=False, indent=2))
    elif isinstance(value, str):
        sys.stdout.write(value)
    elif isinstance(value, dict):
        for key, item in value.items():
            print("%s: %s" % (key, json.dumps(item, ensure_ascii=False) if isinstance(item, (dict, list)) else item))
    else:
        print(value)


def add_json(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")


def add_overwrite(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--overwrite", action="store_true", help="replace an existing output only after explicit approval")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="q-tool-document Python backend: local DOCX/DOTX mechanics without dependency installation")
    sub = root.add_subparsers(dest="command", required=True)

    command = sub.add_parser("doctor", help="report backend and native-tool capabilities")
    add_json(command)

    for name, help_text in (("inspect", "inspect document structure"), ("check", "check package integrity")):
        command = sub.add_parser(name, help=help_text)
        command.add_argument("input", type=Path)
        add_json(command)

    command = sub.add_parser("extract-text", help="extract a tracked-change view as text")
    command.add_argument("input", type=Path)
    command.add_argument("--track-changes", choices=("accept", "reject", "all"), default="accept")
    command.add_argument("--output", type=Path)
    add_json(command)

    command = sub.add_parser("create", help="create a basic DOCX or DOTX from approved plain text")
    command.add_argument("output", type=Path)
    source = command.add_mutually_exclusive_group(required=True)
    source.add_argument("--text")
    source.add_argument("--text-file", type=Path)
    command.add_argument("--template", action="store_true")
    add_overwrite(command)
    add_json(command)

    command = sub.add_parser("replace-text", help="replace exact text within one Open XML text node")
    command.add_argument("input", type=Path)
    command.add_argument("output", type=Path)
    command.add_argument("--old", required=True)
    command.add_argument("--new", required=True)
    command.add_argument("--all", action="store_true")
    add_overwrite(command)
    add_json(command)

    command = sub.add_parser("comment", help="add a classic Word comment to an exact text anchor")
    command.add_argument("input", type=Path)
    command.add_argument("output", type=Path)
    command.add_argument("--target", required=True)
    command.add_argument("--comment", required=True)
    command.add_argument("--author", required=True)
    command.add_argument("--date")
    add_overwrite(command)
    add_json(command)

    command = sub.add_parser("redline", help="add a tracked replacement to an exact text anchor")
    command.add_argument("input", type=Path)
    command.add_argument("output", type=Path)
    command.add_argument("--old", required=True)
    command.add_argument("--new", required=True)
    command.add_argument("--author", required=True)
    command.add_argument("--date")
    add_overwrite(command)
    add_json(command)

    command = sub.add_parser("accept-changes", help="materialize supported accepted text revisions")
    command.add_argument("input", type=Path)
    command.add_argument("output", type=Path)
    add_overwrite(command)
    add_json(command)

    command = sub.add_parser("convert", help="convert a supported office document to DOCX with LibreOffice")
    command.add_argument("input", type=Path)
    command.add_argument("output", type=Path)
    add_overwrite(command)
    add_json(command)

    command = sub.add_parser("render", help="render a document to a validation PDF and page images")
    command.add_argument("input", type=Path)
    command.add_argument("--output-dir", type=Path, required=True)
    command.add_argument("--dpi", type=int, default=144)
    add_overwrite(command)
    add_json(command)
    return root


def main(argv: Iterable[str] | None = None) -> int:
    args = parser().parse_args(list(argv) if argv is not None else None)
    try:
        if args.command == "doctor":
            result = {
                "runtime": "python",
                "python": sys.version.split()[0],
                "package_operations": "available",
                "full_xsd_validation": "unavailable",
                "soffice": native_version(shutil.which("soffice") or shutil.which("libreoffice") or "soffice"),
                "pdftoppm": native_version(shutil.which("pdftoppm") or "pdftoppm"),
                "network": "forbidden",
            }
        elif args.command == "inspect":
            result = inspect_package(args.input)
        elif args.command == "check":
            result = package_check(args.input)
            if result["status"] != "passed":
                raise DocumentError("relationship validation failed: %s" % "; ".join(result["relationship_errors"]))
        elif args.command == "extract-text":
            parts, _ = read_package(args.input)
            text = extract_parts_text(parts, args.track_changes)
            if args.output:
                ensure_output(None, args.output, False)
                args.output.write_text(text, encoding="utf-8")
                result = {"status": "completed", "output": str(args.output), "sha256": sha256(args.output), "characters": len(text)}
            elif args.json:
                result = {"status": "completed", "text": text, "characters": len(text), "track_changes": args.track_changes}
            else:
                result = text
        elif args.command == "create":
            text = args.text if args.text is not None else args.text_file.read_text(encoding="utf-8")
            template = args.template or args.output.suffix.lower() == ".dotx"
            expected = ".dotx" if template else ".docx"
            if args.output.suffix.lower() != expected:
                raise DocumentError("output extension must be %s for the selected document type" % expected)
            write_package(None, args.output, create_parts(text, template), None, args.overwrite)
            result = {"status": "completed", "output": str(args.output), "sha256": sha256(args.output), "format": expected[1:]}
        elif args.command in {"replace-text", "comment", "redline", "accept-changes"}:
            parts, metadata = read_package(args.input)
            if args.command == "replace-text":
                detail = {"replacements": replace_text(parts, args.old, args.new, args.all)}
            elif args.command == "comment":
                detail = {"comment_id": add_comment(parts, args.target, args.comment, args.author, normalize_utc(args.date))}
            elif args.command == "redline":
                deleted_id, inserted_id = add_redline(parts, args.old, args.new, args.author, normalize_utc(args.date))
                detail = {"deleted_revision_id": deleted_id, "inserted_revision_id": inserted_id}
            else:
                detail = {"accepted_revision_elements": accept_changes(parts)}
            write_package(args.input, args.output, parts, metadata, args.overwrite)
            checked = package_check(args.output)
            result = {"status": "completed", "output": str(args.output), "sha256": sha256(args.output), **detail, "check": checked["status"]}
        elif args.command == "convert":
            if args.input.suffix.lower() not in {".doc", ".odt", ".rtf", ".docx", ".dotx"}:
                raise DocumentError("convert supports DOC, ODT, RTF, DOCX, and DOTX inputs")
            if args.output.suffix.lower() != ".docx":
                raise DocumentError("convert output must use the .docx extension")
            soffice_convert(args.input, args.output, "docx", args.overwrite)
            result = {"status": "completed", "output": str(args.output), "sha256": sha256(args.output), "tool": "LibreOffice"}
        elif args.command == "render":
            if not 72 <= args.dpi <= 600:
                raise DocumentError("--dpi must be between 72 and 600")
            outputs = render_document(args.input, args.output_dir, args.dpi, args.overwrite)
            result = {
                "status": "completed" if len(outputs) > 1 else "completed_with_warnings",
                "outputs": [{"path": str(path), "sha256": sha256(path)} for path in outputs],
                "page_rasterization": "completed" if len(outputs) > 1 else "unavailable",
            }
        else:  # pragma: no cover - argparse owns this branch.
            raise DocumentError("unsupported command")
        emit(result, getattr(args, "json", False))
        return 0
    except (DocumentError, OSError, UnicodeError) as exc:
        if getattr(args, "json", False):
            emit({"status": "blocked", "error": str(exc)}, True)
        else:
            print("Error: %s" % exc, file=sys.stderr)
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
