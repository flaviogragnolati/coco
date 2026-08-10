from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class Line:
    indent: int
    text: str
    number: int


def _strip_comment(value: str) -> str:
    quote = None
    escaped = False
    for index, char in enumerate(value):
        if escaped:
            escaped = False
            continue
        if char == '\\' and quote == '"':
            escaped = True
            continue
        if char in ('\'', '"'):
            quote = None if quote == char else (char if quote is None else quote)
        elif char == '#' and quote is None and (index == 0 or value[index - 1].isspace()):
            return value[:index].rstrip()
    return value.rstrip()


def _split_key(value: str) -> tuple[str, str] | None:
    quote = None
    depth = 0
    for index, char in enumerate(value):
        if char in ('\'', '"'):
            quote = None if quote == char else (char if quote is None else quote)
        elif quote is None:
            if char in '[{':
                depth += 1
            elif char in ']}':
                depth -= 1
            elif char == ':' and depth == 0:
                return value[:index].strip(), value[index + 1:].strip()
    return None


class FlowParser:
    def __init__(self, source: str):
        self.source = source
        self.index = 0

    def parse(self) -> Any:
        value = self.value()
        self.space()
        if self.index != len(self.source):
            raise ValueError(f'Unexpected flow YAML near {self.source[self.index:]}')
        return value

    def space(self):
        while self.index < len(self.source) and self.source[self.index].isspace():
            self.index += 1

    def value(self) -> Any:
        self.space()
        if self.index >= len(self.source):
            return ''
        char = self.source[self.index]
        if char == '[':
            return self.sequence()
        if char == '{':
            return self.mapping()
        if char in ('\'', '"'):
            return self.quoted(char)
        return scalar(self.bare())

    def quoted(self, quote: str) -> str:
        self.index += 1
        result = []
        while self.index < len(self.source):
            char = self.source[self.index]
            self.index += 1
            if char == quote:
                if quote == '\'' and self.index < len(self.source) and self.source[self.index] == '\'':
                    result.append('\'')
                    self.index += 1
                    continue
                return ''.join(result)
            if char == '\\' and quote == '"' and self.index < len(self.source):
                escaped = self.source[self.index]
                self.index += 1
                result.append({'n': '\n', 'r': '\r', 't': '\t'}.get(escaped, escaped))
            else:
                result.append(char)
        raise ValueError('Unterminated quoted scalar')

    def bare(self) -> str:
        start = self.index
        while self.index < len(self.source) and self.source[self.index] not in ',]}':
            self.index += 1
        return self.source[start:self.index].strip()

    def sequence(self) -> list[Any]:
        self.index += 1
        result = []
        while True:
            self.space()
            if self.index < len(self.source) and self.source[self.index] == ']':
                self.index += 1
                return result
            result.append(self.value())
            self.space()
            if self.index < len(self.source) and self.source[self.index] == ',':
                self.index += 1
                continue
            if self.index < len(self.source) and self.source[self.index] == ']':
                self.index += 1
                return result
            raise ValueError('Invalid flow sequence')

    def mapping(self) -> dict[str, Any]:
        self.index += 1
        result = {}
        while True:
            self.space()
            if self.index < len(self.source) and self.source[self.index] == '}':
                self.index += 1
                return result
            key = self.quoted(self.source[self.index]) if self.source[self.index] in ('\'', '"') else self.bare_key()
            self.space()
            if self.index >= len(self.source) or self.source[self.index] != ':':
                raise ValueError('Invalid flow mapping')
            self.index += 1
            result[str(key)] = self.value()
            self.space()
            if self.index < len(self.source) and self.source[self.index] == ',':
                self.index += 1
                continue
            if self.index < len(self.source) and self.source[self.index] == '}':
                self.index += 1
                return result
            raise ValueError('Invalid flow mapping')

    def bare_key(self) -> str:
        start = self.index
        while self.index < len(self.source) and self.source[self.index] != ':':
            self.index += 1
        return self.source[start:self.index].strip()


def scalar(value: str) -> Any:
    value = value.strip()
    if not value:
        return ''
    if value[0] in '[{':
        return FlowParser(value).parse()
    if value[0] in ('\'', '"'):
        return FlowParser(value).parse()
    lowered = value.casefold()
    if lowered in ('null', '~'):
        return None
    if lowered in ('true', 'false'):
        return lowered == 'true'
    if re.fullmatch(r'-?\d+', value):
        return int(value)
    if re.fullmatch(r'-?(?:\d+\.\d*|\d*\.\d+)', value):
        return float(value)
    return value


class Parser:
    def __init__(self, content: str):
        self.raw = content.splitlines()
        self.lines = []
        for number, original in enumerate(self.raw, 1):
            if '\t' in original[:len(original) - len(original.lstrip())]:
                raise ValueError(f'Tabs are not supported for indentation at line {number}')
            cleaned = _strip_comment(original)
            if not cleaned.strip() or cleaned.strip() in ('---', '...'):
                continue
            indent = len(cleaned) - len(cleaned.lstrip(' '))
            self.lines.append(Line(indent, cleaned.strip(), number))

    def parse(self) -> Any:
        if not self.lines:
            return None
        value, index = self.node(0, self.lines[0].indent)
        if index != len(self.lines):
            raise ValueError(f'Unexpected YAML at line {self.lines[index].number}')
        return value

    def node(self, index: int, indent: int) -> tuple[Any, int]:
        if self.lines[index].text.startswith('-'):
            return self.sequence(index, indent)
        return self.mapping(index, indent)

    def block_scalar(self, index: int, parent_indent: int, folded: bool) -> tuple[str, int]:
        values = []
        while index < len(self.lines) and self.lines[index].indent > parent_indent:
            values.append(self.lines[index].text)
            index += 1
        return ((' ' if folded else '\n').join(values), index)

    def mapping(
        self, index: int, indent: int, initial: dict[str, Any] | None = None
    ) -> tuple[dict[str, Any], int]:
        result = initial or {}
        while index < len(self.lines):
            line = self.lines[index]
            if line.indent < indent or (line.indent == indent and line.text.startswith('-')):
                break
            if line.indent != indent:
                raise ValueError(f'Unexpected indentation at line {line.number}')
            pair = _split_key(line.text)
            if not pair:
                raise ValueError(f'Expected key and value at line {line.number}')
            key, raw = pair
            index += 1
            if raw in ('|', '>'):
                result[key], index = self.block_scalar(index, indent, raw == '>')
            elif raw:
                result[key] = scalar(raw)
            elif index < len(self.lines) and self.lines[index].indent > indent:
                result[key], index = self.node(index, self.lines[index].indent)
            else:
                result[key] = None
        return result, index

    def sequence(self, index: int, indent: int) -> tuple[list[Any], int]:
        result = []
        while index < len(self.lines):
            line = self.lines[index]
            if line.indent != indent or not line.text.startswith('-'):
                break
            raw = line.text[1:].strip()
            index += 1
            if not raw:
                if index < len(self.lines) and self.lines[index].indent > indent:
                    value, index = self.node(index, self.lines[index].indent)
                else:
                    value = None
            else:
                pair = _split_key(raw)
                if pair:
                    key, tail = pair
                    item = {key: scalar(tail) if tail else None}
                    if not tail and index < len(self.lines) and self.lines[index].indent > indent + 2:
                        item[key], index = self.node(index, self.lines[index].indent)
                    if index < len(self.lines) and self.lines[index].indent == indent + 2:
                        item, index = self.mapping(index, indent + 2, item)
                    value = item
                else:
                    value = scalar(raw)
                    if index < len(self.lines) and self.lines[index].indent > indent:
                        raise ValueError(f'Unexpected nested content at line {self.lines[index].number}')
            result.append(value)
        return result, index


def loads(content: str) -> Any:
    return Parser(content).parse()


def load(path: Path) -> Any:
    return loads(path.read_text(encoding='utf-8-sig'))
