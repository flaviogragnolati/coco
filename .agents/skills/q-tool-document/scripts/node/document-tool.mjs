#!/usr/bin/env node
/** Local, dependency-free Node backend for q-tool-document. */

import { createHash } from "node:crypto";
import {
  accessSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const MAX_ENTRIES = 4096;
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024;

class DocumentError extends Error {}

function usage() {
  return `q-tool-document Node backend

Usage:
  document-tool.mjs doctor [--json]
  document-tool.mjs inspect INPUT [--json]
  document-tool.mjs extract-text INPUT [--track-changes accept|reject|all] [--output PATH] [--json]
  document-tool.mjs create OUTPUT (--text TEXT | --text-file PATH) [--template] [--overwrite] [--json]
  document-tool.mjs replace-text INPUT OUTPUT --old TEXT --new TEXT [--all] [--overwrite] [--json]
  document-tool.mjs comment INPUT OUTPUT --target TEXT --comment TEXT --author NAME [--date ISO-UTC] [--overwrite] [--json]
  document-tool.mjs redline INPUT OUTPUT --old TEXT --new TEXT --author NAME [--date ISO-UTC] [--overwrite] [--json]
  document-tool.mjs accept-changes INPUT OUTPUT [--overwrite] [--json]
  document-tool.mjs convert INPUT OUTPUT.docx [--overwrite] [--json]
  document-tool.mjs render INPUT --output-dir DIR [--dpi N] [--overwrite] [--json]
  document-tool.mjs check INPUT [--json]

The backend never installs dependencies or uses a remote converter. Existing
outputs require --overwrite after separate replacement approval.`;
}

function parseArgs(argv) {
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }
  const command = argv[0];
  const booleans = new Set(["json", "overwrite", "all", "template"]);
  const options = {};
  const positionals = [];
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [rawKey, inline] = token.slice(2).split("=", 2);
    const key = rawKey.replaceAll("-", "_");
    if (booleans.has(rawKey)) {
      options[key] = true;
      continue;
    }
    const value = inline ?? argv[index + 1];
    if (value === undefined || (inline === undefined && value.startsWith("--"))) {
      throw new DocumentError(`${token} requires a value`);
    }
    options[key] = value;
    if (inline === undefined) index += 1;
  }
  return { command, options, positionals, help: false };
}

function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: options.encoding ?? "utf8",
    env: options.env ?? process.env,
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
  });
  if (result.error && options.allowFailure) return result;
  if (result.error) throw new DocumentError(`${executable} failed: ${result.error.message}`);
  if (result.status !== 0 && !options.allowFailure) {
    const diagnostic = String(result.stderr || result.stdout || result.status).trim();
    throw new DocumentError(`${executable} failed: ${diagnostic}`);
  }
  return result;
}

function which(name) {
  if (name.includes(path.sep)) {
    try {
      accessSync(name, fsConstants.X_OK);
      return name;
    } catch {
      return null;
    }
  }
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
    : [""];
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue;
    for (const extension of extensions) {
      const candidate = path.join(directory, process.platform === "win32" ? name + extension : name);
      try {
        accessSync(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        // Continue through PATH candidates.
      }
    }
  }
  return null;
}

function version(executable) {
  if (!executable) return "unavailable";
  const result = run(executable, ["--version"], { allowFailure: true, timeout: 10_000 });
  if (result.status !== 0) return "unavailable";
  return String(result.stdout || result.stderr).split(/\r?\n/)[0].trim();
}

function digest(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function emit(value, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  } else if (typeof value === "string") {
    process.stdout.write(value);
  } else {
    for (const [key, item] of Object.entries(value)) {
      process.stdout.write(`${key}: ${typeof item === "object" ? JSON.stringify(item) : item}\n`);
    }
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeXml(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function utcDate(value) {
  if (!value) return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || !/(Z|[+-]\d\d:\d\d)$/.test(value)) {
    throw new DocumentError("--date must be an ISO-8601 timestamp with timezone");
  }
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function ensureOutput(source, output, overwrite) {
  const resolved = path.resolve(output);
  if (source && path.resolve(source) === resolved) {
    throw new DocumentError("input and output paths must be distinct");
  }
  if (existsSync(resolved) && !overwrite) {
    throw new DocumentError("output already exists; pass --overwrite only after replacement approval");
  }
  mkdirSync(path.dirname(resolved), { recursive: true });
}

function safeMember(name) {
  const normalized = name.replaceAll("\\", "/");
  return Boolean(normalized)
    && !normalized.startsWith("/")
    && !/^[A-Za-z]:/.test(normalized)
    && !normalized.split("/").includes("..");
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function findEocd(buffer) {
  const lower = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= lower; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new DocumentError("input is not a readable Open XML ZIP package");
}

function parseZip(file) {
  if (![".docx", ".dotx"].includes(path.extname(file).toLowerCase())) {
    throw new DocumentError("package operations support only .docx and .dotx inputs");
  }
  if (!existsSync(file) || !statSync(file).isFile()) throw new DocumentError(`input document does not exist: ${file}`);
  const buffer = readFileSync(file);
  const eocd = findEocd(buffer);
  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || count === 0xffff) throw new DocumentError("multi-disk and ZIP64 packages are outside this backend's boundary");
  if (count > MAX_ENTRIES) throw new DocumentError("package contains too many ZIP members");
  const parts = new Map();
  let total = 0;
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new DocumentError("invalid ZIP central directory");
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const expectedCrc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const expandedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!safeMember(name)) throw new DocumentError(`unsafe ZIP member path: ${name}`);
    if (flags & 0x1) throw new DocumentError(`encrypted ZIP member is unsupported: ${name}`);
    if (expandedSize === 0xffffffff || compressedSize === 0xffffffff) throw new DocumentError("ZIP64 members are outside this backend's boundary");
    if (name.endsWith("/")) continue;
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new DocumentError(`invalid local ZIP header: ${name}`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let expanded;
    if (method === 0) expanded = Buffer.from(compressed);
    else if (method === 8) expanded = inflateRawSync(compressed);
    else throw new DocumentError(`unsupported ZIP compression method ${method} in ${name}`);
    if (expanded.length !== expandedSize || crc32(expanded) !== expectedCrc) throw new DocumentError(`ZIP integrity check failed at member: ${name}`);
    total += expanded.length;
    if (total > MAX_EXPANDED_BYTES) throw new DocumentError("expanded package exceeds the 256 MiB safety limit");
    if (compressedSize && expandedSize / compressedSize > 250) throw new DocumentError(`suspicious compression ratio in ZIP member: ${name}`);
    if (parts.has(name)) throw new DocumentError(`duplicate ZIP member is not supported: ${name}`);
    parts.set(name, expanded);
  }
  const entries = [...parts.keys()];
  for (const required of ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]) {
    if (!entries.includes(required)) throw new DocumentError(`missing required Open XML part: ${required}`);
  }
  if (entries.some((entry) => entry.toLowerCase().endsWith("vbaproject.bin"))) {
    throw new DocumentError("macro-bearing packages are outside this version's compatibility boundary");
  }
  return parts;
}

function readPart(file, member) {
  const value = parseZip(file).get(member);
  if (!value) throw new DocumentError(`missing Open XML part: ${member}`);
  return value.toString("utf8");
}

function listPackage(file) {
  return [...parseZip(file).keys()];
}

function writeZip(parts, output) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const names = [...parts.keys()].sort((a, b) => (a === "[Content_Types].xml" ? -1 : b === "[Content_Types].xml" ? 1 : a.localeCompare(b)));
  for (const name of names) {
    const raw = Buffer.from(parts.get(name));
    const compressed = deflateRawSync(raw, { level: 6 });
    const nameBuffer = Buffer.from(name, "utf8");
    const checksum = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    const localRecord = Buffer.concat([local, nameBuffer, compressed]);
    locals.push(localRecord);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(0o100600 * 65_536, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBuffer]));
    offset += localRecord.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(parts.size, 8);
  eocd.writeUInt16LE(parts.size, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  writeFileSync(output, Buffer.concat([...locals, centralDirectory, eocd]));
}

function walk(root) {
  const files = [];
  let total = 0;
  function visit(current) {
    for (const name of readdirSync(current)) {
      const item = path.join(current, name);
      const info = lstatSync(item);
      if (info.isSymbolicLink()) throw new DocumentError(`symlink extracted from package: ${path.relative(root, item)}`);
      if (info.isDirectory()) visit(item);
      else {
        total += info.size;
        if (total > MAX_EXPANDED_BYTES) throw new DocumentError("expanded package exceeds the 256 MiB safety limit");
        files.push(item);
      }
    }
  }
  visit(root);
  return files;
}

function withExtracted(file, callback) {
  const parts = parseZip(file);
  const workspace = mkdtempSync(path.join(tmpdir(), "q-tool-document-node-"));
  try {
    for (const [name, value] of parts) {
      const target = path.join(workspace, ...name.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, value);
    }
    walk(workspace);
    return callback(workspace);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function packDirectory(directory, source, output, overwrite) {
  ensureOutput(source, output, overwrite);
  const temporary = path.join(path.dirname(path.resolve(output)), `.${path.basename(output)}.${process.pid}.${Date.now()}.tmp`);
  try {
    const parts = new Map();
    for (const file of walk(directory)) {
      const name = path.relative(directory, file).split(path.sep).join("/");
      parts.set(name, readFileSync(file));
    }
    writeZip(parts, temporary);
    renameSync(temporary, output);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function attrs(raw) {
  const values = {};
  for (const match of raw.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(["'])(.*?)\2/g)) {
    values[match[1]] = decodeXml(match[3]);
  }
  return values;
}

function relationshipBase(member) {
  if (member === "_rels/.rels") return "";
  const marker = "/_rels/";
  if (!member.includes(marker) || !member.endsWith(".rels")) return "";
  const [prefix, leaf] = member.split(marker);
  return path.posix.dirname(path.posix.join(prefix, leaf.slice(0, -5)));
}

function relationshipReport(file, entries) {
  const external = [];
  const errors = [];
  const entrySet = new Set(entries);
  for (const member of entries.filter((entry) => entry.endsWith(".rels"))) {
    const xml = readPart(file, member);
    for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
      const values = attrs(match[1]);
      const target = values.Target ?? "";
      if (values.TargetMode === "External" || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) {
        external.push(target);
        continue;
      }
      const clean = target.split(/[?#]/, 1)[0];
      const resolved = path.posix.normalize(path.posix.join(relationshipBase(member), clean).replace(/^\/+/, ""));
      if (!safeMember(resolved) || !entrySet.has(resolved)) errors.push(`missing or unsafe relationship target ${resolved} from ${member}`);
    }
  }
  return { external, errors };
}

function xmlCoverage(file, entries) {
  const xmllint = which("xmllint");
  if (!xmllint) return { state: "unavailable", checked: 0, errors: [] };
  const errors = [];
  let checked = 0;
  for (const member of entries.filter((entry) => entry.endsWith(".xml") || entry.endsWith(".rels"))) {
    const xml = readPart(file, member);
    const result = run(xmllint, ["--noout", "-"], { input: xml, allowFailure: true });
    checked += 1;
    if (result.status !== 0) errors.push(`${member}: ${String(result.stderr || result.stdout).trim()}`);
  }
  return { state: errors.length ? "failed" : "passed", checked, errors };
}

function packageCheck(file) {
  const entries = listPackage(file);
  const relationships = relationshipReport(file, entries);
  const xml = xmlCoverage(file, entries);
  const document = readPart(file, "word/document.xml");
  const tracked = (document.match(/<w:(?:ins|del|moveFrom|moveTo)\b/g) || []).length;
  let comments = 0;
  if (entries.includes("word/comments.xml")) comments = (readPart(file, "word/comments.xml").match(/<w:comment\b/g) || []).length;
  return {
    status: relationships.errors.length || xml.state === "failed" ? "failed" : "passed",
    path: file,
    sha256: digest(file),
    format: path.extname(file).slice(1).toLowerCase(),
    parts: entries.filter((entry) => !entry.endsWith("/")).length,
    xml_parts_checked: xml.checked,
    xml_well_formedness: xml.state,
    xml_errors: xml.errors,
    tracked_change_elements: tracked,
    comments,
    external_relationships: relationships.external,
    relationship_errors: relationships.errors,
    full_xsd_validation: "unavailable",
  };
}

function revisionView(xml, mode) {
  let value = xml;
  if (mode === "accept") {
    value = value.replace(/<w:(?:del|moveFrom)\b[^>]*>[\s\S]*?<\/w:(?:del|moveFrom)>/g, "");
    value = value.replace(/<w:(?:ins|moveTo)\b[^>]*>([\s\S]*?)<\/w:(?:ins|moveTo)>/g, "$1");
  } else if (mode === "reject") {
    value = value.replace(/<w:(?:ins|moveTo)\b[^>]*>[\s\S]*?<\/w:(?:ins|moveTo)>/g, "");
    value = value.replace(/<w:(?:del|moveFrom)\b[^>]*>([\s\S]*?)<\/w:(?:del|moveFrom)>/g, "$1");
  }
  return value;
}

function extractTextXml(xml, mode) {
  const selected = revisionView(xml, mode);
  const lines = [];
  for (const paragraph of selected.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)) {
    let value = paragraph[1]
      .replace(/<w:tab\b[^>]*\/?\s*>/g, "\t")
      .replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/g, "\n");
    const text = [];
    for (const match of value.matchAll(/<w:(?:t|delText|instrText)\b[^>]*>([\s\S]*?)<\/w:(?:t|delText|instrText)>/g)) {
      text.push(decodeXml(match[1].replace(/<[^>]+>/g, "")));
    }
    const line = text.join("");
    if (line) lines.push(line);
  }
  return lines.join("\n") + (lines.length ? "\n" : "");
}

function extractPackageText(file, mode) {
  const entries = listPackage(file);
  const selected = ["word/document.xml", ...entries.filter((entry) => /^word\/(?:header|footer)\d+\.xml$/.test(entry))];
  for (const optional of ["word/footnotes.xml", "word/endnotes.xml"]) if (entries.includes(optional)) selected.push(optional);
  const blocks = [];
  for (const member of selected) {
    const text = extractTextXml(readPart(file, member), mode).trimEnd();
    if (text) blocks.push(member === "word/document.xml" ? text : `[${member}]\n${text}`);
  }
  return blocks.join("\n\n") + (blocks.length ? "\n" : "");
}

function paragraphXml(text) {
  const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : "";
  return `<w:p><w:r><w:t${space}>${escapeXml(text)}</w:t></w:r></w:p>`;
}

function createDocument(output, text, template, overwrite) {
  const workspace = mkdtempSync(path.join(tmpdir(), "q-tool-document-create-"));
  try {
    for (const directory of ["_rels", "word/_rels", "docProps"]) mkdirSync(path.join(workspace, directory), { recursive: true });
    const mainType = template
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
    const created = utcDate();
    const paragraphs = text.split(/\r?\n/).map(paragraphXml).join("") || paragraphXml("");
    const files = {
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${CT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${mainType}"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
      "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`,
      "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`,
      "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Quasar q-tool-document</dc:creator><cp:lastModifiedBy>Quasar q-tool-document</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified></cp:coreProperties>`,
      "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Quasar q-tool-document</Application></Properties>`,
    };
    for (const [name, value] of Object.entries(files)) writeFileSync(path.join(workspace, name), value, "utf8");
    packDirectory(workspace, null, output, overwrite);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function editDocumentXml(workspace, editor) {
  const documentPath = path.join(workspace, "word", "document.xml");
  const xml = readFileSync(documentPath, "utf8");
  const updated = editor(xml);
  writeFileSync(documentPath, updated, "utf8");
}

function textNodeRegex() {
  return /<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g;
}

function replaceTextXml(xml, oldText, newText, replaceAll) {
  if (!oldText) throw new DocumentError("--old must not be empty");
  let occurrences = 0;
  for (const match of xml.matchAll(textNodeRegex())) occurrences += decodeXml(match[2]).split(oldText).length - 1;
  if (!occurrences) throw new DocumentError("target text was not found inside one Open XML text node");
  if (occurrences !== 1 && !replaceAll) throw new DocumentError(`target is ambiguous (${occurrences} occurrences); narrow it or pass --all explicitly`);
  let remaining = replaceAll ? occurrences : 1;
  return {
    xml: xml.replace(textNodeRegex(), (whole, attributes, raw) => {
      if (!remaining) return whole;
      const decoded = decodeXml(raw);
      const count = decoded.split(oldText).length - 1;
      if (!count) return whole;
      const changed = replaceAll ? decoded.split(oldText).join(newText) : decoded.replace(oldText, newText);
      remaining -= replaceAll ? count : 1;
      return `<w:t${attributes}>${escapeXml(changed)}</w:t>`;
    }),
    count: replaceAll ? occurrences : 1,
  };
}

function exactRun(xml, target) {
  if (!target) throw new DocumentError("target text must not be empty");
  const candidates = [];
  const regex = /<w:r\b[^>]*>[\s\S]*?<w:t\b[^>]*>([\s\S]*?)<\/w:t>[\s\S]*?<\/w:r>/g;
  for (const match of xml.matchAll(regex)) {
    if (decodeXml(match[1]) !== target) continue;
    const run = match[0];
    if ((run.match(/<w:t\b/g) || []).length !== 1 || /<w:(?:fldChar|instrText|drawing|object|footnoteReference)\b/.test(run)) continue;
    const paragraphStart = xml.lastIndexOf("<w:p", match.index);
    const paragraphEnd = xml.indexOf("</w:p>", match.index);
    if (paragraphStart < 0 || paragraphEnd < 0) continue;
    const context = xml.slice(paragraphStart, match.index);
    if (context.lastIndexOf("<w:hyperlink") > context.lastIndexOf("</w:hyperlink>")) continue;
    candidates.push({ index: match.index, run });
  }
  if (candidates.length !== 1) throw new DocumentError(`target must be the complete text of exactly one direct paragraph run; found ${candidates.length}`);
  return candidates[0];
}

function ensureCommentsParts(workspace, commentId, body, author, date) {
  const word = path.join(workspace, "word");
  const commentsPath = path.join(word, "comments.xml");
  const commentXml = `<w:comment w:id="${commentId}" w:author="${escapeXml(author)}" w:date="${escapeXml(date)}"><w:p><w:r><w:t>${escapeXml(body)}</w:t></w:r></w:p></w:comment>`;
  if (existsSync(commentsPath)) {
    const current = readFileSync(commentsPath, "utf8");
    if (!current.includes("</w:comments>")) throw new DocumentError("existing comments.xml has an unsupported structure");
    writeFileSync(commentsPath, current.replace("</w:comments>", `${commentXml}</w:comments>`), "utf8");
  } else {
    writeFileSync(commentsPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W_NS}">${commentXml}</w:comments>`, "utf8");
  }

  const relsPath = path.join(word, "_rels", "document.xml.rels");
  mkdirSync(path.dirname(relsPath), { recursive: true });
  let rels = existsSync(relsPath)
    ? readFileSync(relsPath, "utf8")
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"></Relationships>`;
  if (!rels.includes("relationships/comments")) {
    const ids = [...rels.matchAll(/Id=["']rId(\d+)["']/g)].map((match) => Number.parseInt(match[1], 10));
    const id = Math.max(-1, ...ids) + 1;
    rels = rels.replace("</Relationships>", `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>`);
    writeFileSync(relsPath, rels, "utf8");
  }

  const typesPath = path.join(workspace, "[Content_Types].xml");
  let types = readFileSync(typesPath, "utf8");
  if (!types.includes('PartName="/word/comments.xml"')) {
    types = types.replace("</Types>", '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>');
    writeFileSync(typesPath, types, "utf8");
  }
}

function addCommentXml(workspace, target, body, author, date) {
  const commentsPath = path.join(workspace, "word", "comments.xml");
  const existing = existsSync(commentsPath) ? readFileSync(commentsPath, "utf8") : "";
  const ids = [...existing.matchAll(/w:id=["'](\d+)["']/g)].map((match) => Number.parseInt(match[1], 10));
  const commentId = Math.max(-1, ...ids) + 1;
  editDocumentXml(workspace, (xml) => {
    const match = exactRun(xml, target);
    const marker = `<w:commentRangeStart w:id="${commentId}"/>${match.run}<w:commentRangeEnd w:id="${commentId}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${commentId}"/></w:r>`;
    return `${xml.slice(0, match.index)}${marker}${xml.slice(match.index + match.run.length)}`;
  });
  ensureCommentsParts(workspace, commentId, body, author, date);
  return commentId;
}

function addRedlineXml(xml, oldText, newText, author, date) {
  const match = exactRun(xml, oldText);
  const ids = [...xml.matchAll(/w:id=["'](\d+)["']/g)].map((item) => Number.parseInt(item[1], 10));
  const deletedId = Math.max(-1, ...ids) + 1;
  const deletedRun = match.run.replace(/<w:t\b([^>]*)>/, "<w:delText$1>").replace("</w:t>", "</w:delText>");
  const newRun = match.run.replace(/<w:t\b([^>]*)>[\s\S]*?<\/w:t>/, `<w:t$1>${escapeXml(newText)}</w:t>`);
  const deletion = `<w:del w:id="${deletedId}" w:author="${escapeXml(author)}" w:date="${escapeXml(date)}">${deletedRun}</w:del>`;
  const insertion = newText ? `<w:ins w:id="${deletedId + 1}" w:author="${escapeXml(author)}" w:date="${escapeXml(date)}">${newRun}</w:ins>` : "";
  return {
    xml: `${xml.slice(0, match.index)}${deletion}${insertion}${xml.slice(match.index + match.run.length)}`,
    deletedId,
    insertedId: newText ? deletedId + 1 : null,
  };
}

function acceptChangesXml(xml) {
  if (/<w:(?:moveFrom|moveTo|moveFromRangeStart|moveToRangeStart)\b/.test(xml)) {
    throw new DocumentError("move revisions require a specialist editor; no output was written");
  }
  if (/<w:pPr\b[\s\S]*?<w:del\b[\s\S]*?<\/w:pPr>/.test(xml)) {
    throw new DocumentError("deleted paragraph marks require a specialist editor; no output was written");
  }
  const before = xml;
  let value = xml.replace(/<w:del\b[^>]*>[\s\S]*?<\/w:del>/g, "");
  value = value.replace(/<w:ins\b[^>]*>([\s\S]*?)<\/w:ins>/g, "$1");
  value = value.replace(/<w:(?:rPrChange|pPrChange|tblPrChange|tblGridChange|trPrChange|tcPrChange|sectPrChange|numberingChange)\b[^>]*>[\s\S]*?<\/w:(?:rPrChange|pPrChange|tblPrChange|tblGridChange|trPrChange|tcPrChange|sectPrChange|numberingChange)>/g, "");
  return { xml: value, changed: before === value ? 0 : 1 };
}

function modifyPackage(input, output, overwrite, callback) {
  return withExtracted(input, (workspace) => {
    const detail = callback(workspace);
    packDirectory(workspace, input, output, overwrite);
    return detail;
  });
}

function sofficeConvert(input, output, target, overwrite) {
  const soffice = which("soffice") || which("libreoffice");
  if (!soffice) throw new DocumentError("LibreOffice is unavailable; conversion/rendering is blocked");
  ensureOutput(input, output, overwrite);
  const workspace = mkdtempSync(path.join(tmpdir(), "q-tool-document-soffice-"));
  try {
    const profile = path.join(workspace, "profile");
    const result = run(soffice, [
      "--headless",
      `-env:UserInstallation=file://${profile}`,
      "--convert-to",
      target,
      "--outdir",
      workspace,
      path.resolve(input),
    ]);
    const converted = path.join(workspace, `${path.parse(input).name}.${target}`);
    if (!existsSync(converted)) throw new DocumentError(`LibreOffice did not create the expected ${target}: ${String(result.stdout || result.stderr).trim()}`);
    const temporary = path.join(path.dirname(path.resolve(output)), `.${path.basename(output)}.${process.pid}.${Date.now()}.tmp`);
    cpSync(converted, temporary);
    renameSync(temporary, output);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function renderDocument(input, outputDir, dpi, overwrite) {
  if (existsSync(outputDir) && readdirSync(outputDir).length && !overwrite) {
    throw new DocumentError("validation directory is not empty; pass --overwrite only after replacement approval");
  }
  mkdirSync(outputDir, { recursive: true });
  const pdf = path.join(outputDir, `${path.parse(input).name}.pdf`);
  sofficeConvert(input, pdf, "pdf", true);
  const outputs = [pdf];
  const pdftoppm = which("pdftoppm");
  if (pdftoppm) {
    run(pdftoppm, ["-png", "-r", String(dpi), pdf, path.join(outputDir, "page")]);
    outputs.push(...readdirSync(outputDir).filter((name) => /^page-.*\.png$/.test(name)).sort().map((name) => path.join(outputDir, name)));
  }
  return outputs;
}

function requirePositionals(parsed, count, syntax) {
  if (parsed.positionals.length !== count) throw new DocumentError(`expected ${syntax}`);
}

function requireOption(options, name, allowEmpty = false) {
  if (options[name] === undefined || (!allowEmpty && options[name] === "")) throw new DocumentError(`--${name.replaceAll("_", "-")} is required`);
  return options[name];
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    const { command, options, positionals } = parsed;
    let result;
    if (command === "doctor") {
      result = {
        runtime: "node",
        node: process.versions.node,
        zip_package_engine: "built-in ZIP reader/writer",
        xmllint: version(which("xmllint")),
        soffice: version(which("soffice") || which("libreoffice")),
        pdftoppm: version(which("pdftoppm")),
        dependencies: "no npm packages required",
        network: "forbidden",
      };
    } else if (command === "inspect" || command === "check") {
      requirePositionals(parsed, 1, "INPUT");
      result = packageCheck(positionals[0]);
      if (command === "inspect") {
        const document = readPart(positionals[0], "word/document.xml");
        result.paragraphs = (document.match(/<w:p\b/g) || []).length;
        result.tables = (document.match(/<w:tbl\b/g) || []).length;
        result.accepted_text_characters = extractPackageText(positionals[0], "accept").length;
        const entries = listPackage(positionals[0]);
        result.signatures = entries.filter((entry) => entry.startsWith("_xmlsignatures/"));
        result.embedded_objects = entries.filter((entry) => entry.startsWith("word/embeddings/"));
      }
      if (result.status !== "passed") throw new DocumentError(`package check failed: ${[...result.relationship_errors, ...result.xml_errors].join("; ")}`);
    } else if (command === "extract-text") {
      requirePositionals(parsed, 1, "INPUT");
      const mode = options.track_changes ?? "accept";
      if (!["accept", "reject", "all"].includes(mode)) throw new DocumentError("--track-changes must be accept, reject, or all");
      const text = extractPackageText(positionals[0], mode);
      if (options.output) {
        ensureOutput(null, options.output, false);
        writeFileSync(options.output, text, "utf8");
        result = { status: "completed", output: options.output, sha256: digest(options.output), characters: text.length };
      } else if (options.json) {
        result = { status: "completed", text, characters: text.length, track_changes: mode };
      } else {
        result = text;
      }
    } else if (command === "create") {
      requirePositionals(parsed, 1, "OUTPUT");
      if ((options.text === undefined) === (options.text_file === undefined)) throw new DocumentError("provide exactly one of --text or --text-file");
      const text = options.text ?? readFileSync(options.text_file, "utf8");
      const template = Boolean(options.template) || path.extname(positionals[0]).toLowerCase() === ".dotx";
      const expected = template ? ".dotx" : ".docx";
      if (path.extname(positionals[0]).toLowerCase() !== expected) throw new DocumentError(`output extension must be ${expected}`);
      createDocument(positionals[0], text, template, Boolean(options.overwrite));
      result = { status: "completed", output: positionals[0], sha256: digest(positionals[0]), format: expected.slice(1) };
    } else if (["replace-text", "comment", "redline", "accept-changes"].includes(command)) {
      requirePositionals(parsed, 2, "INPUT OUTPUT");
      const [input, output] = positionals;
      let detail;
      if (command === "replace-text") {
        const oldText = requireOption(options, "old");
        const newText = requireOption(options, "new", true);
        detail = modifyPackage(input, output, Boolean(options.overwrite), (workspace) => {
          let replacements = 0;
          editDocumentXml(workspace, (xml) => {
            const changed = replaceTextXml(xml, oldText, newText, Boolean(options.all));
            replacements = changed.count;
            return changed.xml;
          });
          return { replacements };
        });
      } else if (command === "comment") {
        const target = requireOption(options, "target");
        const body = requireOption(options, "comment");
        const author = requireOption(options, "author");
        detail = modifyPackage(input, output, Boolean(options.overwrite), (workspace) => ({
          comment_id: addCommentXml(workspace, target, body, author, utcDate(options.date)),
        }));
      } else if (command === "redline") {
        const oldText = requireOption(options, "old");
        const newText = requireOption(options, "new", true);
        const author = requireOption(options, "author");
        detail = modifyPackage(input, output, Boolean(options.overwrite), (workspace) => {
          let ids;
          editDocumentXml(workspace, (xml) => {
            const changed = addRedlineXml(xml, oldText, newText, author, utcDate(options.date));
            ids = { deleted_revision_id: changed.deletedId, inserted_revision_id: changed.insertedId };
            return changed.xml;
          });
          return ids;
        });
      } else {
        detail = modifyPackage(input, output, Boolean(options.overwrite), (workspace) => {
          let changed = 0;
          for (const file of walk(path.join(workspace, "word"))) {
            const relative = path.relative(workspace, file).replaceAll(path.sep, "/");
            if (!/^word\/(?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(relative)) continue;
            const accepted = acceptChangesXml(readFileSync(file, "utf8"));
            changed += accepted.changed;
            writeFileSync(file, accepted.xml, "utf8");
          }
          if (!changed) throw new DocumentError("no supported tracked changes were found");
          return { accepted_revision_parts: changed };
        });
      }
      const checked = packageCheck(output);
      result = { status: "completed", output, sha256: digest(output), ...detail, check: checked.status };
    } else if (command === "convert") {
      requirePositionals(parsed, 2, "INPUT OUTPUT.docx");
      if (![".doc", ".odt", ".rtf", ".docx", ".dotx"].includes(path.extname(positionals[0]).toLowerCase())) throw new DocumentError("convert supports DOC, ODT, RTF, DOCX, and DOTX inputs");
      if (path.extname(positionals[1]).toLowerCase() !== ".docx") throw new DocumentError("convert output must use the .docx extension");
      sofficeConvert(positionals[0], positionals[1], "docx", Boolean(options.overwrite));
      result = { status: "completed", output: positionals[1], sha256: digest(positionals[1]), tool: "LibreOffice" };
    } else if (command === "render") {
      requirePositionals(parsed, 1, "INPUT --output-dir DIR");
      const outputDir = requireOption(options, "output_dir");
      const dpi = Number.parseInt(options.dpi ?? "144", 10);
      if (!Number.isInteger(dpi) || dpi < 72 || dpi > 600) throw new DocumentError("--dpi must be between 72 and 600");
      const outputs = renderDocument(positionals[0], outputDir, dpi, Boolean(options.overwrite));
      result = {
        status: outputs.length > 1 ? "completed" : "completed_with_warnings",
        outputs: outputs.map((file) => ({ path: file, sha256: digest(file) })),
        page_rasterization: outputs.length > 1 ? "completed" : "unavailable",
      };
    } else {
      throw new DocumentError(`unknown command: ${command}`);
    }
    emit(result, Boolean(options.json));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (parsed?.options?.json) emit({ status: "blocked", error: message }, true);
    else process.stderr.write(`Error: ${message}\n`);
    return 4;
  }
}

process.exitCode = main();
