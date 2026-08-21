#!/usr/bin/env node
/**
 * Node PDF adapter for q-tool-pdf.
 */

import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, open, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EXIT_ARGUMENT = 2;
const EXIT_INPUT = 3;
const EXIT_DEPENDENCY = 4;
const EXIT_UNSUPPORTED = 5;
const EXIT_OUTPUT = 6;
const EXIT_AUTH = 7;
let allowOverwrite = false;

class ToolError extends Error {
  constructor(message, code = EXIT_OUTPUT, details = {}) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.details = details;
  }
}

function runtimeName() {
  return "node";
}

function extractGlobalFlags(argv) {
  const flags = { json: false, quiet: false, overwrite: false };
  const cleaned = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") {
      flags.json = true;
    } else if (token === "--quiet") {
      flags.quiet = true;
    } else if (token === "--overwrite") {
      flags.overwrite = true;
    } else if (token === "--runtime") {
      if (index + 1 >= argv.length) throw new ToolError("--runtime requires a value", EXIT_ARGUMENT);
      index += 1;
    } else {
      cleaned.push(token);
    }
  }
  return { flags, cleaned };
}

function parseTokens(tokens) {
  const booleanOptions = new Set(["layout", "underlay", "flatten", "deskew", "rotate-pages"]);
  const positionals = [];
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const raw = token.slice(2);
    const equals = raw.indexOf("=");
    if (equals >= 0) {
      options[raw.slice(0, equals)] = raw.slice(equals + 1);
      continue;
    }
    if (booleanOptions.has(raw)) {
      options[raw] = true;
      continue;
    }
    if (index + 1 >= tokens.length || tokens[index + 1].startsWith("--")) {
      throw new ToolError(`--${raw} requires a value`, EXIT_ARGUMENT);
    }
    options[raw] = tokens[index + 1];
    index += 1;
  }
  return { positionals, options };
}

function requiredOption(options, name) {
  const value = options[name];
  if (value === undefined || value === "") throw new ToolError(`--${name} is required`, EXIT_ARGUMENT);
  return value;
}

function requiredPositional(positionals, index, label) {
  const value = positionals[index];
  if (!value) throw new ToolError(`${label} is required`, EXIT_ARGUMENT);
  return value;
}

function resultEnvelope(command, backend, { inputs = [], outputs = [], warnings = [], details = {} } = {}) {
  return {
    ok: true,
    command,
    runtime: process.env.PDF_SKILL_SELECTED_RUNTIME || runtimeName(),
    backend,
    inputs,
    outputs,
    warnings,
    details,
  };
}

function emitResult(result, flags) {
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (flags.quiet) return;
  console.log(`[OK] ${result.command}`);
  if (result.outputs.length) {
    console.log("Outputs:");
    for (const output of result.outputs) console.log(`  - ${output}`);
  }
  for (const warning of result.warnings) console.error(`Warning: ${warning}`);
  if (Object.keys(result.details).length) console.log(JSON.stringify(result.details, null, 2));
}

function emitError(command, error, flags) {
  const payload = {
    ok: false,
    command,
    runtime: process.env.PDF_SKILL_SELECTED_RUNTIME || runtimeName(),
    backend: [],
    inputs: [],
    outputs: [],
    warnings: [],
    error: error.message,
    details: error.details || {},
  };
  if (flags.json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.error(`Error: ${error.message}`);
    if (Object.keys(payload.details).length) console.error(JSON.stringify(payload.details, null, 2));
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function requireFile(value, label = "input") {
  const resolved = path.resolve(value);
  try {
    const info = await stat(resolved);
    if (!info.isFile()) throw new Error("not a file");
  } catch (error) {
    throw new ToolError(`${label} file does not exist: ${resolved}`, EXIT_INPUT, { cause: String(error) });
  }
  return resolved;
}

function ensureDistinctOutput(output, inputs) {
  const target = path.resolve(output);
  for (const input of inputs) {
    if (target === path.resolve(input)) throw new ToolError(`output must differ from input: ${target}`, EXIT_ARGUMENT);
  }
}

function tempSibling(output) {
  const target = path.resolve(output);
  const extension = path.extname(target);
  return path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp${extension}`);
}

async function prepareOutputDirectory(directory, label = "output directory") {
  const target = path.resolve(directory);
  if (await exists(target)) {
    const info = await stat(target);
    if (!info.isDirectory()) throw new ToolError(`${label} is not a directory: ${target}`, EXIT_ARGUMENT);
    if ((await readdir(target)).length > 0) {
      throw new ToolError(`${label} must be empty to avoid mixing stale and new files: ${target}`, EXIT_ARGUMENT);
    }
  } else {
    await mkdir(target, { recursive: true });
  }
  return target;
}

async function replaceFile(temp, output) {
  const target = path.resolve(output);
  await mkdir(path.dirname(target), { recursive: true });
  if ((await exists(target)) && !allowOverwrite) {
    throw new ToolError(
      `output exists; pass --overwrite only after explicit approval: ${target}`,
      EXIT_ARGUMENT,
    );
  }
  try {
    await rename(temp, target);
  } catch (error) {
    if (!(["EEXIST", "EPERM", "EACCES"].includes(error?.code))) throw error;
    const backup = `${target}.${randomUUID()}.bak`;
    let hadTarget = false;
    try {
      if (await exists(target)) {
        await rename(target, backup);
        hadTarget = true;
      }
      await rename(temp, target);
      if (hadTarget) await rm(backup, { force: true });
    } catch (replaceError) {
      if (hadTarget && !(await exists(target)) && (await exists(backup))) await rename(backup, target);
      throw replaceError;
    }
  }
}

async function validatePdfHeader(filePath) {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, 8, 0);
    if (bytesRead < 5 || !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      throw new ToolError(`generated file is not a PDF container: ${filePath}`, EXIT_OUTPUT);
    }
  } finally {
    await handle.close();
  }
}

async function writeBytesAtomic(output, bytes, inputs = []) {
  const target = path.resolve(output);
  ensureDistinctOutput(target, inputs);
  await mkdir(path.dirname(target), { recursive: true });
  const temp = tempSibling(target);
  try {
    await writeFile(temp, bytes);
    await validatePdfHeader(temp);
    await replaceFile(temp, target);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
  return target;
}

async function writeTextAtomic(output, text) {
  const target = path.resolve(output);
  await mkdir(path.dirname(target), { recursive: true });
  const temp = tempSibling(target);
  try {
    await writeFile(temp, text, "utf8");
    await replaceFile(temp, target);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
  return target;
}

async function writeJsonAtomic(output, value) {
  return writeTextAtomic(output, `${JSON.stringify(value, null, 2)}\n`);
}

async function loadPdfLib() {
  try {
    return await import("pdf-lib");
  } catch (error) {
    throw new ToolError(
      "pdf-lib is not installed; install scripts/node/package.json",
      EXIT_DEPENDENCY,
      { cause: String(error) },
    );
  }
}

async function loadPdfJs() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (error) {
    throw new ToolError(
      "pdfjs-dist is not installed; install scripts/node/package.json",
      EXIT_DEPENDENCY,
      { cause: String(error) },
    );
  }
}

function pdfJsDocumentOptions(data) {
  const moduleUrl = import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFonts = fileURLToPath(new URL("../../standard_fonts/", moduleUrl));
  return {
    data,
    password: getPassword("PDF_PASSWORD"),
    standardFontDataUrl: standardFonts.endsWith(path.sep) ? standardFonts : `${standardFonts}${path.sep}`,
  };
}

async function loadFontkit() {
  try {
    const module = await import("@pdf-lib/fontkit");
    return module.default || module;
  } catch (error) {
    throw new ToolError("@pdf-lib/fontkit is required for --font", EXIT_DEPENDENCY, { cause: String(error) });
  }
}

async function readPdfBytes(filePath) {
  return new Uint8Array(await readFile(filePath));
}

function getPassword(envName = "PDF_PASSWORD", required = false) {
  const value = process.env[envName];
  if (required && value === undefined) throw new ToolError(`password environment variable is not set: ${envName}`, EXIT_AUTH);
  if (value?.includes("\n") || value?.includes("\r")) throw new ToolError("password environment values must not contain newlines", EXIT_AUTH);
  return value;
}

function parsePageSpec(spec, pageCount, { allowDuplicates = true } = {}) {
  const raw = String(spec || "").trim().toLowerCase();
  if (pageCount < 1) throw new ToolError("PDF contains no pages", EXIT_INPUT);
  if (raw === "all") return Array.from({ length: pageCount }, (_, index) => index);
  if (raw === "odd") return Array.from({ length: Math.ceil(pageCount / 2) }, (_, index) => index * 2);
  if (raw === "even") {
    const pages = Array.from({ length: Math.floor(pageCount / 2) }, (_, index) => index * 2 + 1);
    if (!pages.length) throw new ToolError("page selection resolves to no pages", EXIT_ARGUMENT);
    return pages;
  }
  if (!raw) throw new ToolError("page specification is empty", EXIT_ARGUMENT);

  const pages = [];
  for (const rawToken of raw.split(",")) {
    const token = rawToken.trim();
    if (!token) throw new ToolError(`malformed page specification: ${spec}`, EXIT_ARGUMENT);
    let values;
    if (token === "last") values = [pageCount];
    else if (/^\d+$/.test(token)) values = [Number(token)];
    else {
      const match = token.match(/^(\d+|last)-(\d+|last)$/);
      if (!match) throw new ToolError(`invalid page token: ${token}`, EXIT_ARGUMENT);
      const start = match[1] === "last" ? pageCount : Number(match[1]);
      const end = match[2] === "last" ? pageCount : Number(match[2]);
      if (end < start) throw new ToolError(`descending page range is not allowed: ${token}`, EXIT_ARGUMENT);
      values = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    }
    for (const value of values) {
      if (value < 1 || value > pageCount) throw new ToolError(`page ${value} is outside document range 1-${pageCount}`, EXIT_ARGUMENT);
      const index = value - 1;
      if (!allowDuplicates && pages.includes(index)) throw new ToolError(`duplicate page is not allowed: ${value}`, EXIT_ARGUMENT);
      pages.push(index);
    }
  }
  return pages;
}

function parseBox(raw) {
  const parts = String(raw).split(",").map((item) => Number(item.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    throw new ToolError("crop box must be LEFT,BOTTOM,RIGHT,TOP", EXIT_ARGUMENT);
  }
  const [left, bottom, right, top] = parts;
  if (right <= left || top <= bottom) throw new ToolError("crop box requires RIGHT > LEFT and TOP > BOTTOM", EXIT_ARGUMENT);
  return [left, bottom, right, top];
}

async function runProcess(command, args = [], { input, allowedCodes = new Set([0]), secret = false } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      reject(new ToolError(`required executable is unavailable: ${command}`, EXIT_DEPENDENCY, { cause: String(error) }));
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      if (error.code === "ENOENT") reject(new ToolError(`required executable is not installed: ${command}`, EXIT_DEPENDENCY));
      else reject(new ToolError(`unable to start ${command}: ${error}`, EXIT_OUTPUT));
    });
    child.on("close", (code) => {
      if (!allowedCodes.has(code)) {
        const visible = secret ? command : [command, ...args].join(" ");
        const details = secret
          ? { diagnostics: "suppressed because the command received secret input" }
          : { stdout: stdout.slice(-4000), stderr: stderr.slice(-4000) };
        reject(new ToolError(`command failed (${code}): ${visible}`, EXIT_OUTPUT, details));
      } else resolve({ code, stdout, stderr });
    });
    child.stdin.end(input ?? "");
  });
}

async function executableInfo(command, versionArgs) {
  try {
    const result = await runProcess(command, versionArgs, { allowedCodes: new Set([0, 1]) });
    const version = `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/).filter(Boolean)[0] || null;
    return { available: true, version };
  } catch (error) {
    if (error instanceof ToolError && error.code === EXIT_DEPENDENCY) return { available: false, version: null };
    return { available: true, version: null, warning: error.message };
  }
}

async function runQpdfArgs(args, { allowedCodes = new Set([0]) } = {}) {
  for (const arg of args) {
    if (String(arg).includes("\n") || String(arg).includes("\r")) throw new ToolError("qpdf arguments must not contain newlines", EXIT_ARGUMENT);
  }
  return runProcess("qpdf", ["@-"], {
    input: `${args.join("\n")}\n`,
    allowedCodes,
    secret: true,
  });
}

async function qpdfEncryptionState(source) {
  const qpdf = await executableInfo("qpdf", ["--version"]);
  if (!qpdf.available) return null;
  const result = await runQpdfArgs([source, "--is-encrypted"], { allowedCodes: new Set([0, 2]) });
  return result.code === 0;
}

async function withNativeReadablePdf(source, callback) {
  const encrypted = await qpdfEncryptionState(source);
  if (encrypted !== true) return callback(source, false);

  const password = getPassword("PDF_PASSWORD", true);
  const directory = await mkdtemp(path.join(tmpdir(), "q-tool-pdf-clear-"));
  const clear = path.join(directory, "working.pdf");
  try {
    await runQpdfArgs([source, `--password=${password}`, "--decrypt", clear]);
    await validatePdfHeader(clear);
    return await callback(clear, true);
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}

function pdfLibFieldType(field) {
  return field?.constructor?.name || "UnknownField";
}

function currentFieldValue(field) {
  const type = pdfLibFieldType(field);
  try {
    if (type === "PDFTextField") return field.getText() ?? null;
    if (type === "PDFCheckBox") return field.isChecked();
    if (["PDFRadioGroup", "PDFDropdown", "PDFOptionList"].includes(type)) return field.getSelected();
  } catch {
    return null;
  }
  return null;
}

function fieldOptions(field) {
  try {
    if (typeof field.getOptions === "function") return field.getOptions();
  } catch {
    return [];
  }
  return [];
}

function fieldWidgets(field, pageLookup = new Map()) {
  try {
    const widgets = field.acroField?.getWidgets?.() || [];
    return widgets.map((widget) => {
      const rectangle = widget.getRectangle?.();
      const pageRef = widget.P?.();
      const pageKey = pageRef ? String(pageRef) : null;
      return {
        page: pageKey ? (pageLookup.get(pageKey) ?? null) : null,
        rect: rectangle ? [rectangle.x, rectangle.y, rectangle.x + rectangle.width, rectangle.y + rectangle.height] : null,
        page_ref: pageKey,
      };
    });
  } catch {
    return [];
  }
}

async function commandDoctor() {
  const packageAvailability = {};
  for (const [name, loader] of [["pdf-lib", loadPdfLib], ["pdfjs-dist", loadPdfJs]]) {
    try {
      await loader();
      packageAvailability[name] = { available: true };
    } catch (error) {
      packageAvailability[name] = { available: false, error: error.message };
    }
  }
  try {
    await loadFontkit();
    packageAvailability["@pdf-lib/fontkit"] = { available: true };
  } catch (error) {
    packageAvailability["@pdf-lib/fontkit"] = { available: false, error: error.message };
  }
  const tools = {
    qpdf: await executableInfo("qpdf", ["--version"]),
    pdftoppm: await executableInfo("pdftoppm", ["-v"]),
    pdfimages: await executableInfo("pdfimages", ["-v"]),
    ocrmypdf: await executableInfo("ocrmypdf", ["--version"]),
  };
  const hasPdfLib = packageAvailability["pdf-lib"].available;
  const hasPdfJs = packageAvailability["pdfjs-dist"].available;
  const capabilities = {
    inspect: hasPdfLib && hasPdfJs,
    core_edit: hasPdfLib,
    text_extraction: hasPdfJs,
    custom_form_fonts: hasPdfLib && packageAvailability["@pdf-lib/fontkit"].available,
    table_extraction: false,
    render: hasPdfJs && tools.pdftoppm.available,
    extract_images: tools.pdfimages.available,
    structural_check: tools.qpdf.available || (hasPdfLib && hasPdfJs),
    ocr: tools.ocrmypdf.available,
    secure_transform: tools.qpdf.available,
    programmatic_create: hasPdfLib,
  };
  const warnings = Object.entries(capabilities).filter(([, value]) => !value).map(([name]) => `capability unavailable: ${name}`);
  return resultEnvelope("doctor", [runtimeName()], {
    warnings,
    details: {
      runtime: runtimeName(),
      versions: process.versions,
      packages: packageAvailability,
      tools,
      capabilities,
      compatibility: runtimeName() === "node" ? "reference" : "requires-smoke-test",
    },
  });
}

async function loadWithPdfLib(filePath) {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await readPdfBytes(filePath);
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    const message = String(error?.message || error);
    if (/encrypt/i.test(message)) {
      throw new ToolError("pdf-lib cannot open encrypted PDFs; use authorized qpdf decryption first", EXIT_UNSUPPORTED);
    }
    throw new ToolError(`pdf-lib could not open PDF: ${message}`, EXIT_INPUT);
  }
}

async function inspectWithPdfJs(filePath) {
  const pdfjs = await loadPdfJs();
  const data = await readPdfBytes(filePath);
  let loadingTask;
  try {
    loadingTask = pdfjs.getDocument(pdfJsDocumentOptions(data));
    const document = await loadingTask.promise;
    const pages = [];
    let sampledPages = 0;
    let pagesWithText = 0;
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const annotations = await page.getAnnotations();
      pages.push({
        number: pageNumber,
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation,
        annotations: annotations.length,
      });
      if (pageNumber <= 5) {
        const text = await page.getTextContent();
        const count = text.items.reduce((sum, item) => sum + String(item.str || "").length, 0);
        sampledPages += 1;
        if (count > 0) pagesWithText += 1;
        characters += count;
      }
      page.cleanup?.();
    }
    await document.destroy?.();
    return {
      page_count: pages.length,
      pages,
      text_layer: { sampled_pages: sampledPages, pages_with_text: pagesWithText, characters },
    };
  } catch (error) {
    const message = String(error?.message || error);
    if (/password/i.test(message)) throw new ToolError("PDF requires a valid PDF_PASSWORD", EXIT_AUTH);
    throw new ToolError(`PDF.js could not inspect PDF: ${message}`, EXIT_INPUT);
  } finally {
    await loadingTask?.destroy?.().catch?.(() => {});
  }
}

async function commandInspect(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const warnings = [];
  const details = {
    path: source,
    size_bytes: (await stat(source)).size,
    encrypted: null,
    metadata: {},
    forms: { acroform: null, xfa: null, field_count: null, signature_fields: null },
  };
  try {
    Object.assign(details, await inspectWithPdfJs(source));
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    if (error.code === EXIT_AUTH) {
      details.encrypted = true;
      warnings.push(error.message);
    } else if (error.code === EXIT_INPUT) {
      throw error;
    } else {
      warnings.push(error.message);
    }
  }
  try {
    const document = await loadWithPdfLib(source);
    details.encrypted = false;
    details.metadata = {
      title: document.getTitle?.() ?? null,
      author: document.getAuthor?.() ?? null,
      subject: document.getSubject?.() ?? null,
      keywords: document.getKeywords?.() ?? null,
      creator: document.getCreator?.() ?? null,
      producer: document.getProducer?.() ?? null,
      creation_date: document.getCreationDate?.()?.toISOString?.() ?? null,
      modification_date: document.getModificationDate?.()?.toISOString?.() ?? null,
    };
    const form = document.getForm();
    const fields = form.getFields();
    details.forms = {
      acroform: fields.length > 0,
      xfa: typeof form.hasXFA === "function" ? form.hasXFA() : null,
      field_count: fields.length,
      signature_fields: fields.filter((field) => /Signature/i.test(pdfLibFieldType(field))).length,
    };
    if (details.forms.xfa) warnings.push("XFA is present; ordinary AcroForm edits may not control visible viewer values");
    if (details.forms.signature_fields) warnings.push("signature fields are present; any rewrite may invalidate existing signatures");
  } catch (error) {
    if (error instanceof ToolError && error.code === EXIT_UNSUPPORTED) {
      details.encrypted = true;
      warnings.push(error.message);
      const qpdf = await executableInfo("qpdf", ["--version"]);
      if (qpdf.available) {
        const password = getPassword("PDF_PASSWORD");
        const qpdfArgs = [source];
        if (password !== undefined) qpdfArgs.push(`--password=${password}`);
        qpdfArgs.push("--requires-password");
        const report = await runQpdfArgs(qpdfArgs, { allowedCodes: new Set([0, 2, 3]) });
        details.qpdf_password_status = {
          requires_password: report.code === 0,
          unlocked_with_supplied_password: report.code === 3,
        };
      }
    } else throw error;
  }
  return resultEnvelope("inspect", ["pdfjs-dist", "pdf-lib"], { inputs: [source], warnings, details });
}

function lineLayout(items) {
  const rows = [];
  const tolerance = 3;
  for (const item of items) {
    const text = String(item.str || "");
    if (!text) continue;
    const x = Number(item.transform?.[4] || 0);
    const y = Number(item.transform?.[5] || 0);
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= tolerance);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, text });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ")).join("\n");
}

async function commandExtractText(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  ensureDistinctOutput(output, [source]);
  const pdfjs = await loadPdfJs();
  const data = await readPdfBytes(source);
  const loadingTask = pdfjs.getDocument(pdfJsDocumentOptions(data));
  try {
    const document = await loadingTask.promise;
    const chunks = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = args.options.layout
        ? lineLayout(content.items)
        : content.items.map((item) => String(item.str || "")).filter(Boolean).join(" ");
      chunks.push(`--- Page ${pageNumber} ---\n${text.trim()}\n`);
      page.cleanup?.();
    }
    await writeTextAtomic(output, `${chunks.join("\n")}\n`);
    await document.destroy?.();
    return resultEnvelope("extract-text", ["pdfjs-dist"], {
      inputs: [source], outputs: [output], details: { pages: chunks.length, layout: Boolean(args.options.layout) },
    });
  } catch (error) {
    if (error instanceof ToolError) throw error;
    const message = String(error?.message || error);
    if (/password/i.test(message)) throw new ToolError("PDF requires a valid PDF_PASSWORD", EXIT_AUTH);
    throw new ToolError(`text extraction failed: ${message}`, EXIT_OUTPUT);
  } finally {
    await loadingTask.destroy?.().catch?.(() => {});
  }
}

async function savePdfDocument(document, output, inputs) {
  const bytes = await document.save();
  const { PDFDocument } = await loadPdfLib();
  try {
    await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    throw new ToolError(`generated PDF failed in-memory reopen validation: ${error}`, EXIT_OUTPUT);
  }
  return writeBytesAtomic(output, bytes, inputs);
}

function assertPageCopySafe(document, source) {
  const form = document.getForm();
  const fields = form.getFields();
  const xfa = typeof form.hasXFA === "function" ? form.hasXFA() : false;
  if (xfa || fields.length) {
    throw new ToolError(
      "Node page-copy operations do not preserve interactive form semantics; route this document to the Python/qpdf path",
      EXIT_UNSUPPORTED,
      { source, xfa, field_count: fields.length },
    );
  }
}

function copyDocumentMetadata(source, destination) {
  const mappings = [
    ["getTitle", "setTitle"],
    ["getAuthor", "setAuthor"],
    ["getSubject", "setSubject"],
    ["getKeywords", "setKeywords"],
    ["getCreator", "setCreator"],
    ["getProducer", "setProducer"],
    ["getCreationDate", "setCreationDate"],
    ["getModificationDate", "setModificationDate"],
  ];
  for (const [getter, setter] of mappings) {
    try {
      const value = source[getter]?.();
      if (value !== undefined && value !== null && value !== "") destination[setter]?.(value);
    } catch {
      // Metadata is supporting information; a malformed field must not abort page preservation.
    }
  }
}

async function commandMerge(args) {
  const output = path.resolve(requiredOption(args.options, "output"));
  if (args.positionals.length < 2) throw new ToolError("merge requires at least two input PDFs", EXIT_ARGUMENT);
  const inputs = [];
  for (const value of args.positionals) inputs.push(await requireFile(value));
  const { PDFDocument } = await loadPdfLib();
  const destination = await PDFDocument.create();
  let firstDocument = null;
  for (const source of inputs) {
    const document = await loadWithPdfLib(source);
    assertPageCopySafe(document, source);
    if (firstDocument === null) firstDocument = document;
    const pages = await destination.copyPages(document, document.getPageIndices());
    for (const page of pages) destination.addPage(page);
  }
  if (firstDocument) copyDocumentMetadata(firstDocument, destination);
  const target = await savePdfDocument(destination, output, inputs);
  return resultEnvelope("merge", ["pdf-lib"], {
    inputs, outputs: [target],
    warnings: ["verify outlines, attachments, tags, and other document-level features; interactive forms are rejected before page copying"],
    details: { input_count: inputs.length, page_count: destination.getPageCount() },
  });
}

async function commandSelect(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  const document = await loadWithPdfLib(source);
  assertPageCopySafe(document, source);
  const selected = parsePageSpec(requiredOption(args.options, "pages"), document.getPageCount(), { allowDuplicates: true });
  const { PDFDocument } = await loadPdfLib();
  const destination = await PDFDocument.create();
  const pages = await destination.copyPages(document, selected);
  for (const page of pages) destination.addPage(page);
  copyDocumentMetadata(document, destination);
  const target = await savePdfDocument(destination, output, [source]);
  return resultEnvelope("select", ["pdf-lib"], {
    inputs: [source], outputs: [target], details: { selected_pages: selected.map((index) => index + 1) },
    warnings: ["verify document-level outlines, attachments, and tags after page selection; interactive forms are rejected before page copying"],
  });
}

async function commandSplit(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const outputDir = path.resolve(requiredOption(args.options, "output-dir"));
  const chunkSize = Number(args.options["chunk-size"] || 1);
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new ToolError("chunk size must be a positive integer", EXIT_ARGUMENT);
  const sourceDocument = await loadWithPdfLib(source);
  assertPageCopySafe(sourceDocument, source);
  await prepareOutputDirectory(outputDir);
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const chunks = [];
  const manifestPath = path.join(outputDir, "manifest.json");
  try {
    for (let start = 0; start < sourceDocument.getPageCount(); start += chunkSize) {
      const end = Math.min(start + chunkSize, sourceDocument.getPageCount());
      const destination = await PDFDocument.create();
      const indexes = Array.from({ length: end - start }, (_, offset) => start + offset);
      const pages = await destination.copyPages(sourceDocument, indexes);
      for (const page of pages) destination.addPage(page);
      copyDocumentMetadata(sourceDocument, destination);
      const filename = `${path.parse(source).name}-pages-${String(start + 1).padStart(4, "0")}-${String(end).padStart(4, "0")}.pdf`;
      const target = await savePdfDocument(destination, path.join(outputDir, filename), [source]);
      outputs.push(target);
      chunks.push({ output: target, pages: indexes.map((index) => index + 1) });
    }
  } catch (error) {
    await writeJsonAtomic(manifestPath, {
      ok: false, command: "split", source, chunks, error: String(error?.message || error),
    }).catch(() => {});
    throw error;
  }
  const manifest = await writeJsonAtomic(manifestPath, { ok: true, source, chunks });
  outputs.push(manifest);
  return resultEnvelope("split", ["pdf-lib"], {
    inputs: [source], outputs, details: { chunk_size: chunkSize, chunks: chunks.length },
  });
}

async function commandRotate(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  const degreeValue = Number(requiredOption(args.options, "degrees"));
  if (![-270, -180, -90, 90, 180, 270].includes(degreeValue)) {
    throw new ToolError("rotation must be one of -270, -180, -90, 90, 180, or 270 degrees", EXIT_ARGUMENT);
  }
  const { degrees } = await loadPdfLib();
  const document = await loadWithPdfLib(source);
  const selected = new Set(parsePageSpec(args.options.pages || "all", document.getPageCount(), { allowDuplicates: false }));
  document.getPages().forEach((page, index) => {
    if (!selected.has(index)) return;
    const current = page.getRotation().angle || 0;
    page.setRotation(degrees(((current + degreeValue) % 360 + 360) % 360));
  });
  const target = await savePdfDocument(document, output, [source]);
  return resultEnvelope("rotate", ["pdf-lib"], {
    inputs: [source], outputs: [target], details: { pages: [...selected].map((index) => index + 1), degrees: degreeValue },
  });
}

async function commandCrop(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  const box = parseBox(requiredOption(args.options, "box"));
  const document = await loadWithPdfLib(source);
  const selected = new Set(parsePageSpec(args.options.pages || "all", document.getPageCount(), { allowDuplicates: false }));
  document.getPages().forEach((page, index) => {
    if (selected.has(index)) page.setCropBox(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  });
  const target = await savePdfDocument(document, output, [source]);
  return resultEnvelope("crop", ["pdf-lib"], {
    inputs: [source], outputs: [target],
    warnings: ["cropping changes the visible box but does not securely remove hidden content"],
    details: { pages: [...selected].map((index) => index + 1), box },
  });
}

async function commandWatermark(args) {
  if (args.options.underlay) {
    throw new ToolError("Node underlay is not implemented without changing content order; route to Python or a verified qpdf underlay workflow", EXIT_UNSUPPORTED);
  }
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const stampPath = await requireFile(requiredOption(args.options, "stamp"), "stamp");
  const output = path.resolve(requiredOption(args.options, "output"));
  const fit = args.options.fit || "contain";
  if (!["contain", "stretch", "none"].includes(fit)) throw new ToolError("--fit must be contain, stretch, or none", EXIT_ARGUMENT);
  const document = await loadWithPdfLib(source);
  const stampDocument = await loadWithPdfLib(stampPath);
  if (stampDocument.getPageCount() < 1) throw new ToolError("stamp PDF has no pages", EXIT_INPUT);
  const embedded = await document.embedPage(stampDocument.getPage(0));
  const selected = new Set(parsePageSpec(args.options.pages || "all", document.getPageCount(), { allowDuplicates: false }));
  document.getPages().forEach((page, index) => {
    if (!selected.has(index)) return;
    const pageSize = page.getSize();
    let width = embedded.width;
    let height = embedded.height;
    let x = 0;
    let y = 0;
    if (fit === "stretch") {
      width = pageSize.width;
      height = pageSize.height;
    } else if (fit === "contain") {
      const scale = Math.min(pageSize.width / embedded.width, pageSize.height / embedded.height);
      width = embedded.width * scale;
      height = embedded.height * scale;
      x = (pageSize.width - width) / 2;
      y = (pageSize.height - height) / 2;
    }
    page.drawPage(embedded, { x, y, width, height });
  });
  const target = await savePdfDocument(document, output, [source, stampPath]);
  return resultEnvelope("watermark", ["pdf-lib"], {
    inputs: [source, stampPath], outputs: [target],
    details: { pages: [...selected].map((index) => index + 1), underlay: false, fit },
  });
}

async function commandFormList(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  ensureDistinctOutput(output, [source]);
  const document = await loadWithPdfLib(source);
  const form = document.getForm();
  const pageLookup = new Map(document.getPages().map((page, index) => [String(page.ref), index + 1]));
  const fields = form.getFields().map((field) => ({
    name: field.getName(),
    type: pdfLibFieldType(field),
    value: currentFieldValue(field),
    options: fieldOptions(field),
    widgets: fieldWidgets(field, pageLookup),
  }));
  const xfa = typeof form.hasXFA === "function" ? form.hasXFA() : null;
  const payload = { source, acroform: fields.length > 0, xfa, field_count: fields.length, fields };
  await writeJsonAtomic(output, payload);
  return resultEnvelope("form-list", ["pdf-lib"], {
    inputs: [source], outputs: [output],
    warnings: xfa ? ["XFA is present; exported AcroForm fields may not control visible viewer behavior"] : [],
    details: { field_count: fields.length, xfa },
  });
}

async function readFormValues(filePath) {
  const source = await requireFile(filePath, "values");
  let payload;
  try {
    payload = JSON.parse(await readFile(source, "utf8"));
  } catch (error) {
    throw new ToolError(`unable to read form values JSON: ${error}`, EXIT_INPUT);
  }
  if (!payload || typeof payload.fields !== "object" || Array.isArray(payload.fields)) {
    throw new ToolError("form values JSON must contain an object named 'fields'", EXIT_ARGUMENT);
  }
  return { source, values: payload.fields };
}

function applyFieldValue(field, value) {
  const type = pdfLibFieldType(field);
  const name = field.getName();
  if (type === "PDFTextField") {
    if (value !== null && typeof value !== "string") {
      throw new ToolError(`text field ${name} requires a string or null`, EXIT_ARGUMENT);
    }
    field.setText(value ?? "");
    return;
  }
  if (type === "PDFCheckBox") {
    if (typeof value !== "boolean") throw new ToolError(`checkbox ${name} requires a boolean`, EXIT_ARGUMENT);
    if (value) field.check(); else field.uncheck();
    return;
  }
  if (type === "PDFRadioGroup") {
    if (typeof value !== "string") throw new ToolError(`radio group ${name} requires one option string`, EXIT_ARGUMENT);
    const allowed = fieldOptions(field).map(String);
    if (allowed.length && !allowed.includes(value)) {
      throw new ToolError(`invalid radio option for ${name}: ${value}`, EXIT_ARGUMENT, { allowed_options: allowed });
    }
    field.select(value);
    return;
  }
  if (type === "PDFDropdown" || type === "PDFOptionList") {
    const selected = Array.isArray(value) ? value : [value];
    if (!selected.length || selected.some((item) => typeof item !== "string")) {
      throw new ToolError(`choice field ${name} requires a string or non-empty array of strings`, EXIT_ARGUMENT);
    }
    const allowed = fieldOptions(field).map(String);
    const invalid = allowed.length ? selected.filter((item) => !allowed.includes(item)) : [];
    if (invalid.length) {
      throw new ToolError(`invalid choice option for ${name}`, EXIT_ARGUMENT, { invalid_options: invalid, allowed_options: allowed });
    }
    field.select(Array.isArray(value) ? selected : selected[0]);
    return;
  }
  throw new ToolError(`field type is not fillable: ${name} (${type})`, EXIT_UNSUPPORTED);
}

function collectWidgetRefs(document, PDFName) {
  const refs = new Set();
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (const ref of annots.asArray()) {
      const annotation = document.context.lookup(ref);
      if (String(annotation?.get?.(PDFName.of("Subtype"))) === "/Widget") {
        refs.add(String(ref));
      }
    }
  }
  return refs;
}

function removeFlattenedWidgets(document, PDFName, widgetRefs) {
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let index = annots.size() - 1; index >= 0; index -= 1) {
      if (widgetRefs.has(String(annots.get(index)))) annots.remove(index);
    }
    if (annots.size() === 0) page.node.delete(PDFName.of("Annots"));
  }
  document.catalog.delete(PDFName.of("AcroForm"));
}

async function commandFormFill(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  const { source: valuesSource, values } = await readFormValues(requiredOption(args.options, "values"));
  const document = await loadWithPdfLib(source);
  const form = document.getForm();
  const xfa = typeof form.hasXFA === "function" ? form.hasXFA() : false;
  if (xfa) throw new ToolError("XFA forms require a specialist workflow; refusing to emit potentially contradictory values", EXIT_UNSUPPORTED);
  const fieldList = form.getFields();
  const signatureFields = fieldList
    .filter((field) => /Signature/i.test(pdfLibFieldType(field)))
    .map((field) => field.getName());
  if (signatureFields.length) {
    throw new ToolError(
      "forms containing digital-signature fields require a signature-aware workflow before any rewrite",
      EXIT_UNSUPPORTED,
      { signature_fields: signatureFields },
    );
  }
  const fields = new Map(fieldList.map((field) => [field.getName(), field]));
  const unknown = Object.keys(values).filter((name) => !fields.has(name));
  if (unknown.length) throw new ToolError("form values contain unknown field names", EXIT_ARGUMENT, { unknown_fields: unknown });
  for (const [name, value] of Object.entries(values)) applyFieldValue(fields.get(name), value);

  let appearanceFont = null;
  if (args.options.font) {
    const fontPath = await requireFile(args.options.font, "font");
    const fontkit = await loadFontkit();
    document.registerFontkit(fontkit);
    appearanceFont = await document.embedFont(await readFile(fontPath), { subset: true });
  }
  try {
    if (appearanceFont) form.updateFieldAppearances(appearanceFont);
    else form.updateFieldAppearances();
  } catch (error) {
    throw new ToolError(
      `unable to generate form appearances: ${error}. Supply --font for text outside standard encoding.`,
      EXIT_OUTPUT,
    );
  }
  if (args.options.flatten) {
    const { PDFName } = await loadPdfLib();
    const widgetRefs = collectWidgetRefs(document, PDFName);
    form.flatten();
    removeFlattenedWidgets(document, PDFName, widgetRefs);
  }
  const target = await savePdfDocument(document, output, [source, valuesSource]);
  return resultEnvelope("form-fill", ["pdf-lib", ...(appearanceFont ? ["@pdf-lib/fontkit"] : [])], {
    inputs: [source, valuesSource], outputs: [target],
    warnings: args.options.flatten ? ["render every form page after flattening to verify appearances"] : [],
    details: { filled_fields: Object.keys(values).sort(), flatten: Boolean(args.options.flatten), custom_font: Boolean(appearanceFont) },
  });
}

async function pageCountWithPdfJs(source) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument(pdfJsDocumentOptions(await readPdfBytes(source)));
  try {
    const document = await loadingTask.promise;
    const count = document.numPages;
    await document.destroy?.();
    return count;
  } finally {
    await loadingTask.destroy?.().catch?.(() => {});
  }
}

async function commandRender(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const outputDir = path.resolve(requiredOption(args.options, "output-dir"));
  const dpi = Number(args.options.dpi || 160);
  if (!Number.isInteger(dpi) || dpi < 36 || dpi > 1200) throw new ToolError("DPI must be an integer between 36 and 1200", EXIT_ARGUMENT);
  const format = args.options.format || "png";
  if (!(["png", "jpeg"].includes(format))) throw new ToolError("--format must be png or jpeg", EXIT_ARGUMENT);
  await prepareOutputDirectory(outputDir);
  const pageCount = await pageCountWithPdfJs(source);
  const pages = parsePageSpec(args.options.pages || "all", pageCount, { allowDuplicates: false });
  const outputs = [];
  let usedClearCopy = false;
  const manifestPath = path.join(outputDir, "manifest.json");
  try {
    await withNativeReadablePdf(source, async (workingSource, clearCopy) => {
      usedClearCopy = clearCopy;
      for (const index of pages) {
        const suffix = format === "png" ? "png" : "jpg";
        const target = path.join(outputDir, `page-${String(index + 1).padStart(4, "0")}.${suffix}`);
        const prefix = target.slice(0, -(`.${suffix}`.length));
        const commandArgs = [
          "-f", String(index + 1), "-l", String(index + 1), "-singlefile", "-r", String(dpi),
          format === "png" ? "-png" : "-jpeg", workingSource, prefix,
        ];
        await runProcess("pdftoppm", commandArgs);
        if (!(await exists(target))) throw new ToolError(`renderer did not produce expected file: ${target}`, EXIT_OUTPUT);
        outputs.push(target);
      }
    });
  } catch (error) {
    const partial = (await readdir(outputDir)).filter((name) => name !== "manifest.json").sort().map((name) => path.join(outputDir, name));
    await writeJsonAtomic(manifestPath, {
      ok: false,
      command: "render",
      source,
      dpi,
      format,
      requested_pages: pages.map((index) => index + 1),
      outputs: partial,
      error: String(error?.message || error),
    }).catch(() => {});
    throw error;
  }
  const manifest = await writeJsonAtomic(manifestPath, {
    ok: true, source, dpi, format, pages: pages.map((index) => index + 1), outputs,
  });
  outputs.push(manifest);
  return resultEnvelope("render", ["pdftoppm"], {
    inputs: [source], outputs,
    warnings: usedClearCopy ? ["an authorized temporary clear-text working copy was used for Poppler rendering and deleted after use"] : [],
    details: { pages: pages.map((index) => index + 1), dpi, format },
  });
}

async function commandExtractImages(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const outputDir = path.resolve(requiredOption(args.options, "output-dir"));
  await prepareOutputDirectory(outputDir);
  let usedClearCopy = false;
  const manifestPath = path.join(outputDir, "manifest.json");
  try {
    await withNativeReadablePdf(source, async (workingSource, clearCopy) => {
      usedClearCopy = clearCopy;
      await runProcess("pdfimages", ["-all", "-p", workingSource, path.join(outputDir, "image")]);
    });
  } catch (error) {
    const partial = (await readdir(outputDir)).filter((name) => name !== "manifest.json").sort().map((name) => path.join(outputDir, name));
    await writeJsonAtomic(manifestPath, {
      ok: false, command: "extract-images", source, outputs: partial, error: String(error?.message || error),
    }).catch(() => {});
    throw error;
  }
  const files = (await readdir(outputDir)).filter((name) => name !== "manifest.json").sort().map((name) => path.join(outputDir, name));
  const manifest = await writeJsonAtomic(manifestPath, { ok: true, source, outputs: files });
  files.push(manifest);
  return resultEnvelope("extract-images", ["pdfimages"], {
    inputs: [source], outputs: files,
    warnings: usedClearCopy ? ["an authorized temporary clear-text working copy was used and deleted after image extraction"] : [],
    details: { image_count: files.length - 1 },
  });
}

async function commandExtractTables() {
  throw new ToolError("extract-tables is intentionally routed to the Python pdfplumber backend", EXIT_UNSUPPORTED);
}

async function commandCheck(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const qpdf = await executableInfo("qpdf", ["--version"]);
  if (qpdf.available) {
    const qpdfArgs = [source, "--check"];
    const password = getPassword("PDF_PASSWORD");
    if (password !== undefined) qpdfArgs.splice(1, 0, `--password=${password}`);
    const report = await runQpdfArgs(qpdfArgs, { allowedCodes: new Set([0, 3]) });
    const encrypted = await qpdfEncryptionState(source);
    const qpdfDetails = (password !== undefined || encrypted === true)
      ? {
          returncode: report.code,
          diagnostics: "suppressed for encrypted or password-bearing input to avoid exposing recovered credential material",
        }
      : `${report.stdout}\n${report.stderr}`.trim();
    return resultEnvelope("check", ["qpdf"], {
      inputs: [source],
      warnings: report.code === 3 ? ["qpdf completed with warnings; inspect the structural report in a protected diagnostic session"] : [],
      details: { qpdf: qpdfDetails },
    });
  }
  await inspectWithPdfJs(source);
  await loadWithPdfLib(source);
  return resultEnvelope("check", ["pdfjs-dist", "pdf-lib"], {
    inputs: [source], warnings: ["qpdf is unavailable; only parser-level validation was performed"],
  });
}

async function qpdfTransform(command, sourceValue, outputValue, options) {
  const source = await requireFile(sourceValue);
  const output = path.resolve(outputValue);
  ensureDistinctOutput(output, [source]);
  await mkdir(path.dirname(output), { recursive: true });
  const password = getPassword("PDF_PASSWORD");
  const temp = tempSibling(output);
  let report;
  try {
    const qpdfArgs = [source];
    if (password !== undefined) qpdfArgs.push(`--password=${password}`);
    qpdfArgs.push(...options, temp);
    report = await runQpdfArgs(qpdfArgs, { allowedCodes: new Set([0, 3]) });
    await validatePdfHeader(temp);
    const checkArgs = [temp];
    if (password !== undefined) checkArgs.push(`--password=${password}`);
    checkArgs.push("--check");
    await runQpdfArgs(checkArgs, { allowedCodes: new Set([0, 3]) });
    await replaceFile(temp, output);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
  return resultEnvelope(command, ["qpdf"], {
    inputs: [source],
    outputs: [output],
    warnings: report?.code === 3 ? ["qpdf completed with warnings; inspect the structural diagnostics"] : [],
  });
}

async function commandRepair(args) {
  const result = await qpdfTransform(
    "repair",
    requiredPositional(args.positionals, 0, "input"),
    requiredOption(args.options, "output"),
    ["--warning-exit-0", "--object-streams=generate"],
  );
  result.warnings.push("repair rewrites structure; compare document-level features and rendered pages");
  return result;
}

async function commandLinearize(args) {
  return qpdfTransform(
    "linearize",
    requiredPositional(args.positionals, 0, "input"),
    requiredOption(args.options, "output"),
    ["--linearize"],
  );
}

async function commandDecrypt(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  const envName = args.options["password-env"] || "PDF_PASSWORD";
  const password = getPassword(envName, true);
  ensureDistinctOutput(output, [source]);
  const temp = tempSibling(output);
  try {
    await runQpdfArgs([source, `--password=${password}`, "--decrypt", temp]);
    await validatePdfHeader(temp);
    await replaceFile(temp, output);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
  return resultEnvelope("decrypt", ["qpdf"], {
    inputs: [source], outputs: [output],
    warnings: ["decrypted output is sensitive clear-text material; apply the caller's retention policy"],
  });
}

async function commandEncrypt(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  const user = getPassword(requiredOption(args.options, "user-password-env"), true);
  const owner = getPassword(requiredOption(args.options, "owner-password-env"), true);
  if (!user || !owner) throw new ToolError("user and owner passwords must both be non-empty", EXIT_AUTH);
  if (user === owner) throw new ToolError("user and owner passwords must differ", EXIT_AUTH);
  ensureDistinctOutput(output, [source]);
  const temp = tempSibling(output);
  try {
    await runQpdfArgs([
      source,
      "--encrypt",
      `--user-password=${user}`,
      `--owner-password=${owner}`,
      "--bits=256",
      "--",
      temp,
    ]);
    await validatePdfHeader(temp);
    await runQpdfArgs([temp, `--password=${user}`, "--check"], { allowedCodes: new Set([0, 3]) });
    await replaceFile(temp, output);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
  return resultEnvelope("encrypt", ["qpdf"], {
    inputs: [source], outputs: [output], details: { algorithm: "AES-256" },
  });
}

async function commandOcr(args) {
  const source = await requireFile(requiredPositional(args.positionals, 0, "input"));
  const output = path.resolve(requiredOption(args.options, "output"));
  const languages = args.options.languages || "eng";
  if (!languages.trim()) throw new ToolError("OCR languages must not be empty", EXIT_ARGUMENT);
  ensureDistinctOutput(output, [source]);
  const temp = tempSibling(output);
  let usedClearCopy = false;
  try {
    await withNativeReadablePdf(source, async (workingSource, clearCopy) => {
      usedClearCopy = clearCopy;
      const commandArgs = ["--language", languages, "--output-type", "pdf", "--skip-text"];
      if (args.options.deskew) commandArgs.push("--deskew");
      if (args.options["rotate-pages"]) commandArgs.push("--rotate-pages");
      commandArgs.push(workingSource, temp);
      await runProcess("ocrmypdf", commandArgs);
    });
    await validatePdfHeader(temp);
    await replaceFile(temp, output);
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
  const warnings = ["review OCR text and rendered appearance; recognition is not authoritative"];
  if (usedClearCopy) warnings.push("the encrypted source was OCRed through a deleted clear-text working copy; the OCR output is not automatically re-encrypted");
  if (args.options.deskew || args.options["rotate-pages"]) warnings.push("cleanup/orientation options can change appearance; compare against the original");
  return resultEnvelope("ocr", ["ocrmypdf", "tesseract"], {
    inputs: [source], outputs: [output], warnings,
    details: {
      languages,
      deskew: Boolean(args.options.deskew),
      rotate_pages: Boolean(args.options["rotate-pages"]),
      skip_text: true,
    },
  });
}

const handlers = {
  doctor: commandDoctor,
  inspect: commandInspect,
  "extract-text": commandExtractText,
  merge: commandMerge,
  select: commandSelect,
  split: commandSplit,
  rotate: commandRotate,
  crop: commandCrop,
  watermark: commandWatermark,
  "form-list": commandFormList,
  "form-fill": commandFormFill,
  render: commandRender,
  "extract-images": commandExtractImages,
  "extract-tables": commandExtractTables,
  check: commandCheck,
  repair: commandRepair,
  linearize: commandLinearize,
  decrypt: commandDecrypt,
  encrypt: commandEncrypt,
  ocr: commandOcr,
};

function printHelp() {
  console.log(`Usage: pdf-tool [--json] [--quiet] [--overwrite] COMMAND ...

Global --overwrite is valid only after explicit replacement approval.

Commands:
  doctor
  inspect INPUT
  extract-text INPUT --output FILE [--layout]
  merge --output OUTPUT INPUT INPUT [...]
  select INPUT --pages SPEC --output OUTPUT
  split INPUT --output-dir DIR [--chunk-size N]
  rotate INPUT --pages SPEC --degrees N --output OUTPUT
  crop INPUT --pages SPEC --box L,B,R,T --output OUTPUT
  watermark INPUT --stamp STAMP --pages SPEC --output OUTPUT [--fit contain|stretch|none]
  form-list INPUT --output FILE
  form-fill INPUT --values FILE --output OUTPUT [--flatten] [--font FONT]
  render INPUT --output-dir DIR [--dpi N] [--format png|jpeg] [--pages SPEC]
  extract-images INPUT --output-dir DIR
  extract-tables INPUT --output FILE [--pages SPEC]  (dispatcher routes to Python)
  check INPUT
  repair INPUT --output OUTPUT
  linearize INPUT --output OUTPUT
  decrypt INPUT --output OUTPUT [--password-env NAME]
  encrypt INPUT --output OUTPUT --user-password-env NAME --owner-password-env NAME
  ocr INPUT --output OUTPUT [--languages spa+eng] [--deskew] [--rotate-pages]
`);
}

async function main(argv = process.argv.slice(2)) {
  let flags = { json: false, quiet: false, overwrite: false };
  let command = "unknown";
  try {
    const extracted = extractGlobalFlags(argv);
    flags = extracted.flags;
    allowOverwrite = flags.overwrite;
    const cleaned = extracted.cleaned;
    if (!cleaned.length || cleaned[0] === "-h" || cleaned[0] === "--help" || cleaned[0] === "help") {
      printHelp();
      return 0;
    }
    command = cleaned[0];
    const handler = handlers[command];
    if (!handler) throw new ToolError(`unknown command: ${command}`, EXIT_ARGUMENT);
    const args = parseTokens(cleaned.slice(1));
    const result = await handler(args);
    emitResult(result, flags);
    return 0;
  } catch (error) {
    const normalized = error instanceof ToolError
      ? error
      : new ToolError(`unexpected backend failure: ${error?.message || error}`, EXIT_OUTPUT);
    emitError(command, normalized, flags);
    return normalized.code;
  }
}

process.exitCode = await main();
