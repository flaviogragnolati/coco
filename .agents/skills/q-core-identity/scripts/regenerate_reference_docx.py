#!/usr/bin/env python3
"""Regenerate the Quasar DOCX reference with the declared identity profile."""

from __future__ import annotations

import argparse
import os
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"

ET.register_namespace("w", W_NS)
ET.register_namespace("a", A_NS)
ET.register_namespace("", R_NS)

REMOVED_PARTS = {
    "docProps/thumbnail.jpeg",
    "word/stylesWithEffects.xml",
    "word/media/image1.png",
    "word/media/image3.png",
}
REMOVED_PREFIXES = ("customXml/",)


def xml_bytes(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def rewrite_styles(data: bytes) -> bytes:
    return data.replace(b'"Arial"', b'"Aptos"').replace(
        b'"Courier"', b'"Aptos Mono"'
    )


def rewrite_theme(data: bytes) -> bytes:
    root = ET.fromstring(data)
    major = root.find(f".//{{{A_NS}}}majorFont/{{{A_NS}}}latin")
    minor = root.find(f".//{{{A_NS}}}minorFont/{{{A_NS}}}latin")
    if major is None or minor is None:
        raise ValueError("reference.docx theme lacks major/minor Latin font slots")
    major.set("typeface", "Aptos Display")
    minor.set("typeface", "Aptos")
    return xml_bytes(root)


def font(name: str, alt_name: str, family: str) -> ET.Element:
    node = ET.Element(f"{{{W_NS}}}font", {f"{{{W_NS}}}name": name})
    ET.SubElement(node, f"{{{W_NS}}}altName", {f"{{{W_NS}}}val": alt_name})
    ET.SubElement(node, f"{{{W_NS}}}family", {f"{{{W_NS}}}val": family})
    ET.SubElement(node, f"{{{W_NS}}}pitch", {f"{{{W_NS}}}val": "variable"})
    return node


def rewrite_font_table(_: bytes) -> bytes:
    root = ET.Element(f"{{{W_NS}}}fonts")
    root.extend(
        [
            font("Aptos", "Arial", "swiss"),
            font("Aptos Mono", "Consolas", "modern"),
            font("Cambria Math", "Cambria Math", "roman"),
        ]
    )
    return xml_bytes(root)


def clear_document(data: bytes) -> bytes:
    root = ET.fromstring(data)
    body = root.find(f"{{{W_NS}}}body")
    if body is None:
        raise ValueError("reference.docx lacks word/body")
    section = body.find(f"{{{W_NS}}}sectPr")
    for child in list(body):
        body.remove(child)
    body.append(section if section is not None else ET.Element(f"{{{W_NS}}}sectPr"))
    return xml_bytes(root)


def clear_footer(data: bytes) -> bytes:
    root = ET.fromstring(data)
    for child in list(root):
        root.remove(child)
    ET.SubElement(root, f"{{{W_NS}}}p")
    return xml_bytes(root)


def filter_relationships(data: bytes, removed_targets: set[str]) -> bytes:
    root = ET.fromstring(data)
    for relationship in list(root):
        target = relationship.get("Target", "")
        rel_type = relationship.get("Type", "")
        if target in removed_targets or rel_type.endswith("/customXml") or rel_type.endswith("/stylesWithEffects") or rel_type.endswith("/thumbnail"):
            root.remove(relationship)
    return xml_bytes(root)


def filter_content_types(data: bytes) -> bytes:
    root = ET.fromstring(data)
    for child in list(root):
        part = child.get("PartName", "").lstrip("/")
        if part in REMOVED_PARTS or part.startswith(REMOVED_PREFIXES):
            root.remove(child)
    return xml_bytes(root)


def transformed(name: str, data: bytes) -> bytes:
    handlers = {
        "word/styles.xml": rewrite_styles,
        "word/theme/theme1.xml": rewrite_theme,
        "word/fontTable.xml": rewrite_font_table,
        "word/document.xml": clear_document,
        "word/footer1.xml": clear_footer,
        "word/_rels/document.xml.rels": lambda value: filter_relationships(
            value, {"../customXml/item1.xml", "stylesWithEffects.xml", "media/image1.png"}
        ),
        "word/_rels/footer1.xml.rels": lambda value: filter_relationships(
            value, {"media/image3.png"}
        ),
        "_rels/.rels": lambda value: filter_relationships(
            value, {"docProps/thumbnail.jpeg"}
        ),
        "[Content_Types].xml": filter_content_types,
    }
    return handlers.get(name, lambda value: value)(data)


def regenerate(source: Path, output: Path) -> None:
    source = source.resolve()
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix="quasar-reference-", suffix=".docx", dir=output.parent, delete=False
    ) as handle:
        temporary = Path(handle.name)
    try:
        with zipfile.ZipFile(source) as incoming, zipfile.ZipFile(
            temporary, "w", compression=zipfile.ZIP_DEFLATED
        ) as outgoing:
            for info in incoming.infolist():
                if info.filename in REMOVED_PARTS or info.filename.startswith(REMOVED_PREFIXES):
                    continue
                outgoing.writestr(info, transformed(info.filename, incoming.read(info)))
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    asset = Path(__file__).resolve().parents[1] / "assets" / "reference.docx"
    parser = argparse.ArgumentParser(
        description="Regenerate the Quasar reference DOCX identity profile."
    )
    parser.add_argument("--source", type=Path, default=asset)
    parser.add_argument("--output", type=Path, default=asset)
    args = parser.parse_args()
    regenerate(args.source, args.output)


if __name__ == "__main__":
    main()
