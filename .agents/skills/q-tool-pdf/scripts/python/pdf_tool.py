#!/usr/bin/env python3
"""Runtime-neutral PDF command adapter for the q-tool-pdf skill.

This implementation is original to the Quasar skill package. It intentionally
keeps high-risk or native capabilities behind qpdf, Poppler, and OCRmyPDF rather
than reimplementing them incompletely.
"""

from __future__ import annotations

import argparse
import contextlib
import importlib.metadata
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, Sequence

EXIT_ARGUMENT = 2
EXIT_INPUT = 3
EXIT_DEPENDENCY = 4
EXIT_UNSUPPORTED = 5
EXIT_OUTPUT = 6
EXIT_AUTH = 7
EXIT_PARTIAL = 8

PDF_HEADER = b"%PDF-"
ALLOW_OVERWRITE = False


class ToolError(RuntimeError):
    def __init__(self, message: str, code: int = EXIT_OUTPUT, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


@dataclass
class Result:
    command: str
    backend: list[str]
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)
    ok: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "command": self.command,
            "runtime": os.environ.get("PDF_SKILL_SELECTED_RUNTIME", "python"),
            "backend": self.backend,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "warnings": self.warnings,
            "details": self.details,
        }


@dataclass
class GlobalFlags:
    json: bool = False
    quiet: bool = False
    overwrite: bool = False


def extract_global_flags(argv: Sequence[str]) -> tuple[GlobalFlags, list[str]]:
    flags = GlobalFlags()
    cleaned: list[str] = []
    iterator = iter(range(len(argv)))
    skip: set[int] = set()
    for i, token in enumerate(argv):
        if i in skip:
            continue
        if token == "--json":
            flags.json = True
        elif token == "--quiet":
            flags.quiet = True
        elif token == "--overwrite":
            flags.overwrite = True
        elif token == "--runtime":
            # Backend-direct calls may still contain the dispatcher option.
            if i + 1 >= len(argv):
                raise ToolError("--runtime requires a value", EXIT_ARGUMENT)
            skip.add(i + 1)
        else:
            cleaned.append(token)
    return flags, cleaned


def eprint(message: str, *, flags: GlobalFlags | None = None) -> None:
    if flags is None or not flags.quiet:
        print(message, file=sys.stderr)


def emit_result(result: Result, flags: GlobalFlags) -> None:
    if flags.json:
        print(json.dumps(result.as_dict(), ensure_ascii=False, indent=2))
        return
    if not flags.quiet:
        status = "OK" if result.ok else "FAILED"
        print(f"[{status}] {result.command}")
        if result.outputs:
            print("Outputs:")
            for item in result.outputs:
                print(f"  - {item}")
        for warning in result.warnings:
            print(f"Warning: {warning}", file=sys.stderr)
        if result.details:
            print(json.dumps(result.details, ensure_ascii=False, indent=2, default=str))


def emit_error(command: str, error: ToolError, flags: GlobalFlags) -> None:
    payload = {
        "ok": False,
        "command": command,
        "runtime": os.environ.get("PDF_SKILL_SELECTED_RUNTIME", "python"),
        "backend": [],
        "inputs": [],
        "outputs": [],
        "warnings": [],
        "error": str(error),
        "details": error.details,
    }
    if flags.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"Error: {error}", file=sys.stderr)
        if error.details:
            print(json.dumps(error.details, ensure_ascii=False, indent=2, default=str), file=sys.stderr)


def require_file(path_value: str | Path, label: str = "input") -> Path:
    path = Path(path_value).expanduser()
    if not path.is_file():
        raise ToolError(f"{label} file does not exist: {path}", EXIT_INPUT)
    return path


def ensure_distinct_output(output: Path, inputs: Iterable[Path]) -> None:
    out_resolved = output.expanduser().resolve(strict=False)
    for source in inputs:
        if out_resolved == source.expanduser().resolve(strict=False):
            raise ToolError(
                f"output must differ from input: {output}",
                EXIT_ARGUMENT,
            )


def ensure_output_available(output: Path) -> None:
    if output.expanduser().exists() and not ALLOW_OVERWRITE:
        raise ToolError(
            f"output exists; pass --overwrite only after explicit approval: {output}",
            EXIT_ARGUMENT,
        )


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def require_pypdf() -> Any:
    try:
        import pypdf

        return pypdf
    except ImportError as exc:
        raise ToolError(
            "pypdf is not installed; install scripts/python/pyproject.toml",
            EXIT_DEPENDENCY,
        ) from exc


def require_pdfplumber() -> Any:
    try:
        import pdfplumber

        return pdfplumber
    except ImportError as exc:
        raise ToolError(
            "pdfplumber is required for table extraction",
            EXIT_DEPENDENCY,
        ) from exc


def get_password(env_name: str | None, *, required: bool = False) -> str | None:
    name = env_name or "PDF_PASSWORD"
    value = os.environ.get(name)
    if required and value is None:
        raise ToolError(f"required password environment variable is not set: {name}", EXIT_AUTH)
    if value is not None and ("\n" in value or "\r" in value):
        raise ToolError("password environment values must not contain newlines", EXIT_AUTH)
    return value


def open_reader(path: Path, *, password_env: str | None = None, strict: bool = False) -> Any:
    pypdf = require_pypdf()
    try:
        reader = pypdf.PdfReader(str(path), strict=strict)
    except Exception as exc:
        raise ToolError(f"unable to open PDF: {path}: {exc}", EXIT_INPUT) from exc
    if reader.is_encrypted:
        password = get_password(password_env)
        if password is None:
            raise ToolError(
                f"PDF is encrypted and no password was supplied through {password_env or 'PDF_PASSWORD'}: {path}",
                EXIT_AUTH,
            )
        try:
            status = reader.decrypt(password)
        except Exception as exc:
            raise ToolError(f"unable to decrypt PDF: {path}: {exc}", EXIT_AUTH) from exc
        if not status:
            raise ToolError(f"password did not unlock PDF: {path}", EXIT_AUTH)
    return reader


def json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(v) for v in value]
    try:
        resolved = value.get_object()
        if resolved is not value:
            return json_safe(resolved)
    except Exception:
        pass
    return str(value)


@contextlib.contextmanager
def temporary_sibling(output: Path) -> Iterator[Path]:
    output = output.expanduser()
    ensure_output_available(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    suffix = output.suffix
    temp = output.parent / f".{output.name}.{uuid.uuid4().hex}.tmp{suffix}"
    try:
        yield temp
    finally:
        with contextlib.suppress(FileNotFoundError):
            temp.unlink()


def prepare_output_directory(path: Path, *, label: str = "output directory") -> Path:
    path = path.expanduser()
    if path.exists():
        if not path.is_dir():
            raise ToolError(f"{label} is not a directory: {path}", EXIT_ARGUMENT)
        if any(path.iterdir()):
            raise ToolError(f"{label} must be empty to avoid mixing stale and new files: {path}", EXIT_ARGUMENT)
    else:
        path.mkdir(parents=True, exist_ok=False)
    return path


def validate_pdf_header(path: Path) -> None:
    try:
        size = path.stat().st_size
        with path.open("rb") as handle:
            header = handle.read(8)
    except OSError as exc:
        raise ToolError(f"unable to read generated PDF: {path}: {exc}", EXIT_OUTPUT) from exc
    if size < 8 or not header.startswith(PDF_HEADER):
        raise ToolError(f"generated file is not a readable PDF container: {path}", EXIT_OUTPUT)


def validate_pdf_with_pypdf(path: Path, *, password: str | None = None) -> None:
    pypdf = require_pypdf()
    try:
        reader = pypdf.PdfReader(str(path), strict=False)
        if reader.is_encrypted:
            if password is None or not reader.decrypt(password):
                return
        _ = len(reader.pages)
    except Exception as exc:
        raise ToolError(f"generated PDF failed reopen validation: {path}: {exc}", EXIT_OUTPUT) from exc


def write_writer_atomic(writer: Any, output: Path, inputs: Iterable[Path]) -> None:
    ensure_distinct_output(output, inputs)
    with temporary_sibling(output) as temp:
        try:
            with temp.open("wb") as handle:
                writer.write(handle)
        except Exception as exc:
            raise ToolError(f"failed to write PDF: {output}: {exc}", EXIT_OUTPUT) from exc
        validate_pdf_header(temp)
        validate_pdf_with_pypdf(temp)
        os.replace(temp, output)


def write_text_atomic(output: Path, text: str) -> None:
    output = output.expanduser()
    with temporary_sibling(output) as temp:
        temp.write_text(text, encoding="utf-8")
        os.replace(temp, output)


def write_json_atomic(output: Path, data: Any) -> None:
    write_text_atomic(output, json.dumps(data, ensure_ascii=False, indent=2, default=json_safe) + "\n")


def run_process(
    command: list[str],
    *,
    stdin_text: str | None = None,
    allowed_codes: set[int] | None = None,
    secret: bool = False,
) -> subprocess.CompletedProcess[str]:
    allowed = allowed_codes or {0}
    try:
        completed = subprocess.run(
            command,
            input=stdin_text,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except FileNotFoundError as exc:
        raise ToolError(f"required executable is not installed: {command[0]}", EXIT_DEPENDENCY) from exc
    if completed.returncode not in allowed:
        visible = command[0] if secret else " ".join(command)
        details = (
            {"diagnostics": "suppressed because the command received secret input"}
            if secret
            else {"stdout": completed.stdout[-4000:], "stderr": completed.stderr[-4000:]}
        )
        raise ToolError(
            f"command failed ({completed.returncode}): {visible}",
            EXIT_OUTPUT,
            details,
        )
    return completed


def run_qpdf_args(args: list[str], *, allowed_codes: set[int] | None = None) -> subprocess.CompletedProcess[str]:
    if shutil.which("qpdf") is None:
        raise ToolError("qpdf is not installed", EXIT_DEPENDENCY)
    for arg in args:
        if "\n" in arg or "\r" in arg:
            raise ToolError("qpdf arguments must not contain newlines", EXIT_ARGUMENT)
    payload = "\n".join(args) + "\n"
    return run_process(["qpdf", "@-"], stdin_text=payload, allowed_codes=allowed_codes, secret=True)


@contextlib.contextmanager
def native_readable_pdf(source: Path) -> Iterator[tuple[Path, bool]]:
    """Yield a path suitable for native tools without exposing passwords in argv.

    Unencrypted files are yielded directly. Encrypted files are decrypted into a
    private temporary directory through qpdf's @- argument input and removed on
    exit. The boolean indicates whether a clear-text working copy was created.
    """

    encrypted: bool | None = None
    try:
        pypdf = require_pypdf()
        probe = pypdf.PdfReader(str(source), strict=False)
        encrypted = bool(probe.is_encrypted)
    except ToolError:
        raise
    except Exception:
        # Let the native tool attempt malformed-but-readable files. If a password
        # was supplied, qpdf below is still the safe preprocessing route.
        encrypted = None

    if encrypted is False:
        yield source, False
        return

    password = get_password("PDF_PASSWORD")
    if encrypted is None and password is None:
        yield source, False
        return
    if encrypted is True and password is None:
        raise ToolError("encrypted input requires PDF_PASSWORD for native-tool processing", EXIT_AUTH)
    if shutil.which("qpdf") is None:
        if encrypted is True:
            raise ToolError(
                "qpdf is required to pass encrypted input to native tools without exposing the password in process arguments",
                EXIT_DEPENDENCY,
            )
        yield source, False
        return

    assert password is not None
    with tempfile.TemporaryDirectory(prefix="q-tool-pdf-clear-") as directory:
        clear = Path(directory) / "working.pdf"
        run_qpdf_args([str(source), f"--password={password}", "--decrypt", str(clear)])
        validate_pdf_header(clear)
        validate_pdf_with_pypdf(clear)
        yield clear, True


def parse_page_spec(spec: str, page_count: int, *, allow_duplicates: bool = True) -> list[int]:
    raw = spec.strip().lower()
    if page_count < 1:
        raise ToolError("PDF contains no pages", EXIT_INPUT)
    if raw == "all":
        return list(range(page_count))
    if raw == "odd":
        return list(range(0, page_count, 2))
    if raw == "even":
        pages = list(range(1, page_count, 2))
        if not pages:
            raise ToolError("page selection resolves to no pages", EXIT_ARGUMENT)
        return pages
    if not raw:
        raise ToolError("page specification is empty", EXIT_ARGUMENT)

    pages: list[int] = []
    for token in raw.split(","):
        token = token.strip()
        if not token:
            raise ToolError(f"malformed page specification: {spec}", EXIT_ARGUMENT)
        if token == "last":
            values = [page_count]
        elif re.fullmatch(r"\d+", token):
            values = [int(token)]
        else:
            match = re.fullmatch(r"(\d+|last)-(\d+|last)", token)
            if not match:
                raise ToolError(f"invalid page token: {token}", EXIT_ARGUMENT)
            start = page_count if match.group(1) == "last" else int(match.group(1))
            end = page_count if match.group(2) == "last" else int(match.group(2))
            if end < start:
                raise ToolError(f"descending page range is not allowed: {token}", EXIT_ARGUMENT)
            values = list(range(start, end + 1))
        for value in values:
            if value < 1 or value > page_count:
                raise ToolError(
                    f"page {value} is outside document range 1-{page_count}",
                    EXIT_ARGUMENT,
                )
            index = value - 1
            if not allow_duplicates and index in pages:
                raise ToolError(f"duplicate page is not allowed for this operation: {value}", EXIT_ARGUMENT)
            pages.append(index)
    return pages


def parse_box(value: str) -> tuple[float, float, float, float]:
    try:
        parts = [float(item.strip()) for item in value.split(",")]
    except ValueError as exc:
        raise ToolError("crop box must contain four numbers", EXIT_ARGUMENT) from exc
    if len(parts) != 4:
        raise ToolError("crop box must be LEFT,BOTTOM,RIGHT,TOP", EXIT_ARGUMENT)
    left, bottom, right, top = parts
    if right <= left or top <= bottom:
        raise ToolError("crop box requires RIGHT > LEFT and TOP > BOTTOM", EXIT_ARGUMENT)
    return left, bottom, right, top


def copy_metadata(reader: Any, writer: Any) -> None:
    metadata = reader.metadata
    if not metadata:
        return
    cleaned = {str(k): str(v) for k, v in metadata.items() if v is not None}
    if cleaned:
        with contextlib.suppress(Exception):
            writer.add_metadata(cleaned)


def field_type_name(field: Any) -> str:
    ft = str(field.get("/FT", ""))
    flags = int(field.get("/Ff", 0) or 0)
    if ft == "/Tx":
        return "text"
    if ft == "/Ch":
        return "choice"
    if ft == "/Sig":
        return "signature"
    if ft == "/Btn":
        if flags & (1 << 16):
            return "push_button"
        if flags & (1 << 15):
            return "radio_group"
        return "checkbox"
    return "unknown"


def collect_widget_locations(reader: Any) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    for page_number, page in enumerate(reader.pages, start=1):
        annotations = page.get("/Annots") or []
        for annotation_ref in annotations:
            try:
                annotation = annotation_ref.get_object()
            except Exception:
                continue
            if str(annotation.get("/Subtype")) != "/Widget":
                continue
            field = annotation
            name_parts: list[str] = []
            visited: set[int] = set()
            while field is not None:
                object_id = id(field)
                if object_id in visited:
                    break
                visited.add(object_id)
                if field.get("/T") is not None:
                    name_parts.append(str(field.get("/T")))
                parent = field.get("/Parent")
                field = parent.get_object() if parent is not None else None
            name = ".".join(reversed(name_parts))
            if not name:
                continue
            rect = json_safe(annotation.get("/Rect"))
            result.setdefault(name, []).append({"page": page_number, "rect": rect})
    return result


def field_options(field: Any) -> list[Any]:
    states = field.get("/_States_")
    if states is not None:
        resolved_states = states.get_object() if hasattr(states, "get_object") else states
        normalized_states = [str(value).lstrip("/") for value in resolved_states]
        visible_states = [value for value in normalized_states if value != "Off"]
        if visible_states:
            return visible_states
    options = field.get("/Opt")
    if options is None:
        appearances = field.get("/AP")
        try:
            normal = appearances.get_object().get("/N") if appearances else None
            if normal and hasattr(normal, "keys"):
                return [str(key).lstrip("/") for key in normal.keys() if str(key) != "/Off"]
        except Exception:
            return []
        return []
    resolved = options.get_object() if hasattr(options, "get_object") else options
    normalized: list[Any] = []
    for option in resolved:
        option = option.get_object() if hasattr(option, "get_object") else option
        if isinstance(option, (list, tuple)) and len(option) >= 2:
            normalized.append({"value": str(option[0]), "label": str(option[1])})
        else:
            normalized.append(str(option))
    return normalized


def inspect_document(path: Path) -> tuple[dict[str, Any], list[str]]:
    pypdf = require_pypdf()
    warnings: list[str] = []
    try:
        reader = pypdf.PdfReader(str(path), strict=False)
    except Exception as exc:
        raise ToolError(f"unable to inspect PDF: {path}: {exc}", EXIT_INPUT) from exc

    encrypted = bool(reader.is_encrypted)
    unlocked = not encrypted
    if encrypted:
        password = get_password("PDF_PASSWORD")
        if password is not None:
            with contextlib.suppress(Exception):
                unlocked = bool(reader.decrypt(password))
        if not unlocked:
            warnings.append("document is encrypted; page, text, and form details require PDF_PASSWORD")

    details: dict[str, Any] = {
        "path": str(path),
        "size_bytes": path.stat().st_size,
        "encrypted": encrypted,
        "unlocked": unlocked,
        "metadata": {},
        "pages": [],
        "page_count": None,
        "forms": {
            "acroform": False,
            "xfa": False,
            "field_count": None,
            "signature_fields": None,
            "signed_signature_fields": None,
        },
        "text_layer": {"sampled_pages": 0, "pages_with_text": 0, "characters": 0},
    }
    if not unlocked:
        if shutil.which("qpdf"):
            status = run_qpdf_args([str(path), "--requires-password"], allowed_codes={0, 2, 3})
            details["qpdf_password_status"] = {
                "requires_password": status.returncode == 0,
                "unlocked_with_supplied_password": status.returncode == 3,
            }
        return details, warnings

    details["page_count"] = len(reader.pages)
    metadata = reader.metadata or {}
    details["metadata"] = {str(k): json_safe(v) for k, v in metadata.items()}

    for index, page in enumerate(reader.pages):
        media = page.mediabox
        crop = page.cropbox
        details["pages"].append(
            {
                "number": index + 1,
                "media_box": [float(media.left), float(media.bottom), float(media.right), float(media.top)],
                "crop_box": [float(crop.left), float(crop.bottom), float(crop.right), float(crop.top)],
                "width": float(crop.width),
                "height": float(crop.height),
                "rotation": int(page.get("/Rotate", 0) or 0) % 360,
                "annotations": len(page.get("/Annots") or []),
            }
        )

    root = reader.trailer.get("/Root")
    root = root.get_object() if hasattr(root, "get_object") else root
    acroform_ref = root.get("/AcroForm") if root else None
    if acroform_ref is not None:
        acroform = acroform_ref.get_object()
        details["forms"]["acroform"] = True
        details["forms"]["xfa"] = acroform.get("/XFA") is not None
        fields = reader.get_fields() or {}
        details["forms"]["field_count"] = len(fields)
        signature_fields = [field for field in fields.values() if field_type_name(field) == "signature"]
        details["forms"]["signature_fields"] = len(signature_fields)
        details["forms"]["signed_signature_fields"] = sum(
            1 for field in signature_fields if field.get("/V") is not None
        )

    sample_count = min(5, len(reader.pages))
    for page in reader.pages[:sample_count]:
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            warnings.append(f"text extraction warning during preflight: {exc}")
            text = ""
        details["text_layer"]["sampled_pages"] += 1
        if text.strip():
            details["text_layer"]["pages_with_text"] += 1
            details["text_layer"]["characters"] += len(text)

    if details["forms"]["xfa"]:
        warnings.append("XFA is present; ordinary AcroForm edits may not control viewer-visible values")
    if details["forms"]["signed_signature_fields"]:
        warnings.append("populated digital-signature fields are present; any rewrite invalidates signature integrity")
    elif details["forms"]["signature_fields"]:
        warnings.append("blank signature fields are present; verify the intended signature workflow before rewriting")
    return details, warnings


def command_doctor(_: argparse.Namespace) -> Result:
    packages = {
        "pypdf": package_version("pypdf"),
        "pdfplumber": package_version("pdfplumber"),
        "pypdfium2": package_version("pypdfium2"),
        "Pillow": package_version("Pillow"),
        "reportlab": package_version("reportlab"),
    }
    tools: dict[str, Any] = {}
    for executable, version_args in {
        "qpdf": ["--version"],
        "pdftoppm": ["-v"],
        "pdfimages": ["-v"],
        "ocrmypdf": ["--version"],
    }.items():
        path = shutil.which(executable)
        entry: dict[str, Any] = {"available": bool(path), "path": path, "version": None}
        if path:
            completed = run_process([executable, *version_args], allowed_codes={0, 1})
            combined = (completed.stdout + completed.stderr).strip().splitlines()
            entry["version"] = combined[0] if combined else None
        tools[executable] = entry
    has_pypdf = packages["pypdf"] is not None
    capabilities = {
        "inspect": has_pypdf,
        "core_edit": has_pypdf,
        "table_extraction": packages["pdfplumber"] is not None,
        "render": has_pypdf and (packages["pypdfium2"] is not None or tools["pdftoppm"]["available"]),
        "extract_images": has_pypdf and tools["pdfimages"]["available"],
        "structural_check": has_pypdf or tools["qpdf"]["available"],
        "ocr": has_pypdf and tools["ocrmypdf"]["available"],
        "secure_transform": has_pypdf and tools["qpdf"]["available"],
        "programmatic_create": packages["reportlab"] is not None,
    }
    warnings = [name for name, available in capabilities.items() if not available]
    return Result(
        command="doctor",
        backend=["python"],
        warnings=[f"capability unavailable: {name}" for name in warnings],
        details={
            "python": sys.version.split()[0],
            "executable": sys.executable,
            "packages": packages,
            "tools": tools,
            "capabilities": capabilities,
        },
    )


def command_inspect(args: argparse.Namespace) -> Result:
    path = require_file(args.input)
    details, warnings = inspect_document(path)
    return Result("inspect", ["pypdf"], [str(path)], warnings=warnings, details=details)


def command_extract_text(args: argparse.Namespace) -> Result:
    path = require_file(args.input)
    output = Path(args.output).expanduser()
    ensure_distinct_output(output, [path])
    reader = open_reader(path)
    pages: list[str] = []
    backends = ["pypdf"]
    if args.layout and package_version("pdfplumber"):
        pdfplumber = require_pdfplumber()
        backends = ["pdfplumber"]
        try:
            with pdfplumber.open(str(path), password=get_password("PDF_PASSWORD")) as pdf:
                for number, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text(layout=True) or ""
                    pages.append(f"\n--- Page {number} ---\n{text.rstrip()}\n")
        except Exception as exc:
            raise ToolError(f"text extraction failed: {exc}", EXIT_OUTPUT) from exc
    else:
        for number, page in enumerate(reader.pages, start=1):
            try:
                if args.layout:
                    text = page.extract_text(extraction_mode="layout") or ""
                else:
                    text = page.extract_text() or ""
            except TypeError:
                text = page.extract_text() or ""
            except Exception as exc:
                raise ToolError(f"text extraction failed on page {number}: {exc}", EXIT_OUTPUT) from exc
            pages.append(f"\n--- Page {number} ---\n{text.rstrip()}\n")
    write_text_atomic(output, "".join(pages).lstrip())
    return Result(
        "extract-text",
        backends,
        [str(path)],
        [str(output)],
        details={"pages": len(reader.pages), "layout": bool(args.layout)},
    )


def command_merge(args: argparse.Namespace) -> Result:
    pypdf = require_pypdf()
    inputs = [require_file(item) for item in args.inputs]
    if len(inputs) < 2:
        raise ToolError("merge requires at least two input PDFs", EXIT_ARGUMENT)
    output = Path(args.output).expanduser()
    writer = pypdf.PdfWriter()
    warnings: list[str] = []
    seen_fields: set[str] = set()
    duplicates: set[str] = set()
    try:
        for source in inputs:
            reader = open_reader(source)
            fields = reader.get_fields() or {}
            for name in fields:
                if name in seen_fields:
                    duplicates.add(name)
                seen_fields.add(name)
            writer.append(reader)
    except Exception as exc:
        raise ToolError(f"merge failed: {exc}", EXIT_OUTPUT) from exc
    if duplicates:
        warnings.append(
            "duplicate form field names were found across inputs; verify fields do not mirror values: "
            + ", ".join(sorted(duplicates)[:20])
        )
    write_writer_atomic(writer, output, inputs)
    return Result(
        "merge",
        ["pypdf"],
        [str(item) for item in inputs],
        [str(output)],
        warnings=warnings,
        details={"input_count": len(inputs), "page_count": len(writer.pages)},
    )


def command_select(args: argparse.Namespace) -> Result:
    pypdf = require_pypdf()
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    reader = open_reader(source)
    pages = parse_page_spec(args.pages, len(reader.pages), allow_duplicates=True)
    writer = pypdf.PdfWriter()
    writer.append(reader, pages=pages)
    copy_metadata(reader, writer)
    write_writer_atomic(writer, output, [source])
    return Result(
        "select",
        ["pypdf"],
        [str(source)],
        [str(output)],
        details={"selected_pages": [item + 1 for item in pages]},
    )


def command_split(args: argparse.Namespace) -> Result:
    pypdf = require_pypdf()
    source = require_file(args.input)
    output_dir = Path(args.output_dir).expanduser()
    chunk_size = int(args.chunk_size)
    if chunk_size < 1:
        raise ToolError("chunk size must be at least 1", EXIT_ARGUMENT)
    reader = open_reader(source)
    prepare_output_directory(output_dir)
    outputs: list[str] = []
    manifest: list[dict[str, Any]] = []
    manifest_path = output_dir / "manifest.json"
    try:
        for start in range(0, len(reader.pages), chunk_size):
            end = min(start + chunk_size, len(reader.pages))
            writer = pypdf.PdfWriter()
            writer.append(reader, pages=list(range(start, end)))
            copy_metadata(reader, writer)
            name = f"{source.stem}-pages-{start + 1:04d}-{end:04d}.pdf"
            target = output_dir / name
            write_writer_atomic(writer, target, [source])
            outputs.append(str(target))
            manifest.append({"output": str(target), "pages": list(range(start + 1, end + 1))})
    except Exception as exc:
        with contextlib.suppress(Exception):
            write_json_atomic(
                manifest_path,
                {"ok": False, "command": "split", "source": str(source), "chunks": manifest, "error": str(exc)},
            )
        raise
    write_json_atomic(manifest_path, {"ok": True, "source": str(source), "chunks": manifest})
    outputs.append(str(manifest_path))
    return Result(
        "split",
        ["pypdf"],
        [str(source)],
        outputs,
        details={"chunk_size": chunk_size, "chunks": len(manifest)},
    )


def command_rotate(args: argparse.Namespace) -> Result:
    pypdf = require_pypdf()
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    reader = open_reader(source)
    selected = set(parse_page_spec(args.pages, len(reader.pages), allow_duplicates=False))
    degrees = int(args.degrees)
    if degrees not in {-270, -180, -90, 90, 180, 270}:
        raise ToolError("rotation must be one of -270, -180, -90, 90, 180, or 270 degrees", EXIT_ARGUMENT)
    writer = pypdf.PdfWriter()
    writer.append(reader)
    for index, page in enumerate(writer.pages):
        if index in selected:
            page.rotate(degrees)
    copy_metadata(reader, writer)
    write_writer_atomic(writer, output, [source])
    return Result(
        "rotate",
        ["pypdf"],
        [str(source)],
        [str(output)],
        details={"pages": [item + 1 for item in sorted(selected)], "degrees": degrees},
    )


def command_crop(args: argparse.Namespace) -> Result:
    pypdf = require_pypdf()
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    reader = open_reader(source)
    selected = set(parse_page_spec(args.pages, len(reader.pages), allow_duplicates=False))
    box = parse_box(args.box)
    writer = pypdf.PdfWriter()
    writer.append(reader)
    for index, page in enumerate(writer.pages):
        if index in selected:
            page.cropbox = pypdf.generic.RectangleObject(box)
    copy_metadata(reader, writer)
    write_writer_atomic(writer, output, [source])
    return Result(
        "crop",
        ["pypdf"],
        [str(source)],
        [str(output)],
        warnings=["cropping changes the visible box but does not securely remove hidden content"],
        details={"pages": [item + 1 for item in sorted(selected)], "box": list(box)},
    )


def command_watermark(args: argparse.Namespace) -> Result:
    pypdf = require_pypdf()
    source = require_file(args.input)
    stamp_path = require_file(args.stamp, "stamp")
    output = Path(args.output).expanduser()
    reader = open_reader(source)
    stamp_reader = open_reader(stamp_path)
    if not stamp_reader.pages:
        raise ToolError("stamp PDF has no pages", EXIT_INPUT)
    selected = set(parse_page_spec(args.pages, len(reader.pages), allow_duplicates=False))
    stamp = stamp_reader.pages[0]
    sw = float(stamp.mediabox.width)
    sh = float(stamp.mediabox.height)
    if sw <= 0 or sh <= 0:
        raise ToolError("stamp page has invalid dimensions", EXIT_INPUT)
    writer = pypdf.PdfWriter()
    writer.append(reader)
    for index, page in enumerate(writer.pages):
        if index in selected:
            if int(page.get("/Rotate", 0) or 0) % 360:
                with contextlib.suppress(Exception):
                    page.transfer_rotation_to_content()
            pw = float(page.mediabox.width)
            ph = float(page.mediabox.height)
            if args.fit == "stretch":
                sx, sy = pw / sw, ph / sh
                tx = ty = 0.0
            elif args.fit == "contain":
                scale = min(pw / sw, ph / sh)
                sx = sy = scale
                tx = (pw - sw * scale) / 2
                ty = (ph - sh * scale) / 2
            else:
                sx = sy = 1.0
                tx = ty = 0.0
            transform = pypdf.Transformation().scale(sx, sy).translate(tx, ty)
            try:
                page.merge_transformed_page(
                    stamp,
                    transform,
                    over=not bool(args.underlay),
                    expand=False,
                )
            except Exception as exc:
                raise ToolError(f"watermark failed on page {index + 1}: {exc}", EXIT_OUTPUT) from exc
    copy_metadata(reader, writer)
    write_writer_atomic(writer, output, [source, stamp_path])
    return Result(
        "watermark",
        ["pypdf"],
        [str(source), str(stamp_path)],
        [str(output)],
        details={
            "pages": [item + 1 for item in sorted(selected)],
            "underlay": bool(args.underlay),
            "fit": args.fit,
        },
    )


def command_form_list(args: argparse.Namespace) -> Result:
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    ensure_distinct_output(output, [source])
    reader = open_reader(source)
    root = reader.trailer.get("/Root")
    root = root.get_object() if hasattr(root, "get_object") else root
    acroform_ref = root.get("/AcroForm") if root else None
    xfa = False
    if acroform_ref is not None:
        acroform = acroform_ref.get_object()
        xfa = acroform.get("/XFA") is not None
    fields = reader.get_fields() or {}
    locations = collect_widget_locations(reader)
    data: list[dict[str, Any]] = []
    for name, field in fields.items():
        data.append(
            {
                "name": name,
                "type": field_type_name(field),
                "value": json_safe(field.get("/V")),
                "default_value": json_safe(field.get("/DV")),
                "alternate_name": json_safe(field.get("/TU")),
                "mapping_name": json_safe(field.get("/TM")),
                "flags": int(field.get("/Ff", 0) or 0),
                "options": field_options(field),
                "widgets": locations.get(name, []),
            }
        )
    document = {
        "source": str(source),
        "acroform": acroform_ref is not None,
        "xfa": xfa,
        "field_count": len(data),
        "fields": data,
    }
    write_json_atomic(output, document)
    warnings = ["XFA is present; exported AcroForm fields may not control visible viewer behavior"] if xfa else []
    return Result(
        "form-list",
        ["pypdf"],
        [str(source)],
        [str(output)],
        warnings=warnings,
        details={"field_count": len(data), "xfa": xfa},
    )


def load_form_values(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ToolError(f"unable to read form values JSON: {path}: {exc}", EXIT_INPUT) from exc
    fields = payload.get("fields") if isinstance(payload, dict) else None
    if not isinstance(fields, dict):
        raise ToolError("form values JSON must contain an object named 'fields'", EXIT_ARGUMENT)
    return fields


def checkbox_on_value(field: Any) -> str:
    appearances = field.get("/AP")
    try:
        normal = appearances.get_object().get("/N") if appearances else None
        if normal and hasattr(normal, "keys"):
            for key in normal.keys():
                name = str(key)
                if name != "/Off":
                    return name
    except Exception:
        pass
    options = field_options(field)
    if options:
        first = options[0]
        if isinstance(first, dict):
            return "/" + str(first.get("value", "Yes")).lstrip("/")
        return "/" + str(first).lstrip("/")
    return "/Yes"


def normalize_form_values(reader: Any, values: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    fields = reader.get_fields() or {}
    normalized: dict[str, Any] = {}
    warnings: list[str] = []
    missing = sorted(set(values) - set(fields))
    if missing:
        raise ToolError(
            "form values contain unknown field names",
            EXIT_ARGUMENT,
            {"unknown_fields": missing},
        )
    for name, value in values.items():
        field = fields[name]
        kind = field_type_name(field)
        options = field_options(field)
        option_values = {
            str(option.get("value")) if isinstance(option, dict) else str(option)
            for option in options
        }
        option_labels = {
            str(option.get("label")) for option in options if isinstance(option, dict)
        }
        accepted_options = option_values | option_labels
        if kind == "checkbox" and isinstance(value, bool):
            normalized[name] = checkbox_on_value(field) if value else "/Off"
        elif kind == "checkbox" and isinstance(value, str):
            candidate = value.lstrip("/")
            if accepted_options and candidate not in accepted_options and candidate != "Off":
                raise ToolError(f"invalid checkbox export value for {name}: {value}", EXIT_ARGUMENT)
            normalized[name] = "/" + candidate
        elif kind == "radio_group" and isinstance(value, str):
            candidate = value.lstrip("/")
            if accepted_options and candidate not in accepted_options:
                raise ToolError(
                    f"invalid radio option for {name}: {value}",
                    EXIT_ARGUMENT,
                    {"allowed_options": sorted(accepted_options)},
                )
            normalized[name] = "/" + candidate
        elif kind == "choice":
            candidates = value if isinstance(value, list) else [value]
            invalid = [str(item) for item in candidates if accepted_options and str(item) not in accepted_options]
            if invalid:
                raise ToolError(
                    f"invalid choice option for {name}",
                    EXIT_ARGUMENT,
                    {"invalid_options": invalid, "allowed_options": sorted(accepted_options)},
                )
            normalized[name] = value
            if isinstance(value, list):
                warnings.append(f"verify field supports multiple selection: {name}")
        elif kind in {"signature", "push_button", "unknown"}:
            raise ToolError(f"field type is not fillable by this command: {name} ({kind})", EXIT_UNSUPPORTED)
        else:
            normalized[name] = value
    return normalized, warnings


def flatten_widget_appearances(writer: Any) -> int:
    """Materialize each widget's active appearance with a unique XObject name.

    pypdf's built-in flatten path uses the field name as the XObject resource
    name. Radio groups have multiple widgets with the same field name, which can
    make an off-state appearance shadow the selected appearance. Assigning a
    unique resource name per widget preserves each active state before the
    annotations and AcroForm dictionary are removed.
    """

    add_appearance = getattr(writer, "_add_apstream_object", None)
    if add_appearance is None:
        raise ToolError(
            "this pypdf version does not expose the appearance materialization helper required for safe flattening",
            EXIT_UNSUPPORTED,
        )

    flattened = 0
    missing: list[dict[str, Any]] = []
    for page_index, page in enumerate(writer.pages, start=1):
        annotations = page.get("/Annots") or []
        for widget_index, ref in enumerate(annotations, start=1):
            try:
                annotation = ref.get_object()
            except Exception:
                continue
            if str(annotation.get("/Subtype")) != "/Widget":
                continue

            appearance_ref = annotation.get("/AP")
            normal_ref = appearance_ref.get_object().get("/N") if appearance_ref else None
            appearance = None
            if normal_ref is not None:
                normal = normal_ref.get_object()
                if hasattr(normal, "get_data"):
                    appearance = normal
                elif hasattr(normal, "get"):
                    state = annotation.get("/AS") or "/Off"
                    candidate = normal.get(state) or normal.get("/Off")
                    if candidate is not None:
                        appearance = candidate.get_object()

            rect = annotation.get("/Rect")
            if appearance is None or rect is None or len(rect) != 4:
                parent_ref = annotation.get("/Parent")
                parent = parent_ref.get_object() if parent_ref is not None else annotation
                missing.append(
                    {
                        "page": page_index,
                        "field": str(parent.get("/T") or annotation.get("/T") or ""),
                        "state": str(annotation.get("/AS") or ""),
                    }
                )
                continue

            add_appearance(
                page,
                appearance,
                f"widget_{page_index}_{widget_index}",
                float(rect[0]),
                float(rect[1]),
            )
            flattened += 1

    if missing:
        raise ToolError(
            "one or more form widgets have no usable active appearance; refusing to remove interactivity",
            EXIT_UNSUPPORTED,
            {"widgets": missing},
        )
    return flattened


def remove_widget_annotations_and_acroform(writer: Any) -> int:
    removed = 0
    for page in writer.pages:
        annotations = page.get("/Annots")
        if not annotations:
            continue
        kept = []
        for ref in annotations:
            try:
                annotation = ref.get_object()
            except Exception:
                kept.append(ref)
                continue
            if str(annotation.get("/Subtype")) == "/Widget":
                removed += 1
            else:
                kept.append(ref)
        from pypdf.generic import ArrayObject, NameObject

        annots_key = NameObject("/Annots")
        if kept:
            page[annots_key] = ArrayObject(kept)
        else:
            with contextlib.suppress(Exception):
                del page[annots_key]
    root = getattr(writer, "root_object", None) or writer._root_object
    from pypdf.generic import NameObject

    with contextlib.suppress(Exception):
        del root[NameObject("/AcroForm")]
    return removed


def command_form_fill(args: argparse.Namespace) -> Result:
    if args.font:
        raise ToolError(
            "the Python adapter does not embed arbitrary form fonts; route this command to Node with @pdf-lib/fontkit or use an existing AcroForm font",
            EXIT_UNSUPPORTED,
        )
    pypdf = require_pypdf()
    source = require_file(args.input)
    values_path = require_file(args.values, "values")
    output = Path(args.output).expanduser()
    reader = open_reader(source)
    values, warnings = normalize_form_values(reader, load_form_values(values_path))
    requested_fields = sorted(values)
    root = reader.trailer.get("/Root")
    root = root.get_object() if hasattr(root, "get_object") else root
    acroform_ref = root.get("/AcroForm") if root else None
    if acroform_ref is None:
        raise ToolError("PDF does not contain an AcroForm", EXIT_UNSUPPORTED)
    acroform = acroform_ref.get_object()
    if acroform.get("/XFA") is not None:
        raise ToolError("XFA forms require a specialist workflow; refusing to emit potentially contradictory values", EXIT_UNSUPPORTED)
    fields = reader.get_fields() or {}
    signature_fields = [name for name, field in fields.items() if field_type_name(field) == "signature"]
    signed_fields = [name for name in signature_fields if fields[name].get("/V") is not None]
    if signed_fields:
        raise ToolError(
            "the PDF contains populated digital-signature fields; rewriting it would invalidate signature integrity",
            EXIT_UNSUPPORTED,
            {"signed_fields": signed_fields},
        )
    if args.flatten:
        unsupported = [
            name
            for name, field in fields.items()
            if field_type_name(field) in {"signature", "push_button", "unknown"}
        ]
        if unsupported:
            raise ToolError(
                "flattening forms with signature, push-button, or unknown fields is not supported safely",
                EXIT_UNSUPPORTED,
                {"unsupported_fields": unsupported},
            )
        complete_values: dict[str, Any] = {}
        for name, field in fields.items():
            kind = field_type_name(field)
            current = field.get("/V")
            if kind == "text":
                complete_values[name] = "" if current is None else str(current)
            elif kind == "checkbox":
                complete_values[name] = "/Off" if current is None else str(current)
            elif kind == "radio_group":
                if current is not None:
                    complete_values[name] = str(current)
            elif kind == "choice":
                complete_values[name] = "" if current is None else json_safe(current)
        complete_values.update(values)
        values = complete_values
        warnings.append("Python form flattening can expose viewer-specific appearance issues; render every field page")
    writer = pypdf.PdfWriter()
    writer.append(reader)
    try:
        writer.update_page_form_field_values(
            None,
            values,
            auto_regenerate=False,
            flatten=False,
        )
    except Exception as exc:
        raise ToolError(f"form filling failed: {exc}", EXIT_OUTPUT) from exc
    flattened_appearances = 0
    removed_widgets = 0
    if args.flatten:
        flattened_appearances = flatten_widget_appearances(writer)
        removed_widgets = remove_widget_annotations_and_acroform(writer)
    write_writer_atomic(writer, output, [source, values_path])
    return Result(
        "form-fill",
        ["pypdf"],
        [str(source), str(values_path)],
        [str(output)],
        warnings=warnings,
        details={
            "requested_fields": requested_fields,
            "flattened_fields": sorted(values) if args.flatten else [],
            "flatten": bool(args.flatten),
            "flattened_appearances": flattened_appearances,
            "removed_widgets": removed_widgets,
        },
    )


def render_with_pdfium(source: Path, output_dir: Path, dpi: int, fmt: str, pages: list[int]) -> list[str]:
    try:
        import pypdfium2 as pdfium
    except ImportError as exc:
        raise ToolError("pypdfium2 is not installed", EXIT_DEPENDENCY) from exc
    try:
        document = pdfium.PdfDocument(str(source), password=get_password("PDF_PASSWORD"))
    except Exception as exc:
        raise ToolError(f"PDFium could not open PDF: {exc}", EXIT_INPUT) from exc
    outputs: list[str] = []
    scale = dpi / 72.0
    for index in pages:
        page = document[index]
        bitmap = page.render(scale=scale)
        image = bitmap.to_pil()
        suffix = "png" if fmt == "png" else "jpg"
        target = output_dir / f"page-{index + 1:04d}.{suffix}"
        if fmt == "png":
            image.save(target, format="PNG")
        else:
            if image.mode not in {"RGB", "L"}:
                background = image.convert("RGBA")
                from PIL import Image

                flattened = Image.new("RGB", background.size, "white")
                flattened.paste(background, mask=background.getchannel("A"))
                image = flattened
            image.save(target, format="JPEG", quality=90)
        outputs.append(str(target))
        with contextlib.suppress(Exception):
            image.close()
        with contextlib.suppress(Exception):
            bitmap.close()
        with contextlib.suppress(Exception):
            page.close()
    with contextlib.suppress(Exception):
        document.close()
    return outputs


def render_with_poppler(source: Path, output_dir: Path, dpi: int, fmt: str, pages: list[int]) -> list[str]:
    if shutil.which("pdftoppm") is None:
        raise ToolError("pdftoppm is not installed", EXIT_DEPENDENCY)
    outputs: list[str] = []
    for index in pages:
        suffix = "png" if fmt == "png" else "jpg"
        target = output_dir / f"page-{index + 1:04d}.{suffix}"
        prefix = target.with_suffix("")
        command = [
            "pdftoppm",
            "-f",
            str(index + 1),
            "-l",
            str(index + 1),
            "-singlefile",
            "-r",
            str(dpi),
            "-png" if fmt == "png" else "-jpeg",
            str(source),
            str(prefix),
        ]
        run_process(command)
        if not target.is_file():
            raise ToolError(f"renderer did not produce expected file: {target}", EXIT_OUTPUT)
        outputs.append(str(target))
    return outputs


def command_render(args: argparse.Namespace) -> Result:
    source = require_file(args.input)
    output_dir = prepare_output_directory(Path(args.output_dir).expanduser())
    dpi = int(args.dpi)
    if dpi < 36 or dpi > 1200:
        raise ToolError("DPI must be between 36 and 1200", EXIT_ARGUMENT)
    reader = open_reader(source)
    pages = parse_page_spec(args.pages, len(reader.pages), allow_duplicates=False)
    fmt = args.format
    backends: list[str]
    warnings: list[str] = []
    used_clear_copy = False
    outputs: list[str] = []
    manifest = output_dir / "manifest.json"
    try:
        try:
            outputs = render_with_pdfium(source, output_dir, dpi, fmt, pages)
            backends = ["pypdfium2"]
        except ToolError as pdfium_error:
            if pdfium_error.code != EXIT_DEPENDENCY:
                raise
            with native_readable_pdf(source) as (working_source, used_clear_copy):
                outputs = render_with_poppler(working_source, output_dir, dpi, fmt, pages)
            backends = ["pdftoppm"]
    except Exception as exc:
        partial = sorted(
            str(path) for path in output_dir.iterdir() if path.is_file() and path.name != "manifest.json"
        )
        with contextlib.suppress(Exception):
            write_json_atomic(
                manifest,
                {
                    "ok": False,
                    "command": "render",
                    "source": str(source),
                    "dpi": dpi,
                    "format": fmt,
                    "requested_pages": [index + 1 for index in pages],
                    "outputs": partial,
                    "error": str(exc),
                },
            )
        raise
    if used_clear_copy:
        warnings.append("an authorized temporary clear-text working copy was used for Poppler rendering and deleted after use")
    write_json_atomic(
        manifest,
        {
            "ok": True,
            "source": str(source),
            "dpi": dpi,
            "format": fmt,
            "pages": [index + 1 for index in pages],
            "outputs": outputs,
        },
    )
    outputs.append(str(manifest))
    return Result(
        "render",
        backends,
        [str(source)],
        outputs,
        warnings=warnings,
        details={"pages": [index + 1 for index in pages], "dpi": dpi, "format": fmt},
    )


def command_extract_images(args: argparse.Namespace) -> Result:
    source = require_file(args.input)
    output_dir = prepare_output_directory(Path(args.output_dir).expanduser())
    if shutil.which("pdfimages") is None:
        raise ToolError("pdfimages is not installed", EXIT_DEPENDENCY)
    prefix = output_dir / "image"
    manifest = output_dir / "manifest.json"
    used_clear_copy = False
    try:
        with native_readable_pdf(source) as (working_source, used_clear_copy):
            run_process(["pdfimages", "-all", "-p", str(working_source), str(prefix)])
    except Exception as exc:
        partial = sorted(
            str(path) for path in output_dir.iterdir() if path.is_file() and path.name != "manifest.json"
        )
        with contextlib.suppress(Exception):
            write_json_atomic(
                manifest,
                {"ok": False, "command": "extract-images", "source": str(source), "outputs": partial, "error": str(exc)},
            )
        raise
    files = sorted(str(path) for path in output_dir.iterdir() if path.is_file() and path.name != "manifest.json")
    write_json_atomic(manifest, {"ok": True, "source": str(source), "outputs": files})
    files.append(str(manifest))
    return Result(
        "extract-images",
        ["pdfimages"],
        [str(source)],
        files,
        warnings=["an authorized temporary clear-text working copy was used and deleted after image extraction"] if used_clear_copy else [],
        details={"image_count": len(files) - 1},
    )


def command_extract_tables(args: argparse.Namespace) -> Result:
    pdfplumber = require_pdfplumber()
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    ensure_distinct_output(output, [source])
    password = get_password("PDF_PASSWORD")
    tables_out: list[dict[str, Any]] = []
    try:
        with pdfplumber.open(str(source), password=password) as pdf:
            page_indexes = parse_page_spec(args.pages, len(pdf.pages), allow_duplicates=False)
            for index in page_indexes:
                page = pdf.pages[index]
                found = page.find_tables()
                for table_number, table in enumerate(found, start=1):
                    matrix = table.extract()
                    tables_out.append(
                        {
                            "page": index + 1,
                            "table": table_number,
                            "bbox": list(table.bbox),
                            "rows": matrix,
                        }
                    )
    except ToolError:
        raise
    except Exception as exc:
        raise ToolError(f"table extraction failed: {exc}", EXIT_OUTPUT) from exc
    write_json_atomic(
        output,
        {
            "source": str(source),
            "table_count": len(tables_out),
            "tables": tables_out,
        },
    )
    return Result(
        "extract-tables",
        ["pdfplumber"],
        [str(source)],
        [str(output)],
        details={"table_count": len(tables_out)},
    )


def command_check(args: argparse.Namespace) -> Result:
    source = require_file(args.input)
    warnings: list[str] = []
    details: dict[str, Any] = {}
    backends: list[str]
    if shutil.which("qpdf"):
        qpdf_args = [str(source), "--check"]
        password = get_password("PDF_PASSWORD")
        if password is not None:
            qpdf_args.insert(1, f"--password={password}")
        completed = run_qpdf_args(qpdf_args, allowed_codes={0, 3})
        encryption_status = run_qpdf_args([str(source), "--is-encrypted"], allowed_codes={0, 2})
        if password is not None or encryption_status.returncode == 0:
            details["qpdf"] = {
                "returncode": completed.returncode,
                "diagnostics": "suppressed for encrypted or password-bearing input to avoid exposing recovered credential material",
            }
        else:
            details["qpdf"] = (completed.stdout + completed.stderr).strip()
        if completed.returncode == 3:
            warnings.append("qpdf completed with warnings; inspect the reported structural issues")
        backends = ["qpdf"]
    else:
        reader = open_reader(source)
        try:
            for page in reader.pages:
                _ = page.mediabox
        except Exception as exc:
            raise ToolError(f"basic pypdf validation failed: {exc}", EXIT_OUTPUT) from exc
        details["page_count"] = len(reader.pages)
        warnings.append("qpdf is unavailable; only basic parser validation was performed")
        backends = ["pypdf"]
    return Result("check", backends, [str(source)], warnings=warnings, details=details)


def qpdf_transform(command: str, source_value: str, output_value: str, options: list[str]) -> Result:
    source = require_file(source_value)
    output = Path(output_value).expanduser()
    ensure_distinct_output(output, [source])
    password = get_password("PDF_PASSWORD")
    warnings: list[str] = []
    with temporary_sibling(output) as temp:
        qpdf_args = [str(source)]
        if password is not None:
            qpdf_args.append(f"--password={password}")
        qpdf_args.extend([*options, str(temp)])
        completed = run_qpdf_args(qpdf_args, allowed_codes={0, 3})
        if completed.returncode == 3:
            warnings.append("qpdf completed with warnings; inspect the structural diagnostics")
        validate_pdf_header(temp)
        validate_pdf_with_pypdf(temp, password=password)
        os.replace(temp, output)
    return Result(command, ["qpdf"], [str(source)], [str(output)], warnings=warnings)


def command_repair(args: argparse.Namespace) -> Result:
    result = qpdf_transform("repair", args.input, args.output, ["--warning-exit-0", "--object-streams=generate"])
    result.warnings.append("repair rewrites structure; compare document-level features and rendered pages")
    return result


def command_linearize(args: argparse.Namespace) -> Result:
    return qpdf_transform("linearize", args.input, args.output, ["--linearize"])


def command_decrypt(args: argparse.Namespace) -> Result:
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    password = get_password(args.password_env, required=True)
    ensure_distinct_output(output, [source])
    with temporary_sibling(output) as temp:
        run_qpdf_args([str(source), f"--password={password}", "--decrypt", str(temp)])
        validate_pdf_header(temp)
        validate_pdf_with_pypdf(temp)
        os.replace(temp, output)
    return Result(
        "decrypt",
        ["qpdf"],
        [str(source)],
        [str(output)],
        warnings=["decrypted output is sensitive clear-text material; apply the caller's retention policy"],
    )


def command_encrypt(args: argparse.Namespace) -> Result:
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    user_password = get_password(args.user_password_env, required=True)
    owner_password = get_password(args.owner_password_env, required=True)
    if not user_password or not owner_password:
        raise ToolError("user and owner passwords must both be non-empty", EXIT_AUTH)
    if user_password == owner_password:
        raise ToolError("user and owner passwords must differ", EXIT_AUTH)
    ensure_distinct_output(output, [source])
    with temporary_sibling(output) as temp:
        run_qpdf_args(
            [
                str(source),
                "--encrypt",
                f"--user-password={user_password}",
                f"--owner-password={owner_password}",
                "--bits=256",
                "--",
                str(temp),
            ]
        )
        validate_pdf_header(temp)
        validate_pdf_with_pypdf(temp, password=user_password)
        os.replace(temp, output)
    return Result(
        "encrypt",
        ["qpdf"],
        [str(source)],
        [str(output)],
        details={"algorithm": "AES-256"},
    )


def command_ocr(args: argparse.Namespace) -> Result:
    source = require_file(args.input)
    output = Path(args.output).expanduser()
    if shutil.which("ocrmypdf") is None:
        raise ToolError("ocrmypdf is not installed", EXIT_DEPENDENCY)
    ensure_distinct_output(output, [source])
    languages = args.languages.strip()
    if not languages:
        raise ToolError("OCR languages must not be empty", EXIT_ARGUMENT)
    used_clear_copy = False
    with temporary_sibling(output) as temp:
        with native_readable_pdf(source) as (working_source, used_clear_copy):
            command = ["ocrmypdf", "--language", languages, "--output-type", "pdf", "--skip-text"]
            if args.deskew:
                command.append("--deskew")
            if args.rotate_pages:
                command.append("--rotate-pages")
            command.extend([str(working_source), str(temp)])
            run_process(command)
        validate_pdf_header(temp)
        validate_pdf_with_pypdf(temp)
        os.replace(temp, output)
    warnings = ["review OCR text and rendered appearance; recognition is not authoritative"]
    if used_clear_copy:
        warnings.append("the encrypted source was OCRed through a deleted clear-text working copy; the OCR output is not automatically re-encrypted")
    if args.deskew or args.rotate_pages:
        warnings.append("image cleanup/orientation options can change appearance; compare against the original")
    return Result(
        "ocr",
        ["ocrmypdf", "tesseract"],
        [str(source)],
        [str(output)],
        warnings=warnings,
        details={
            "languages": languages,
            "deskew": bool(args.deskew),
            "rotate_pages": bool(args.rotate_pages),
            "skip_text": True,
        },
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pdf-tool",
        description="Python PDF backend for q-tool-pdf",
        epilog="Global flags: --json, --quiet, --overwrite (only after explicit replacement approval).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("doctor")

    inspect_parser = sub.add_parser("inspect")
    inspect_parser.add_argument("input")

    extract_text = sub.add_parser("extract-text")
    extract_text.add_argument("input")
    extract_text.add_argument("--output", required=True)
    extract_text.add_argument("--layout", action="store_true")

    merge = sub.add_parser("merge")
    merge.add_argument("--output", required=True)
    merge.add_argument("inputs", nargs="+")

    select = sub.add_parser("select")
    select.add_argument("input")
    select.add_argument("--pages", required=True)
    select.add_argument("--output", required=True)

    split = sub.add_parser("split")
    split.add_argument("input")
    split.add_argument("--output-dir", required=True)
    split.add_argument("--chunk-size", type=int, default=1)

    rotate = sub.add_parser("rotate")
    rotate.add_argument("input")
    rotate.add_argument("--pages", default="all")
    rotate.add_argument("--degrees", type=int, required=True)
    rotate.add_argument("--output", required=True)

    crop = sub.add_parser("crop")
    crop.add_argument("input")
    crop.add_argument("--pages", default="all")
    crop.add_argument("--box", required=True)
    crop.add_argument("--output", required=True)

    watermark = sub.add_parser("watermark")
    watermark.add_argument("input")
    watermark.add_argument("--stamp", required=True)
    watermark.add_argument("--pages", default="all")
    watermark.add_argument("--output", required=True)
    watermark.add_argument("--underlay", action="store_true")
    watermark.add_argument("--fit", choices=["contain", "stretch", "none"], default="contain")

    form_list = sub.add_parser("form-list")
    form_list.add_argument("input")
    form_list.add_argument("--output", required=True)

    form_fill = sub.add_parser("form-fill")
    form_fill.add_argument("input")
    form_fill.add_argument("--values", required=True)
    form_fill.add_argument("--output", required=True)
    form_fill.add_argument("--flatten", action="store_true")
    form_fill.add_argument("--font")

    render = sub.add_parser("render")
    render.add_argument("input")
    render.add_argument("--output-dir", required=True)
    render.add_argument("--dpi", type=int, default=160)
    render.add_argument("--format", choices=["png", "jpeg"], default="png")
    render.add_argument("--pages", default="all")

    extract_images = sub.add_parser("extract-images")
    extract_images.add_argument("input")
    extract_images.add_argument("--output-dir", required=True)

    extract_tables = sub.add_parser("extract-tables")
    extract_tables.add_argument("input")
    extract_tables.add_argument("--output", required=True)
    extract_tables.add_argument("--pages", default="all")

    check = sub.add_parser("check")
    check.add_argument("input")

    repair = sub.add_parser("repair")
    repair.add_argument("input")
    repair.add_argument("--output", required=True)

    linearize = sub.add_parser("linearize")
    linearize.add_argument("input")
    linearize.add_argument("--output", required=True)

    decrypt = sub.add_parser("decrypt")
    decrypt.add_argument("input")
    decrypt.add_argument("--output", required=True)
    decrypt.add_argument("--password-env", default="PDF_PASSWORD")

    encrypt = sub.add_parser("encrypt")
    encrypt.add_argument("input")
    encrypt.add_argument("--output", required=True)
    encrypt.add_argument("--user-password-env", required=True)
    encrypt.add_argument("--owner-password-env", required=True)

    ocr = sub.add_parser("ocr")
    ocr.add_argument("input")
    ocr.add_argument("--output", required=True)
    ocr.add_argument("--languages", default="eng")
    ocr.add_argument("--deskew", action="store_true")
    ocr.add_argument("--rotate-pages", action="store_true")

    return parser


COMMANDS: dict[str, Callable[[argparse.Namespace], Result]] = {
    "doctor": command_doctor,
    "inspect": command_inspect,
    "extract-text": command_extract_text,
    "merge": command_merge,
    "select": command_select,
    "split": command_split,
    "rotate": command_rotate,
    "crop": command_crop,
    "watermark": command_watermark,
    "form-list": command_form_list,
    "form-fill": command_form_fill,
    "render": command_render,
    "extract-images": command_extract_images,
    "extract-tables": command_extract_tables,
    "check": command_check,
    "repair": command_repair,
    "linearize": command_linearize,
    "decrypt": command_decrypt,
    "encrypt": command_encrypt,
    "ocr": command_ocr,
}


def main(argv: Sequence[str] | None = None) -> int:
    global ALLOW_OVERWRITE
    raw = list(argv if argv is not None else sys.argv[1:])
    try:
        flags, cleaned = extract_global_flags(raw)
    except ToolError as exc:
        flags = GlobalFlags()
        emit_error("unknown", exc, flags)
        return exc.code
    ALLOW_OVERWRITE = flags.overwrite
    parser = build_parser()
    try:
        args = parser.parse_args(cleaned)
    except SystemExit as exc:
        return int(exc.code)
    command = args.command
    try:
        result = COMMANDS[command](args)
        emit_result(result, flags)
        return 0
    except ToolError as exc:
        emit_error(command, exc, flags)
        return exc.code
    except KeyboardInterrupt:
        error = ToolError("operation interrupted", EXIT_OUTPUT)
        emit_error(command, error, flags)
        return error.code
    except Exception as exc:  # Defensive boundary: do not expose a false success.
        error = ToolError(f"unexpected backend failure: {exc}", EXIT_OUTPUT)
        emit_error(command, error, flags)
        return error.code


if __name__ == "__main__":
    raise SystemExit(main())
