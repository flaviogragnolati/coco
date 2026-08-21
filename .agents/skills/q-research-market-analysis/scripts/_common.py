#!/usr/bin/env python3
"""Bounded local helpers for Quasar market-analysis CLIs.

Adapted from K-Dense Inc.'s MIT-licensed `market-research-reports` `_common.py`
at commit 13385c7c4db02fdcc84a020752c07cce91ef780e. Copyright (c) 2025
K-Dense Inc. Quasar adds a safe YAML-subset
reader and Findings Register ID loading and removes upstream ledger concepts.
"""

from __future__ import annotations

import csv
import json
import math
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_ROWS = 10_000
MAX_CELL_CHARS = 20_000
IDENTIFIER_RE = re.compile(r"^[A-Za-z][A-Za-z0-9._:-]{0,95}$")


class ValidationError(ValueError):
    """A deterministic, user-correctable validation error."""


def safe_input_path(raw_path: str | Path, suffixes: Iterable[str]) -> Path:
    path = Path(raw_path)
    if path.is_symlink():
        raise ValidationError(f"symlink inputs are not allowed: {path}")
    try:
        resolved = path.resolve(strict=True)
    except FileNotFoundError as exc:
        raise ValidationError(f"input file does not exist: {path}") from exc
    if not resolved.is_file():
        raise ValidationError(f"input is not a regular file: {resolved}")
    allowed = {suffix.lower() for suffix in suffixes}
    if resolved.suffix.lower() not in allowed:
        raise ValidationError(f"input must use one of {sorted(allowed)}: {resolved}")
    if resolved.stat().st_size > MAX_FILE_BYTES:
        raise ValidationError(f"input exceeds {MAX_FILE_BYTES} bytes: {resolved}")
    return resolved


def safe_output_path(raw_path: str | Path, *, force: bool = False) -> Path:
    path = Path(raw_path)
    if path.suffix.lower() != ".json":
        raise ValidationError(f"output must use .json: {path}")
    try:
        parent = path.parent.resolve(strict=True)
    except FileNotFoundError as exc:
        raise ValidationError(f"output parent does not exist: {path.parent}") from exc
    destination = parent / path.name
    if destination.is_symlink():
        raise ValidationError(f"symlink outputs are not allowed: {destination}")
    if destination.exists() and not force:
        raise ValidationError(f"output exists; pass --force to replace it: {destination}")
    return destination


def read_json(raw_path: str | Path) -> Any:
    path = safe_input_path(raw_path, {".json"})
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError(f"invalid UTF-8 JSON: {exc}") from exc


def read_csv_records(raw_path: str | Path, required_fields: Iterable[str]) -> list[dict[str, str]]:
    path = safe_input_path(raw_path, {".csv"})
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            headers = [item.strip() for item in (reader.fieldnames or [])]
            if not headers or len(headers) != len(set(headers)) or any(not item for item in headers):
                raise ValidationError("CSV requires unique non-empty headers")
            missing = sorted(set(required_fields) - set(headers))
            if missing:
                raise ValidationError("CSV is missing columns: " + ", ".join(missing))
            reader.fieldnames = headers
            records: list[dict[str, str]] = []
            for row_number, row in enumerate(reader, start=2):
                if row_number > MAX_ROWS + 1:
                    raise ValidationError(f"CSV exceeds {MAX_ROWS} rows")
                if None in row:
                    raise ValidationError(f"row {row_number} has more cells than headers")
                cleaned = {key: (value or "").strip() for key, value in row.items()}
                if any("\x00" in value or len(value) > MAX_CELL_CHARS for value in cleaned.values()):
                    raise ValidationError(f"row {row_number} contains an invalid or oversized cell")
                if any(cleaned.values()):
                    records.append(cleaned)
    except (UnicodeDecodeError, csv.Error) as exc:
        raise ValidationError(f"invalid UTF-8 CSV: {exc}") from exc
    if not records:
        raise ValidationError("CSV requires at least one data row")
    return records


def require_object(value: Any, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValidationError(f"{context} must be an object")
    return value


def require_list(value: Any, context: str, minimum: int = 0, maximum: int = MAX_ROWS) -> list[Any]:
    if not isinstance(value, list) or not minimum <= len(value) <= maximum:
        raise ValidationError(f"{context} must contain between {minimum} and {maximum} items")
    return value


def require_text(value: Any, context: str, allow_empty: bool = False, maximum: int = MAX_CELL_CHARS) -> str:
    if not isinstance(value, str):
        raise ValidationError(f"{context} must be text")
    text = value.strip()
    if not text and not allow_empty:
        raise ValidationError(f"{context} must not be empty")
    if len(text) > maximum or "\x00" in text:
        raise ValidationError(f"{context} is invalid or oversized")
    return text


def require_identifier(value: Any, context: str) -> str:
    text = require_text(value, context, maximum=96)
    if not IDENTIFIER_RE.fullmatch(text):
        raise ValidationError(f"{context} must match {IDENTIFIER_RE.pattern}")
    return text


def require_unique(values: Iterable[str], context: str) -> None:
    values = list(values)
    duplicates = sorted({value for value in values if values.count(value) > 1})
    if duplicates:
        raise ValidationError(f"{context} contains duplicate IDs: {', '.join(duplicates)}")


def number(value: Any, context: str, minimum: float = -1e18, maximum: float = 1e18) -> float:
    if isinstance(value, bool):
        raise ValidationError(f"{context} must be numeric")
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{context} must be numeric") from exc
    if not math.isfinite(parsed) or not minimum <= parsed <= maximum:
        raise ValidationError(f"{context} must be finite and between {minimum} and {maximum}")
    return parsed


def fraction(value: Any, context: str) -> float:
    return number(value, context, 0.0, 1.0)


def write_json(data: Any, output: str | Path | None, *, force: bool = False) -> None:
    serialized = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if output is None:
        print(serialized, end="")
        return
    destination = safe_output_path(output, force=force)
    temporary: str | None = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=destination.parent, prefix=f".{destination.name}.", suffix=".tmp", delete=False) as handle:
            handle.write(serialized)
            temporary = handle.name
        os.replace(temporary, destination)
    finally:
        if temporary and Path(temporary).exists():
            Path(temporary).unlink()


def error_exit(exc: ValidationError) -> int:
    print(f"ERROR: {exc}", file=os.sys.stderr)
    return 2


@dataclass
class _Line:
    indent: int
    text: str
    number: int


def _split_key(text: str) -> tuple[str, str] | None:
    quote: str | None = None
    depth = 0
    for index, char in enumerate(text):
        if char in "'\"":
            quote = None if quote == char else (char if quote is None else quote)
        elif quote is None:
            depth += 1 if char in "[{" else -1 if char in "]}" else 0
            if char == ":" and depth == 0:
                return text[:index].strip(), text[index + 1 :].strip()
    return None


class _FlowParser:
    """Parse the bounded YAML flow syntax used by package artifacts."""

    def __init__(self, source: str):
        self.source = source
        self.index = 0

    def parse(self) -> Any:
        value = self._value()
        self._space()
        if self.index != len(self.source):
            raise ValidationError(f"unsupported flow YAML near: {self.source[self.index:]}")
        return value

    def _space(self) -> None:
        while self.index < len(self.source) and self.source[self.index].isspace():
            self.index += 1

    def _value(self) -> Any:
        self._space()
        if self.index >= len(self.source):
            return ""
        char = self.source[self.index]
        if char == "[":
            return self._sequence()
        if char == "{":
            return self._mapping()
        if char in "'\"":
            return self._quoted(char)
        return _scalar(self._bare())

    def _quoted(self, quote: str) -> str:
        self.index += 1
        result: list[str] = []
        while self.index < len(self.source):
            char = self.source[self.index]
            self.index += 1
            if char == quote:
                if quote == "'" and self.index < len(self.source) and self.source[self.index] == "'":
                    result.append("'")
                    self.index += 1
                    continue
                return "".join(result)
            if char == "\\" and quote == '"' and self.index < len(self.source):
                escaped = self.source[self.index]
                self.index += 1
                result.append({"n": "\n", "r": "\r", "t": "\t"}.get(escaped, escaped))
            else:
                result.append(char)
        raise ValidationError("unterminated quoted scalar in flow YAML")

    def _bare(self) -> str:
        start = self.index
        while self.index < len(self.source) and self.source[self.index] not in ",]}":
            self.index += 1
        return self.source[start:self.index].strip()

    def _sequence(self) -> list[Any]:
        self.index += 1
        result: list[Any] = []
        while True:
            self._space()
            if self.index < len(self.source) and self.source[self.index] == "]":
                self.index += 1
                return result
            result.append(self._value())
            self._space()
            if self.index < len(self.source) and self.source[self.index] == ",":
                self.index += 1
                continue
            if self.index < len(self.source) and self.source[self.index] == "]":
                self.index += 1
                return result
            raise ValidationError("invalid flow YAML sequence")

    def _mapping(self) -> dict[str, Any]:
        self.index += 1
        result: dict[str, Any] = {}
        while True:
            self._space()
            if self.index < len(self.source) and self.source[self.index] == "}":
                self.index += 1
                return result
            if self.index >= len(self.source):
                raise ValidationError("unterminated flow YAML mapping")
            key = self._quoted(self.source[self.index]) if self.source[self.index] in "'\"" else self._bare_key()
            self._space()
            if self.index >= len(self.source) or self.source[self.index] != ":":
                raise ValidationError("invalid flow YAML mapping")
            self.index += 1
            result[str(key)] = self._value()
            self._space()
            if self.index < len(self.source) and self.source[self.index] == ",":
                self.index += 1
                continue
            if self.index < len(self.source) and self.source[self.index] == "}":
                self.index += 1
                return result
            raise ValidationError("invalid flow YAML mapping")

    def _bare_key(self) -> str:
        start = self.index
        while self.index < len(self.source) and self.source[self.index] != ":":
            self.index += 1
        return self.source[start:self.index].strip()


def _scalar(text: str) -> Any:
    text = text.strip()
    if not text:
        return ""
    if text[0] in "[{'\"":
        return _FlowParser(text).parse()
    lowered = text.casefold()
    if lowered in {"null", "~"}:
        return None
    if lowered in {"true", "false"}:
        return lowered == "true"
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    if re.fullmatch(r"-?(?:\d+\.\d*|\d*\.\d+)", text):
        return float(text)
    return text


class _YamlParser:
    def __init__(self, content: str):
        self.lines: list[_Line] = []
        for number_value, original in enumerate(content.splitlines(), 1):
            if "\t" in original[: len(original) - len(original.lstrip())]:
                raise ValidationError(f"tabs are unsupported at line {number_value}")
            stripped = original.rstrip()
            if not stripped.strip() or stripped.lstrip().startswith("#") or stripped.strip() in {"---", "..."}:
                continue
            indent = len(stripped) - len(stripped.lstrip(" "))
            self.lines.append(_Line(indent, stripped.strip(), number_value))

    def parse(self) -> Any:
        if not self.lines:
            return None
        value, index = self._node(0, self.lines[0].indent)
        if index != len(self.lines):
            raise ValidationError(f"unexpected YAML at line {self.lines[index].number}")
        return value

    def _node(self, index: int, indent: int) -> tuple[Any, int]:
        return self._sequence(index, indent) if self.lines[index].text.startswith("-") else self._mapping(index, indent)

    def _mapping(self, index: int, indent: int, initial: dict[str, Any] | None = None) -> tuple[dict[str, Any], int]:
        result = initial or {}
        while index < len(self.lines):
            line = self.lines[index]
            if line.indent < indent or (line.indent == indent and line.text.startswith("-")):
                break
            if line.indent != indent:
                raise ValidationError(f"unexpected indentation at line {line.number}")
            pair = _split_key(line.text)
            if pair is None:
                raise ValidationError(f"expected key at line {line.number}")
            key, raw = pair
            index += 1
            if raw:
                result[key] = _scalar(raw)
            elif index < len(self.lines) and self.lines[index].indent > indent:
                result[key], index = self._node(index, self.lines[index].indent)
            else:
                result[key] = None
        return result, index

    def _sequence(self, index: int, indent: int) -> tuple[list[Any], int]:
        result: list[Any] = []
        while index < len(self.lines):
            line = self.lines[index]
            if line.indent != indent or not line.text.startswith("-"):
                break
            raw = line.text[1:].strip()
            index += 1
            pair = _split_key(raw) if raw else None
            if pair:
                key, tail = pair
                item: dict[str, Any] = {key: _scalar(tail) if tail else None}
                if index < len(self.lines) and self.lines[index].indent == indent + 2:
                    item, index = self._mapping(index, indent + 2, item)
                result.append(item)
            elif raw:
                result.append(_scalar(raw))
            elif index < len(self.lines) and self.lines[index].indent > indent:
                value, index = self._node(index, self.lines[index].indent)
                result.append(value)
            else:
                result.append(None)
        return result, index


def read_document(raw_path: str | Path) -> Any:
    path = safe_input_path(raw_path, {".json", ".yaml", ".yml"})
    text = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() == ".json":
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValidationError(f"invalid JSON: {exc}") from exc
    return _YamlParser(text).parse()


def finding_ids(raw_path: str | Path) -> set[str]:
    data = require_object(read_document(raw_path), "Findings Register")
    findings = require_list(data.get("findings"), "findings", minimum=1)
    identifiers = {
        require_identifier(require_object(item, f"findings[{index}]").get("finding_id"), f"findings[{index}].finding_id")
        for index, item in enumerate(findings)
    }
    if len(identifiers) != len(findings):
        raise ValidationError("Findings Register contains duplicate finding IDs")
    return identifiers
