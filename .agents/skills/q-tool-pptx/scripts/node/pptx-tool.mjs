#!/usr/bin/env node
/**
 * Node PPTX backend for q-tool-pptx.
 *
 * Read-and-validate adapter over JSZip and fast-xml-parser, plus native-tool
 * wrappers for rendering (LibreOffice + Poppler). Deck creation and structural
 * editing commands (select, replace-text, contact-sheet) are Python-only in
 * this version and return a capability error here.
 *
 * Runs on Node and uses only `node:` builtins plus declared dependencies.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fsp from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import posix from "node:path/posix";
import process from "node:process";

const EXIT_OK = 0;
const EXIT_ARGS = 2;
const EXIT_INPUT = 3;
const EXIT_MISSING_DEPENDENCY = 4;
const EXIT_UNSUPPORTED = 5;
const EXIT_OUTPUT = 6;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_ENTRIES = 4096;
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 250;
const MAX_XML_BYTES = 16 * 1024 * 1024;
const READABLE_EXTENSIONS = new Set([".pptx", ".potx", ".ppsx"]);

const require = createRequire(import.meta.url);

class ToolError extends Error {
  constructor(message, code = EXIT_OUTPUT) {
    super(message);
    this.code = code;
  }
}

function loadDependency(name) {
  try {
    return require(name);
  } catch (error) {
    throw new ToolError(
      `${name} is not installed; run \`npm install\` inside scripts/node`,
      EXIT_MISSING_DEPENDENCY,
    );
  }
}

const RUNTIME = "node";

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

async function requireInputFile(file) {
  try {
    const stats = await fsp.stat(file);
    if (!stats.isFile()) throw new ToolError(`input is not a file: ${file}`, EXIT_INPUT);
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError(`input not found: ${file}`, EXIT_INPUT);
  }
  const extension = path.extname(file).toLowerCase();
  if (!READABLE_EXTENSIONS.has(extension)) {
    throw new ToolError(
      `unsupported presentation format '${extension || "(none)"}'; use PPTX, or a verified read-only POTX/PPSX route`,
      EXIT_UNSUPPORTED,
    );
  }
  return file;
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function requireDistinctOutput(input, output) {
  if (samePath(input, output)) {
    throw new ToolError("input and output paths must be distinct", EXIT_OUTPUT);
  }
}

async function checkOutputPath(file, overwrite) {
  if (fs.existsSync(file)) {
    if (!overwrite) {
      throw new ToolError(
        `output already exists: ${file}; pass --overwrite only with explicit replacement approval`,
        EXIT_OUTPUT,
      );
    }
    if (fs.statSync(file).isDirectory()) {
      throw new ToolError(`output path is a directory: ${file}`, EXIT_OUTPUT);
    }
  }
  await fsp.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  return file;
}

async function checkOutputDir(dir) {
  if (fs.existsSync(dir)) {
    if (!fs.statSync(dir).isDirectory()) {
      throw new ToolError(`output directory path is a file: ${dir}`, EXIT_OUTPUT);
    }
    const entries = await fsp.readdir(dir);
    if (entries.length > 0) {
      throw new ToolError(
        `output directory is not empty: ${dir}; choose a fresh directory so stale files cannot pose as results`,
        EXIT_OUTPUT,
      );
    }
  } else {
    await fsp.mkdir(dir, { recursive: true });
  }
  return dir;
}

async function atomicWrite(target, data) {
  const temp = path.join(
    path.dirname(path.resolve(target)),
    `.${path.basename(target)}.${process.pid}.${Math.floor(performance.now() * 1000)}.tmp`,
  );
  try {
    await fsp.writeFile(temp, data);
    await fsp.rename(temp, target);
  } catch (error) {
    await fsp.rm(temp, { force: true });
    throw error;
  }
}

function parseSlideSpec(spec, total) {
  const text = String(spec ?? "").trim().toLowerCase();
  if (!text) throw new ToolError("empty slide specification", EXIT_ARGS);
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (text === "all") return range(1, total);
  if (text === "odd") return range(1, total).filter((n) => n % 2 === 1);
  if (text === "even") return range(1, total).filter((n) => n % 2 === 0);
  const resolve = (token) => {
    if (token === "last") return total;
    if (!/^\d+$/.test(token)) throw new ToolError(`invalid slide token: '${token}'`, EXIT_ARGS);
    const value = Number(token);
    if (value < 1) throw new ToolError(`slide numbers are 1-based; got ${value}`, EXIT_ARGS);
    if (value > total) throw new ToolError(`slide ${value} beyond deck of ${total} slides`, EXIT_ARGS);
    return value;
  };
  const selected = [];
  for (const rawChunk of text.split(",")) {
    const chunk = rawChunk.trim();
    if (!chunk) throw new ToolError("empty token in slide specification", EXIT_ARGS);
    if (chunk.includes("-") && chunk !== "last") {
      const [fromText, toText] = chunk.split("-", 2);
      const from = resolve(fromText.trim());
      const to = resolve(toText.trim());
      if (to < from) throw new ToolError(`descending range not allowed: ${chunk}`, EXIT_ARGS);
      selected.push(...range(from, to));
    } else {
      selected.push(resolve(chunk));
    }
  }
  return selected;
}

function resultEnvelope(command, backend, inputs) {
  return {
    ok: true,
    command,
    runtime: RUNTIME,
    backend,
    inputs,
    outputs: [],
    warnings: [],
    details: {},
  };
}

function runProcess(executable, args, { timeout = 600000 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resolve({ code: -1, stdout: "", stderr: String(error), spawnFailed: true });
      return;
    }
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr, spawnFailed: true });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr, spawnFailed: false });
    });
  });
}

async function commandAvailable(executable) {
  const probe = await runProcess(executable, ["--version"], { timeout: 15000 });
  return !probe.spawnFailed;
}

// ---------------------------------------------------------------------------
// PPTX package helpers (JSZip + fast-xml-parser)
// ---------------------------------------------------------------------------

async function openPackage(file) {
  const JSZip = loadDependency("jszip");
  let data;
  try {
    const stats = await fsp.stat(file);
    if (stats.size > MAX_ARCHIVE_BYTES) {
      throw new ToolError("presentation exceeds the 64 MiB compressed-size safety limit", EXIT_INPUT);
    }
    data = await fsp.readFile(file);
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError(`cannot read input: ${file}`, EXIT_INPUT);
  }
  try {
    const zip = await JSZip.loadAsync(data);
    validatePackageEntries(zip);
    await validatePackageXml(zip);
    return await JSZip.loadAsync(data, { checkCRC32: true });
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError(`not a readable PPTX/ZIP package: ${error.message}`, EXIT_INPUT);
  }
}

function safeMemberName(name) {
  const normalized = name.replaceAll("\\", "/");
  return (
    normalized.length > 0 &&
    !normalized.startsWith("/") &&
    !/^[A-Za-z]:/.test(normalized) &&
    !normalized.split("/").includes("..")
  );
}

function validatePackageEntries(zip) {
  const entries = Object.entries(zip.files);
  if (entries.length > MAX_ENTRIES) {
    throw new ToolError("presentation contains too many ZIP members", EXIT_INPUT);
  }
  let expanded = 0;
  for (const [name, entry] of entries) {
    if (!safeMemberName(name) || (entry.unsafeOriginalName && entry.unsafeOriginalName !== name)) {
      throw new ToolError(`unsafe ZIP member path: ${entry.unsafeOriginalName || name}`, EXIT_INPUT);
    }
    const mode = Number(entry.unixPermissions || 0);
    if (mode && (mode & 0o170000) === 0o120000) {
      throw new ToolError(`symlink ZIP member is unsupported: ${name}`, EXIT_INPUT);
    }
    const uncompressed = Number(entry?._data?.uncompressedSize || 0);
    const compressed = Number(entry?._data?.compressedSize || 0);
    expanded += uncompressed;
    if (expanded > MAX_EXPANDED_BYTES) {
      throw new ToolError("expanded presentation exceeds the 256 MiB safety limit", EXIT_INPUT);
    }
    if (compressed > 0 && uncompressed / compressed > MAX_COMPRESSION_RATIO) {
      throw new ToolError(`suspicious compression ratio in ZIP member: ${name}`, EXIT_INPUT);
    }
  }
  const lowerNames = new Set(entries.map(([name]) => name.toLowerCase()));
  if (lowerNames.has("ppt/vbaproject.bin")) {
    throw new ToolError("macro-bearing presentations are unsupported", EXIT_UNSUPPORTED);
  }
  if ([...lowerNames].some((name) => name.startsWith("_xmlsignatures/"))) {
    throw new ToolError("signed presentation packages are unsupported", EXIT_UNSUPPORTED);
  }
}

async function validatePackageXml(zip) {
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir || !(name.endsWith(".xml") || name.endsWith(".rels"))) continue;
    const xml = await entry.async("nodebuffer");
    if (xml.length > MAX_XML_BYTES) {
      throw new ToolError(`XML part exceeds the 16 MiB safety limit: ${name}`, EXIT_INPUT);
    }
    if (/<!DOCTYPE|<!ENTITY/i.test(xml.toString("utf8"))) {
      throw new ToolError(`DTD or entity declaration is unsupported in package XML: ${name}`, EXIT_INPUT);
    }
    if (/<(?:[A-Za-z0-9_]+:)?modifyVerifier\b/i.test(xml.toString("utf8"))) {
      throw new ToolError("protected presentation packages are unsupported", EXIT_UNSUPPORTED);
    }
  }
}

function xmlTools() {
  const { XMLParser, XMLValidator } = loadDependency("fast-xml-parser");
  return { XMLParser, XMLValidator };
}

async function readEntryText(zip, name) {
  const entry = zip.file(name);
  if (!entry) throw new ToolError(`package part missing: ${name}`, EXIT_INPUT);
  const xml = await entry.async("string");
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) {
    throw new ToolError(`XML part exceeds the 16 MiB safety limit: ${name}`, EXIT_INPUT);
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new ToolError(`DTD or entity declaration is unsupported in package XML: ${name}`, EXIT_INPUT);
  }
  return xml;
}

function parsePreservingOrder(XMLParser, xml) {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: false,
    processEntities: false,
  });
  return parser.parse(xml);
}

function parsePlain(XMLParser, xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
  });
  return parser.parse(xml);
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Resolve the ordered slide part names from presentation.xml + its rels. */
async function slidePartsInOrder(zip, XMLParser) {
  const presentation = parsePlain(XMLParser, await readEntryText(zip, "ppt/presentation.xml"));
  const rels = parsePlain(XMLParser, await readEntryText(zip, "ppt/_rels/presentation.xml.rels"));
  const relTargets = new Map();
  for (const rel of asArray(rels?.Relationships?.Relationship)) {
    relTargets.set(rel["@_Id"], rel["@_Target"]);
  }
  const slideIds = asArray(presentation?.["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]);
  const parts = [];
  for (const slideId of slideIds) {
    const target = relTargets.get(slideId["@_r:id"]);
    if (!target) throw new ToolError(`sldIdLst references undeclared relationship ${slideId["@_r:id"]}`, EXIT_INPUT);
    parts.push(posix.normalize(posix.join("ppt", target)));
  }
  return parts;
}

/** Collect visible text lines from a slide/notes XML document in content order. */
function collectTextLines(orderedTree) {
  const lines = [];
  const paragraphText = (node) => {
    let text = "";
    const walk = (children) => {
      for (const child of children) {
        for (const [key, value] of Object.entries(child)) {
          if (key === "a:t") {
            text += asArray(value)
              .map((item) => (typeof item === "object" ? item["#text"] ?? "" : String(item)))
              .join("");
          } else if (Array.isArray(value)) {
            walk(value);
          }
        }
      }
    };
    walk(node);
    return text;
  };
  const walk = (children) => {
    for (const child of children) {
      for (const [key, value] of Object.entries(child)) {
        if (key === "a:p") {
          const text = paragraphText(Array.isArray(value) ? value : []);
          if (text.trim()) lines.push(text);
        } else if (Array.isArray(value)) {
          walk(value);
        }
      }
    }
  };
  walk(orderedTree);
  return lines;
}

async function notesPartFor(zip, XMLParser, slidePart) {
  const relsName = posix.join(posix.dirname(slidePart), "_rels", `${posix.basename(slidePart)}.rels`);
  const entry = zip.file(relsName);
  if (!entry) return null;
  const rels = parsePlain(XMLParser, await entry.async("string"));
  for (const rel of asArray(rels?.Relationships?.Relationship)) {
    if (String(rel["@_Type"] ?? "").endsWith("/notesSlide")) {
      return posix.normalize(posix.join(posix.dirname(slidePart), rel["@_Target"]));
    }
  }
  return null;
}

async function packageFeatureFlags(zip, XMLParser) {
  let externalRelationships = 0;
  let embeddedObjects = 0;
  for (const [name, entry] of Object.entries(zip.files)) {
    if (name.startsWith("ppt/embeddings/") && !entry.dir) embeddedObjects += 1;
    if (!name.endsWith(".rels") || entry.dir) continue;
    const parsed = parsePlain(XMLParser, await readEntryText(zip, name));
    externalRelationships += asArray(parsed?.Relationships?.Relationship).filter(
      (relationship) => (relationship["@_TargetMode"] ?? "Internal") === "External",
    ).length;
  }
  return {
    external_relationships: externalRelationships,
    embedded_objects: embeddedObjects,
  };
}

async function writeDirectoryManifest(dir, command, entries, ok, error) {
  const manifest = { ok, command, runtime: RUNTIME, outputs: entries };
  if (error) manifest.error = error;
  await fsp.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdDoctor(options) {
  const dependencyPresent = (name) => {
    try {
      require.resolve(name);
      return true;
    } catch {
      return false;
    }
  };
  const modules = {
    jszip: dependencyPresent("jszip"),
    "fast-xml-parser": dependencyPresent("fast-xml-parser"),
  };
  const native = {
    soffice: await commandAvailable("soffice"),
    pdftoppm: await commandAvailable("pdftoppm"),
  };
  const readParts = modules.jszip && modules["fast-xml-parser"];
  const readiness = {
    inspect: readParts,
    "extract-text": readParts,
    "extract-notes": readParts,
    "extract-media": modules.jszip,
    check: readParts,
    render: native.soffice && native.pdftoppm,
    "programmatic-creation": false,
    select: false,
    "replace-text": false,
    "contact-sheet": false,
  };
  const result = resultEnvelope("doctor", [RUNTIME], []);
  result.details = {
    engine: RUNTIME,
    version: process.version,
    modules,
    native_tools: native,
    command_readiness: readiness,
    python_only_commands: ["select", "replace-text", "contact-sheet"],
  };
  if (!options.json && !options.quiet) {
    process.stdout.write(`${RUNTIME} ${process.version}\n`);
    for (const [name, present] of Object.entries({ ...modules, ...native })) {
      process.stdout.write(`${present ? "ok  " : "MISS"} ${name}\n`);
    }
    for (const [name, ready] of Object.entries(readiness)) {
      process.stdout.write(`${ready ? "ready  " : "blocked"} ${name}\n`);
    }
  }
  return result;
}

async function cmdInspect(options) {
  const [input] = options.positional;
  if (!input) throw new ToolError("inspect requires an input file", EXIT_ARGS);
  await requireInputFile(input);
  const { XMLParser } = xmlTools();
  const zip = await openPackage(input);
  const slideParts = await slidePartsInOrder(zip, XMLParser);

  const presentation = parsePlain(XMLParser, await readEntryText(zip, "ppt/presentation.xml"));
  const size = presentation?.["p:presentation"]?.["p:sldSz"] ?? {};
  const emuPerInch = 914400;
  const widthIn = size["@_cx"] ? Number(size["@_cx"]) / emuPerInch : null;
  const heightIn = size["@_cy"] ? Number(size["@_cy"]) / emuPerInch : null;

  let core = {};
  const coreEntry = zip.file("docProps/core.xml");
  if (coreEntry) {
    const parsed = parsePlain(XMLParser, await coreEntry.async("string"));
    const coreRoot = parsed?.["cp:coreProperties"] ?? {};
    const textOf = (node) => (typeof node === "object" ? node?.["#text"] ?? "" : node ?? "");
    core = {
      title: String(textOf(coreRoot["dc:title"]) ?? ""),
      author: String(textOf(coreRoot["dc:creator"]) ?? ""),
      last_modified_by: String(textOf(coreRoot["cp:lastModifiedBy"]) ?? ""),
      modified: String(textOf(coreRoot["dcterms:modified"]) ?? ""),
    };
  }

  const mediaCount = Object.keys(zip.files).filter(
    (name) => name.startsWith("ppt/media/") && !zip.files[name].dir,
  ).length;
  const packageFlags = await packageFeatureFlags(zip, XMLParser);

  const slides = [];
  for (const [index, part] of slideParts.entries()) {
    const ordered = parsePreservingOrder(XMLParser, await readEntryText(zip, part));
    const lines = collectTextLines(ordered);
    slides.push({
      number: index + 1,
      part: `/${part}`,
      first_text: (lines[0] ?? "").slice(0, 120),
      text_line_count: lines.length,
      has_notes: Boolean(await notesPartFor(zip, XMLParser, part)),
    });
  }

  const result = resultEnvelope("inspect", ["jszip", "fast-xml-parser"], [input]);
  result.details = {
    slide_count: slideParts.length,
    slide_width_in: widthIn === null ? null : Math.round(widthIn * 1000) / 1000,
    slide_height_in: heightIn === null ? null : Math.round(heightIn * 1000) / 1000,
    media_count: mediaCount,
    core_properties: core,
    package_flags: packageFlags,
    slides,
  };
  if (!options.json && !options.quiet) {
    process.stdout.write(
      `slides=${slideParts.length} size=${widthIn ?? "?"}x${heightIn ?? "?"}in media=${mediaCount}\n`,
    );
    for (const slide of slides) {
      process.stdout.write(
        `  ${String(slide.number).padStart(3)} ${slide.first_text}${slide.has_notes ? " +notes" : ""}\n`,
      );
    }
  }
  return result;
}

async function extractCommon(options, { withNotesDefault }) {
  const [input] = options.positional;
  if (!input) throw new ToolError("an input file is required", EXIT_ARGS);
  if (!options.flags.output) throw new ToolError("--output FILE is required", EXIT_ARGS);
  await requireInputFile(input);
  requireDistinctOutput(input, options.flags.output);
  await checkOutputPath(options.flags.output, options.overwrite);
  const { XMLParser } = xmlTools();
  const zip = await openPackage(input);
  const slideParts = await slidePartsInOrder(zip, XMLParser);
  const selected = options.flags.slides
    ? parseSlideSpec(options.flags.slides, slideParts.length)
    : Array.from({ length: slideParts.length }, (_, i) => i + 1);
  return { input, zip, XMLParser, slideParts, selected, withNotes: withNotesDefault };
}

async function cmdExtractText(options) {
  const context = await extractCommon(options, { withNotesDefault: Boolean(options.flags["with-notes"]) });
  const blocks = [];
  for (const number of context.selected) {
    const part = context.slideParts[number - 1];
    const ordered = parsePreservingOrder(context.XMLParser, await readEntryText(context.zip, part));
    const lines = collectTextLines(ordered);
    const block = [`## Slide ${number}`, "", ...(lines.length ? lines : ["(no text)"])];
    if (context.withNotes) {
      const notesPart = await notesPartFor(context.zip, context.XMLParser, part);
      if (notesPart && context.zip.file(notesPart)) {
        const notesTree = parsePreservingOrder(context.XMLParser, await readEntryText(context.zip, notesPart));
        const noteLines = collectTextLines(notesTree).filter((line) => !/^\d+$/.test(line.trim()));
        if (noteLines.length) block.push("", `> Notes: ${noteLines.join("\n> ")}`);
      }
    }
    blocks.push(block.join("\n"));
  }
  await atomicWrite(options.flags.output, `${blocks.join("\n\n")}\n`);
  const result = resultEnvelope("extract-text", ["jszip", "fast-xml-parser"], [context.input]);
  result.outputs = [options.flags.output];
  result.details = { slides_extracted: context.selected };
  return result;
}

async function cmdExtractNotes(options) {
  const context = await extractCommon(options, { withNotesDefault: true });
  const blocks = [];
  let slidesWithNotes = 0;
  for (const number of context.selected) {
    const part = context.slideParts[number - 1];
    const notesPart = await notesPartFor(context.zip, context.XMLParser, part);
    let notes = "";
    if (notesPart && context.zip.file(notesPart)) {
      const notesTree = parsePreservingOrder(context.XMLParser, await readEntryText(context.zip, notesPart));
      notes = collectTextLines(notesTree)
        .filter((line) => !/^\d+$/.test(line.trim()))
        .join("\n");
    }
    if (notes) slidesWithNotes += 1;
    blocks.push(`## Slide ${number}\n\n${notes || "(no notes)"}`);
  }
  await atomicWrite(options.flags.output, `${blocks.join("\n\n")}\n`);
  const result = resultEnvelope("extract-notes", ["jszip", "fast-xml-parser"], [context.input]);
  result.outputs = [options.flags.output];
  result.details = { slides_checked: context.selected, slides_with_notes: slidesWithNotes };
  return result;
}

async function cmdExtractMedia(options) {
  const [input] = options.positional;
  if (!input) throw new ToolError("extract-media requires an input file", EXIT_ARGS);
  if (!options.flags["output-dir"]) throw new ToolError("--output-dir DIR is required", EXIT_ARGS);
  await requireInputFile(input);
  const outDir = await checkOutputDir(options.flags["output-dir"]);
  const zip = await openPackage(input);
  const entries = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!name.startsWith("ppt/media/") || entry.dir) continue;
    const data = await entry.async("nodebuffer");
    const target = path.join(outDir, path.basename(name));
    await atomicWrite(target, data);
    entries.push({ path: target, bytes: data.length, source_part: `/${name}` });
  }
  await writeDirectoryManifest(outDir, "extract-media", entries, true);
  const result = resultEnvelope("extract-media", ["jszip"], [input]);
  result.outputs = entries.map((entry) => entry.path);
  result.details = { media_count: entries.length, manifest: path.join(outDir, "manifest.json") };
  if (!entries.length) result.warnings.push("deck contains no media parts");
  return result;
}

async function cmdCheck(options) {
  const [input] = options.positional;
  if (!input) throw new ToolError("check requires an input file", EXIT_ARGS);
  await requireInputFile(input);
  const { XMLParser, XMLValidator } = xmlTools();
  const zip = await openPackage(input);
  const errors = [];
  const warnings = [];
  const names = new Set(Object.keys(zip.files).filter((name) => !zip.files[name].dir));

  // Content types coverage.
  const defaults = new Map();
  const overrides = new Map();
  if (!names.has("[Content_Types].xml")) {
    errors.push("missing [Content_Types].xml");
  } else {
    const parsed = parsePlain(XMLParser, await readEntryText(zip, "[Content_Types].xml"));
    for (const node of asArray(parsed?.Types?.Default)) {
      defaults.set(String(node["@_Extension"] ?? "").toLowerCase(), node["@_ContentType"]);
    }
    for (const node of asArray(parsed?.Types?.Override)) {
      overrides.set(node["@_PartName"], node["@_ContentType"]);
    }
    for (const name of names) {
      if (name === "[Content_Types].xml") continue;
      const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
      if (!overrides.has(`/${name}`) && !defaults.has(extension)) {
        errors.push(`part has no declared content type: /${name}`);
      }
    }
  }

  // XML well-formedness.
  for (const name of [...names].sort()) {
    if (!name.endsWith(".xml") && !name.endsWith(".rels")) continue;
    const verdict = XMLValidator.validate(await readEntryText(zip, name));
    if (verdict !== true) {
      errors.push(`XML part is not well-formed: /${name}: ${verdict.err?.msg ?? "parse error"}`);
    }
  }

  // Relationship target existence.
  for (const relsName of [...names].filter((name) => name.endsWith(".rels")).sort()) {
    const base = posix.dirname(posix.dirname(relsName));
    const parsed = parsePlain(XMLParser, await readEntryText(zip, relsName));
    for (const rel of asArray(parsed?.Relationships?.Relationship)) {
      if ((rel["@_TargetMode"] ?? "Internal") === "External") continue;
      const resolved = posix.normalize(posix.join(base === "." ? "" : base, rel["@_Target"])).replace(/^\/+/, "");
      if (!names.has(resolved)) {
        errors.push(`${relsName}: relationship target missing: ${rel["@_Target"]}`);
      }
    }
  }

  // Slide list resolution.
  let slideCount = 0;
  try {
    const slideParts = await slidePartsInOrder(zip, XMLParser);
    slideCount = slideParts.length;
    for (const part of slideParts) {
      if (!names.has(part)) errors.push(`slide part missing: /${part}`);
    }
  } catch (error) {
    errors.push(`presentation structure check failed: ${error.message}`);
  }
  if (slideCount === 0 && errors.length === 0) warnings.push("deck has no slides in sldIdLst");
  const packageFlags = await packageFeatureFlags(zip, XMLParser);
  if (packageFlags.external_relationships) {
    warnings.push(
      `package contains ${packageFlags.external_relationships} external relationship(s); they were not followed`,
    );
  }
  if (packageFlags.embedded_objects) {
    warnings.push(`package contains ${packageFlags.embedded_objects} embedded object(s); they were not executed`);
  }

  const result = resultEnvelope("check", ["jszip", "fast-xml-parser"], [input]);
  result.warnings = warnings;
  result.details = { errors, slide_count: slideCount, package_flags: packageFlags };
  if (errors.length) {
    result.ok = false;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      for (const error of errors) process.stderr.write(`error: ${error}\n`);
    }
    process.exitCode = EXIT_OUTPUT;
    return null;
  }
  if (!options.json && !options.quiet) {
    process.stdout.write(`check passed: ${slideCount} slides, no structural errors\n`);
  }
  return result;
}

async function cmdRender(options) {
  const [input] = options.positional;
  if (!input) throw new ToolError("render requires an input file", EXIT_ARGS);
  if (!options.flags["output-dir"]) throw new ToolError("--output-dir DIR is required", EXIT_ARGS);
  const dpi = Number(options.flags.dpi ?? 150);
  const format = options.flags.format ?? "png";
  if (!Number.isInteger(dpi) || dpi < 36 || dpi > 600) {
    throw new ToolError("--dpi must be an integer from 36 to 600", EXIT_ARGS);
  }
  if (!["png", "jpeg"].includes(format)) throw new ToolError("--format must be png or jpeg", EXIT_ARGS);
  await requireInputFile(input);
  const { XMLParser } = xmlTools();
  const zip = await openPackage(input);
  const packageFlags = await packageFeatureFlags(zip, XMLParser);
  const activeFlags = Object.entries(packageFlags).filter(([, count]) => count).map(([name]) => name);
  if (activeFlags.length) {
    throw new ToolError(`rendering is blocked for packages with ${activeFlags.join(", ")}`, EXIT_UNSUPPORTED);
  }
  const outDir = await checkOutputDir(options.flags["output-dir"]);

  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "pptx-render-"));
  const profile = await fsp.mkdtemp(path.join(os.tmpdir(), "pptx-soffice-profile-"));
  try {
    const soffice = await runProcess("soffice", [
      "--headless",
      "--norestore",
      `-env:UserInstallation=file://${profile}`,
      "--convert-to",
      "pdf",
      "--outdir",
      scratch,
      path.resolve(input),
    ]);
    if (soffice.spawnFailed) {
      throw new ToolError("LibreOffice (soffice) is required for rendering", EXIT_MISSING_DEPENDENCY);
    }
    const pdfPath = path.join(scratch, `${path.basename(input, path.extname(input))}.pdf`);
    if (soffice.code !== 0 || !fs.existsSync(pdfPath)) {
      throw new ToolError(
        `LibreOffice conversion failed: ${(soffice.stderr || soffice.stdout || "").trim().slice(-500)}`,
        EXIT_OUTPUT,
      );
    }
    const flag = format === "png" ? "-png" : "-jpeg";
    const pdftoppm = await runProcess("pdftoppm", [flag, "-r", String(dpi), pdfPath, path.join(scratch, "slide")]);
    if (pdftoppm.spawnFailed) {
      throw new ToolError("Poppler (pdftoppm) is required for rendering", EXIT_MISSING_DEPENDENCY);
    }
    if (pdftoppm.code !== 0) {
      throw new ToolError(`pdftoppm failed: ${pdftoppm.stderr.trim().slice(-500)}`, EXIT_OUTPUT);
    }
    const suffix = format === "png" ? ".png" : ".jpg";
    const images = (await fsp.readdir(scratch)).filter((name) => name.startsWith("slide-") && name.endsWith(suffix)).sort();
    if (!images.length) throw new ToolError("rendering produced no page images", EXIT_OUTPUT);
    const total = images.length;
    const selected = options.flags.slides
      ? parseSlideSpec(options.flags.slides, total)
      : Array.from({ length: total }, (_, i) => i + 1);
    if (new Set(selected).size !== selected.length) {
      throw new ToolError("repeated slides are not allowed in a render specification", EXIT_ARGS);
    }
    const width = Math.max(2, String(total).length);
    const entries = [];
    for (const slideNumber of selected) {
      const target = path.join(outDir, `slide-${String(slideNumber).padStart(width, "0")}${suffix}`);
      await fsp.copyFile(path.join(scratch, images[slideNumber - 1]), target);
      entries.push({ path: target, slide: slideNumber });
    }
    await writeDirectoryManifest(outDir, "render", entries, true);
    const result = resultEnvelope("render", ["soffice", "pdftoppm"], [input]);
    result.outputs = entries.map((entry) => entry.path);
    result.details = {
      dpi,
      format,
      slides_rendered: selected,
      manifest: path.join(outDir, "manifest.json"),
    };
    return result;
  } catch (error) {
    await writeDirectoryManifest(outDir, "render", [], false, String(error.message ?? error));
    throw error;
  } finally {
    await fsp.rm(scratch, { recursive: true, force: true });
    await fsp.rm(profile, { recursive: true, force: true });
  }
}

function pythonOnly(command) {
  return async () => {
    throw new ToolError(
      `'${command}' is Python-only in this version; rerun through the dispatcher without --runtime, or with --runtime python`,
      EXIT_UNSUPPORTED,
    );
  };
}

const handlers = {
  doctor: cmdDoctor,
  inspect: cmdInspect,
  "extract-text": cmdExtractText,
  "extract-notes": cmdExtractNotes,
  "extract-media": cmdExtractMedia,
  check: cmdCheck,
  render: cmdRender,
  select: pythonOnly("select"),
  "replace-text": pythonOnly("replace-text"),
  "contact-sheet": pythonOnly("contact-sheet"),
};

// ---------------------------------------------------------------------------
// CLI wiring
// ---------------------------------------------------------------------------

const HELP = `Usage: pptx-tool [--json] [--quiet] [--overwrite] COMMAND ...

Node PPTX backend for q-tool-pptx. Slide numbers are 1-based.

Commands:
  doctor                              report engine, dependency, and native-tool readiness
  inspect INPUT                       slide count, size, per-slide first text, notes, media
  extract-text INPUT --output FILE [--slides SPEC] [--with-notes]
  extract-notes INPUT --output FILE [--slides SPEC]
  extract-media INPUT --output-dir DIR
  check INPUT                         structural package validation
  render INPUT --output-dir DIR [--dpi N] [--format png|jpeg] [--slides SPEC]
  select | replace-text | contact-sheet   Python-only; routed there by the dispatcher

Deck creation is Python-only in this version; see references/python.md.
Outputs refuse existing targets without --overwrite.`;

function parseArgv(argv) {
  const options = { json: false, quiet: false, overwrite: false, flags: {}, positional: [] };
  let command = null;
  let index = 0;
  while (index < argv.length) {
    const token = argv[index];
    if (token === "--json") options.json = true;
    else if (token === "--quiet") options.quiet = true;
    else if (token === "--overwrite") options.overwrite = true;
    else if (token === "--help" || token === "-h") options.help = true;
    else if (token.startsWith("--")) {
      const equals = token.indexOf("=");
      if (equals !== -1) {
        options.flags[token.slice(2, equals)] = token.slice(equals + 1);
      } else {
        const name = token.slice(2);
        const next = argv[index + 1];
        if (["with-notes", "include-notes"].includes(name) || next === undefined || next.startsWith("--")) {
          options.flags[name] = true;
        } else {
          options.flags[name] = next;
          index += 1;
        }
      }
    } else if (!command) command = token;
    else options.positional.push(token);
    index += 1;
  }
  options.command = command;
  return options;
}

async function main() {
  const options = parseArgv(process.argv.slice(2));
  if (!options.command || options.help) {
    process.stdout.write(`${HELP}\n`);
    return EXIT_OK;
  }
  const handler = handlers[options.command];
  if (!handler) {
    process.stderr.write(`Error: unknown command '${options.command}'\n`);
    return EXIT_ARGS;
  }
  try {
    const result = await handler(options);
    if (result === null) return process.exitCode ?? EXIT_OUTPUT;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (!options.quiet) {
      for (const warning of result.warnings) process.stderr.write(`warning: ${warning}\n`);
      for (const output of result.outputs) process.stdout.write(`${output}\n`);
    }
    return EXIT_OK;
  } catch (error) {
    const code = error instanceof ToolError ? error.code : EXIT_OUTPUT;
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, command: options.command, runtime: RUNTIME, error: String(error.message ?? error) })}\n`,
      );
    }
    process.stderr.write(`Error: ${error.message ?? error}\n`);
    return code;
  }
}

process.exitCode = await main();
