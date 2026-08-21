#!/usr/bin/env node
/** Capability-checked Node backend for q-tool-spreadsheet. */

import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {tmpdir} from "node:os";
import {basename, dirname, extname, join, resolve} from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {inflateRawSync} from "node:zlib";

const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 200;
const MAX_CELL_RECORDS = 1_000_000;
const MAX_MERGED_RANGES = 10_000;
const FORMULA_ERRORS = new Set(["#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A"]);
const READ_ONLY_SUFFIXES = new Set([".xlsm", ".xltm", ".xltx"]);
const WORKBOOK_SUFFIXES = new Set([".xlsx", ...READ_ONLY_SUFFIXES]);
const TABULAR_SUFFIXES = new Set([".csv", ".tsv"]);
const EXTERNAL_FORMULA = /(?:\b(?:WEBSERVICE|RTD|STOCKHISTORY|IMAGE)\s*\(|\[[^\]]+\][^!]*!|^\s*=?\s*[A-Z0-9_.-]+\|[^!]+!)/i;

class ToolError extends Error {}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function findExecutable(names) {
  const separator = process.platform === "win32" ? ";" : ":";
  const extensions = process.platform === "win32" ? [".exe", ".com", ".bat", ""] : [""];
  for (const directory of (process.env.PATH || "").split(separator)) {
    for (const name of names) {
      for (const extension of extensions) {
        const candidate = join(directory, name + extension);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

function loadExcelJS() {
  const roots = [];
  if (process.env.SPREADSHEET_SKILL_NODE_ROOT) roots.push(resolve(process.env.SPREADSHEET_SKILL_NODE_ROOT));
  roots.push(dirname(fileURLToPath(import.meta.url)));
  const failures = [];
  for (const root of roots) {
    try {
      const require = createRequire(join(root, "package.json"));
      const library = require("exceljs");
      const excelPackagePath = require.resolve("exceljs/package.json");
      const packageInfo = require(excelPackagePath);
      if (packageInfo.version !== "4.4.0") {
        throw new ToolError(`unsupported exceljs version ${packageInfo.version}; require exactly 4.4.0`);
      }
      const excelRequire = createRequire(excelPackagePath);
      const uuidInfo = excelRequire("uuid/package.json");
      if (uuidInfo.version !== "11.1.1") {
        throw new ToolError(`unsupported uuid version ${uuidInfo.version}; require exactly 11.1.1`);
      }
      return {library, version: packageInfo.version, uuidVersion: uuidInfo.version, root};
    } catch (error) {
      failures.push(error.code || error.message);
    }
  }
  throw new ToolError(
    `Node backend requires exceljs 4.4.0 from the skill runtime or SPREADSHEET_SKILL_NODE_ROOT; ` +
    `the skill never installs dependencies (${failures.join(", ")})`,
  );
}

function exceljsStatus() {
  try {
    const loaded = loadExcelJS();
    return {available: true, version: loaded.version, uuidVersion: loaded.uuidVersion, root: loaded.root};
  } catch {
    return {available: false, version: null, uuidVersion: null, root: null};
  }
}

function locateEocd(buffer) {
  const lower = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= lower; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new ToolError("invalid XLSX ZIP package: end record not found");
}

function safeEntryName(name) {
  const normalized = name.replaceAll("\\", "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) return false;
  return !normalized.split("/").includes("..");
}

function zipEntryData(buffer, entry, centralOffset) {
  const offset = entry.localOffset;
  if (offset + 30 > centralOffset || buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new ToolError(`invalid local ZIP entry for ${entry.name}`);
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressed;
  if (dataEnd > centralOffset) throw new ToolError(`invalid ZIP data bounds for ${entry.name}`);
  const localName = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8").replaceAll("\\", "/");
  if (localName !== entry.name) throw new ToolError(`mismatched local ZIP name for ${entry.name}`);
  const compressed = buffer.subarray(dataStart, dataEnd);
  let output;
  if (entry.method === 0) output = compressed;
  else if (entry.method === 8) {
    try {
      output = inflateRawSync(compressed, {maxOutputLength: MAX_EXPANDED_BYTES});
    } catch (error) {
      throw new ToolError(`could not safely inflate ${entry.name}: ${error.message}`);
    }
  } else throw new ToolError(`unsupported ZIP compression method in ${entry.name}`);
  if (output.length !== entry.uncompressed) throw new ToolError(`ZIP size mismatch in ${entry.name}`);
  return output;
}

function packageCheck(path) {
  if (!existsSync(path) || !statSync(path).isFile()) throw new ToolError(`input does not exist: ${path}`);
  const suffix = extname(path).toLowerCase();
  const fileSize = statSync(path).size;
  if (TABULAR_SUFFIXES.has(suffix)) {
    if (fileSize > MAX_ARCHIVE_BYTES) throw new ToolError("tabular input exceeds the bounded inspection size");
    return {status: "passed", kind: suffix.slice(1), entries: 1, expanded_bytes: fileSize, flags: []};
  }
  if (!WORKBOOK_SUFFIXES.has(suffix)) throw new ToolError(`unsupported spreadsheet type: ${suffix}`);
  if (fileSize > MAX_ARCHIVE_BYTES) throw new ToolError("workbook exceeds the bounded compressed size");
  const buffer = readFileSync(path);
  const eocd = locateEocd(buffer);
  const entries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (entries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new ToolError("ZIP64 workbooks exceed this bounded checker");
  }
  if (centralOffset + centralSize > eocd) throw new ToolError("invalid central-directory bounds");
  let cursor = centralOffset;
  let expanded = 0;
  const names = new Set();
  const flags = new Set();
  const directoryEntries = [];
  for (let index = 0; index < entries; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new ToolError("invalid central-directory entry");
    }
    const generalFlags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const uncompressed = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > buffer.length) throw new ToolError("truncated central-directory entry");
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8").replaceAll("\\", "/");
    if (!safeEntryName(name)) throw new ToolError(`unsafe ZIP member path: ${name}`);
    if ((generalFlags & 0x1) !== 0) throw new ToolError("encrypted ZIP members are not supported");
    expanded += uncompressed;
    if (expanded > MAX_EXPANDED_BYTES) throw new ToolError("workbook exceeds the bounded expanded size");
    if (compressed > 0 && uncompressed / compressed > MAX_COMPRESSION_RATIO) {
      throw new ToolError(`suspicious compression ratio in ${name}`);
    }
    if (names.has(name)) throw new ToolError(`duplicate ZIP member name: ${name}`);
    names.add(name);
    directoryEntries.push({name, method, compressed, uncompressed, localOffset});
    const lower = name.toLowerCase();
    if (lower.endsWith("vbaproject.bin")) flags.add("macros");
    if (lower.startsWith("_xmlsignatures/")) flags.add("signatures");
    if (lower.startsWith("xl/externallinks/")) flags.add("external_links");
    if (lower.startsWith("xl/connections") || lower.startsWith("xl/querytables/")) flags.add("data_connections");
    if (lower.startsWith("xl/embeddings/") || lower.startsWith("xl/activex/")) flags.add("embedded_objects");
    cursor = end;
  }
  for (const required of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml"]) {
    if (!names.has(required)) throw new ToolError(`missing required XLSX part: ${required}`);
  }
  let cellRecords = 0;
  let mergedRanges = 0;
  let workbookProtected = false;
  const protectedWorksheetParts = [];
  for (const entry of directoryEntries) {
    const lower = entry.name.toLowerCase();
    if (lower !== "xl/workbook.xml" && !(lower.startsWith("xl/worksheets/") && lower.endsWith(".xml"))) continue;
    const xml = zipEntryData(buffer, entry, centralOffset).toString("utf8");
    if (lower === "xl/workbook.xml" && /<(?:[A-Za-z0-9_.-]+:)?workbookProtection\b/.test(xml)) {
      workbookProtected = true;
      flags.add("protection");
    }
    if (lower.startsWith("xl/worksheets/")) {
      cellRecords += (xml.match(/<(?:[A-Za-z0-9_.-]+:)?c(?:\s|>)/g) || []).length;
      mergedRanges += (xml.match(/<(?:[A-Za-z0-9_.-]+:)?mergeCell\b/g) || []).length;
      if (/<(?:[A-Za-z0-9_.-]+:)?sheetProtection\b/.test(xml)) {
        protectedWorksheetParts.push(entry.name);
        flags.add("protection");
      }
      if (cellRecords > MAX_CELL_RECORDS) throw new ToolError("workbook exceeds the one-million-cell inspection limit");
      if (mergedRanges > MAX_MERGED_RANGES) throw new ToolError("workbook exceeds the 10,000-merged-range inspection limit");
    }
  }
  return {
    status: "passed",
    kind: suffix.slice(1),
    entries: names.size,
    expanded_bytes: expanded,
    cell_records: cellRecords,
    merged_ranges: mergedRanges,
    workbook_protected: workbookProtected,
    protected_worksheet_parts: protectedWorksheetParts,
    flags: [...flags].sort(),
  };
}

function isFormula(cell) {
  const value = cell.value;
  return Boolean(value && typeof value === "object" && ("formula" in value || "sharedFormula" in value));
}

function formulaResult(cell) {
  const value = cell.value;
  if (!value || typeof value !== "object") return undefined;
  return value.result;
}

function errorToken(value) {
  if (value && typeof value === "object" && typeof value.error === "string") return value.error;
  return typeof value === "string" && FORMULA_ERRORS.has(value) ? value : null;
}

function jsonValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `<binary:${value.length}>`;
  if (value && typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) {
      return {formula: value.formula || value.sharedFormula, result: jsonValue(value.result)};
    }
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
    if ("error" in value) return value.error;
    if ("text" in value) return value.text;
  }
  return value ?? null;
}

async function workbookInspect(path, maxCells) {
  const {library: ExcelJS} = loadExcelJS();
  const packageInfo = packageCheck(path);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(path);
  } catch (error) {
    throw new ToolError(`ExcelJS could not inspect the workbook: ${error.message}`);
  }
  const sheets = [];
  const preview = [];
  const formulaErrors = [];
  const missingCached = [];
  const externalFormulas = [];
  const formulaRecords = [];
  const protectedSheets = [...packageInfo.protected_worksheet_parts];
  let formulaCount = 0;
  let populatedCells = 0;
  workbook.eachSheet((worksheet) => {
    let sheetFormulas = 0;
    worksheet.eachRow({includeEmpty: false}, (row) => {
      row.eachCell({includeEmpty: false}, (cell) => {
        populatedCells += 1;
        if (preview.length < maxCells) preview.push({sheet: worksheet.name, cell: cell.address, value: jsonValue(cell.value)});
        if (!isFormula(cell)) return;
        formulaCount += 1;
        sheetFormulas += 1;
        const formula = cell.formula || cell.value.sharedFormula || "";
        const result = formulaResult(cell);
        const location = `${worksheet.name}!${cell.address}`;
        formulaRecords.push(`${location}=${formula}`);
        if (EXTERNAL_FORMULA.test(formula)) externalFormulas.push(location);
        if (errorToken(result)) formulaErrors.push(location);
        else if (result === undefined || result === null) missingCached.push(location);
      });
    });
    sheets.push({
      name: worksheet.name,
      state: worksheet.state,
      max_row: worksheet.actualRowCount,
      max_column: worksheet.actualColumnCount,
      formulas: sheetFormulas,
    });
  });
  return {
    status: "passed",
    runtime: "node",
    file: path,
    sha256: hashFile(path),
    package: packageInfo,
    sheets,
    workbook_protected: packageInfo.workbook_protected,
    protected_sheet_count: protectedSheets.length,
    protected_sheets: protectedSheets,
    formula_count: formulaCount,
    formula_sha256: createHash("sha256").update(formulaRecords.join("\n")).digest("hex"),
    formula_error_count: formulaErrors.length,
    formula_error_cells: formulaErrors.slice(0, 100),
    missing_cached_values: missingCached.length,
    missing_cached_cells: missingCached.slice(0, 100),
    external_formula_count: externalFormulas.length,
    external_formula_cells: externalFormulas.slice(0, 100),
    preview,
    preview_truncated: populatedCells > preview.length,
  };
}

function requireDistinct(input, output, overwrite) {
  if (resolve(input) === resolve(output)) throw new ToolError("input and output must be distinct");
  if (existsSync(output) && !overwrite) throw new ToolError("output already exists; replacement requires approval and --overwrite");
  mkdirSync(dirname(resolve(output)), {recursive: true});
}

function commitFile(source, output) {
  const destination = resolve(output);
  if (!existsSync(destination)) {
    renameSync(source, destination);
    return;
  }
  const backup = `${destination}.q-spreadsheet-backup-${process.pid}-${Date.now()}`;
  renameSync(destination, backup);
  try {
    renameSync(source, destination);
    rmSync(backup, {force: true});
  } catch (error) {
    if (existsSync(destination)) rmSync(destination, {force: true});
    renameSync(backup, destination);
    throw error;
  }
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new ToolError("unterminated quoted field in delimited input");
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function encodeDelimited(rows, delimiter) {
  const quote = (raw) => {
    const value = raw === null || raw === undefined ? "" : String(raw);
    return /["\r\n,\t]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  };
  return rows.map((row) => row.map(quote).join(delimiter)).join("\n") + "\n";
}

async function convertTabular(input, output, sheetName, view, overwrite) {
  const {library: ExcelJS} = loadExcelJS();
  requireDistinct(input, output, overwrite);
  packageCheck(input);
  const sourceSuffix = extname(input).toLowerCase();
  const targetSuffix = extname(output).toLowerCase();
  const tempRoot = mkdtempSync(join(dirname(resolve(output)), ".q-spreadsheet-"));
  const tempOutput = join(tempRoot, `output${targetSuffix}`);
  try {
    if (TABULAR_SUFFIXES.has(sourceSuffix) && targetSuffix === ".xlsx") {
      const delimiter = sourceSuffix === ".tsv" ? "\t" : ",";
      const text = readFileSync(input, "utf8").replace(/^\uFEFF/, "");
      const workbook = new ExcelJS.Workbook();
      const title = (sheetName || basename(input, sourceSuffix) || "Sheet1").slice(0, 31);
      if (!title || /[\\/*?:\[\]]/.test(title)) throw new ToolError("worksheet name contains an invalid XLSX character");
      const worksheet = workbook.addWorksheet(title);
      for (const row of parseDelimited(text, delimiter)) worksheet.addRow(row);
      await workbook.xlsx.writeFile(tempOutput);
      packageCheck(tempOutput);
    } else if (WORKBOOK_SUFFIXES.has(sourceSuffix) && TABULAR_SUFFIXES.has(targetSuffix)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(input);
      const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
      if (!worksheet) throw new ToolError(`worksheet not found: ${sheetName || "first sheet"}`);
      const rows = [];
      for (let rowNumber = 1; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const values = [];
        for (let column = 1; column <= worksheet.actualColumnCount; column += 1) {
          const cell = row.getCell(column);
          if (view === "formulas" && isFormula(cell)) values.push(`=${cell.formula || cell.value.sharedFormula}`);
          else if (isFormula(cell)) values.push(jsonValue(formulaResult(cell)));
          else values.push(jsonValue(cell.value));
        }
        rows.push(values);
      }
      writeFileSync(tempOutput, encodeDelimited(rows, targetSuffix === ".tsv" ? "\t" : ","), "utf8");
    } else throw new ToolError("convert supports CSV/TSV to XLSX or XLSX-family input to CSV/TSV");
    commitFile(tempOutput, output);
    return {
      status: "completed",
      runtime: "node",
      operation: "convert",
      input,
      input_sha256: hashFile(input),
      output,
      output_sha256: hashFile(output),
    };
  } finally {
    rmSync(tempRoot, {recursive: true, force: true});
  }
}

function safeSofficeEnv(tempRoot) {
  const forwarded = [
    "PATH", "LANG", "LANGUAGE", "LC_ALL", "LC_CTYPE", "LC_NUMERIC", "LC_TIME",
    "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT", "SYSTEMDRIVE",
  ];
  const env = {};
  for (const name of forwarded) if (process.env[name] !== undefined) env[name] = process.env[name];
  Object.assign(env, {HOME: tempRoot, TMPDIR: tempRoot, TMP: tempRoot, TEMP: tempRoot, SAL_USE_VCLPLUGIN: "svp"});
  return env;
}

function sofficeConvert(input, output, formatName, timeout, overwrite) {
  requireDistinct(input, output, overwrite);
  if (!Number.isInteger(timeout) || timeout <= 0) throw new ToolError("timeout must be a positive integer");
  if (extname(input).toLowerCase() !== ".xlsx") throw new ToolError("recalculation and rendering accept .xlsx only in this version");
  const packageInfo = packageCheck(input);
  const forbidden = new Set(["macros", "external_links", "data_connections", "embedded_objects", "signatures", "protection"]);
  const active = packageInfo.flags.filter((flag) => forbidden.has(flag));
  if (active.length) throw new ToolError(`refusing local spreadsheet-engine execution for package flags: ${active.join(", ")}`);
  const executable = findExecutable(["soffice", "libreoffice"]);
  if (!executable) throw new ToolError("LibreOffice is required for this operation; the skill never installs it");
  const sourceHash = hashFile(input);
  const tempRoot = mkdtempSync(join(dirname(resolve(output)), ".q-spreadsheet-"));
  try {
    const sourceDir = join(tempRoot, "source");
    const convertedDir = join(tempRoot, "converted");
    const profileDir = join(tempRoot, "profile");
    mkdirSync(sourceDir);
    mkdirSync(convertedDir);
    mkdirSync(profileDir);
    const stagedInput = join(sourceDir, "workbook.xlsx");
    copyFileSync(input, stagedInput);
    const filterSpec = formatName === "xlsx" ? "xlsx:Calc MS Excel 2007 XML" : "pdf:calc_pdf_Export";
    const args = [
      "--headless", "--nologo", "--nodefault", "--norestore", "--nolockcheck",
      `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
      "--convert-to", filterSpec, "--outdir", convertedDir, stagedInput,
    ];
    const run = spawnSync(executable, args, {
      env: safeSofficeEnv(tempRoot),
      encoding: "utf8",
      timeout: timeout * 1000,
    });
    if (run.error) {
      if (run.error.code === "ETIMEDOUT") throw new ToolError("LibreOffice timed out; no output was committed");
      throw new ToolError(`LibreOffice conversion failed: ${run.error.message}`);
    }
    if (run.status !== 0) throw new ToolError(`LibreOffice conversion failed: ${(run.stderr || run.stdout || `exit ${run.status}`).trim()}`);
    const candidate = join(convertedDir, formatName === "xlsx" ? "workbook.xlsx" : "workbook.pdf");
    if (!existsSync(candidate) || statSync(candidate).size === 0) throw new ToolError("LibreOffice did not produce the expected non-empty output");
    if (hashFile(input) !== sourceHash) throw new ToolError("source hash changed during conversion");
    commitFile(candidate, output);
    return (run.stdout || "").trim();
  } finally {
    rmSync(tempRoot, {recursive: true, force: true});
  }
}

async function recalculate(input, output, timeout, overwrite) {
  requireDistinct(input, output, overwrite);
  if (extname(output).toLowerCase() !== ".xlsx") throw new ToolError("recalculation output must use the .xlsx extension");
  const before = await workbookInspect(input, 0);
  if (before.external_formula_count) throw new ToolError("refusing recalculation for formulas that may access external data");
  if (before.workbook_protected || before.protected_sheet_count) throw new ToolError("refusing recalculation for a protected workbook or worksheet");
  const validationRoot = mkdtempSync(join(dirname(resolve(output)), ".q-spreadsheet-validation-"));
  const candidate = join(validationRoot, "candidate.xlsx");
  try {
    const log = sofficeConvert(input, candidate, "xlsx", timeout, false);
    const after = await workbookInspect(candidate, 0);
    const blockers = [];
    const warnings = [];
    if (before.formula_count !== after.formula_count) blockers.push("formula count changed during recalculation");
    if (before.formula_sha256 !== after.formula_sha256) blockers.push("formula text changed during recalculation");
    if (after.formula_error_count) blockers.push("recalculated workbook contains formula errors");
    if (after.missing_cached_values) warnings.push("some formula cells have no cached value; blank-return formulas may be included");
    const committed = blockers.length === 0;
    if (committed) commitFile(candidate, output);
    return {
      status: blockers.length ? "blocked" : (warnings.length ? "completed_with_warnings" : "completed"),
      runtime: "node",
      operation: "recalculate",
      input,
      input_sha256: before.sha256,
      output: committed ? output : null,
      output_sha256: committed ? hashFile(output) : null,
      formula_count: after.formula_count,
      formula_sha256: after.formula_sha256,
      formula_error_count: after.formula_error_count,
      formula_error_cells: after.formula_error_cells,
      missing_cached_values: after.missing_cached_values,
      warnings,
      blockers,
      engine: "LibreOffice",
      engine_log: log,
    };
  } finally {
    rmSync(validationRoot, {recursive: true, force: true});
  }
}

async function render(input, outputDir, timeout, overwrite) {
  mkdirSync(outputDir, {recursive: true});
  const output = join(outputDir, `${basename(input, extname(input))}.pdf`);
  const inspection = await workbookInspect(input, 0);
  if (inspection.external_formula_count) throw new ToolError("refusing rendering for formulas that may access external data");
  if (inspection.workbook_protected || inspection.protected_sheet_count) throw new ToolError("refusing rendering for a protected workbook or worksheet");
  const log = sofficeConvert(input, output, "pdf", timeout, overwrite);
  return {
    status: "completed",
    runtime: "node",
    operation: "render",
    input,
    input_sha256: hashFile(input),
    output,
    output_sha256: hashFile(output),
    engine: "LibreOffice",
    engine_log: log,
  };
}

function help() {
  return `q-tool-spreadsheet Node backend

Usage:
  spreadsheet-tool.mjs doctor [--json]
  spreadsheet-tool.mjs check INPUT [--json]
  spreadsheet-tool.mjs inspect INPUT [--max-cells N] [--json]
  spreadsheet-tool.mjs convert INPUT OUTPUT [--sheet NAME] [--view values|formulas] [--overwrite] [--json]
  spreadsheet-tool.mjs recalculate INPUT OUTPUT.xlsx [--timeout N] [--overwrite] [--json]
  spreadsheet-tool.mjs render INPUT.xlsx --output-dir DIR [--timeout N] [--overwrite] [--json]

The backend never installs dependencies. Mutating commands require distinct outputs;
--overwrite is valid only after separate replacement approval.`;
}

function parse(argv) {
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) return {command: "help", options: {}, positional: []};
  const command = argv[0];
  const positional = [];
  const options = {json: false, overwrite: false, maxCells: 200, timeout: 60, view: "values"};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") options.json = true;
    else if (token === "--overwrite") options.overwrite = true;
    else if (["--max-cells", "--timeout", "--sheet", "--view", "--output-dir"].includes(token)) {
      if (index + 1 >= argv.length) throw new ToolError(`${token} requires a value`);
      const value = argv[++index];
      if (token === "--max-cells") options.maxCells = Number.parseInt(value, 10);
      else if (token === "--timeout") options.timeout = Number.parseInt(value, 10);
      else if (token === "--sheet") options.sheet = value;
      else if (token === "--view") options.view = value;
      else options.outputDir = value;
    } else if (token.startsWith("--")) throw new ToolError(`unknown option: ${token}`);
    else positional.push(token);
  }
  return {command, options, positional};
}

function emit(payload, asJson) {
  if (asJson) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else for (const [key, value] of Object.entries(payload)) process.stdout.write(`${key}: ${JSON.stringify(value)}\n`);
}

async function main() {
  let parsed;
  try {
    parsed = parse(process.argv.slice(2));
    if (parsed.command === "help") {
      process.stdout.write(`${help()}\n`);
      return 0;
    }
    const {command, options, positional} = parsed;
    let payload;
    if (command === "doctor") {
      const exceljs = exceljsStatus();
      const soffice = findExecutable(["soffice", "libreoffice"]);
      payload = {
        status: "passed",
        runtime: "node",
        node: process.versions.node,
        exceljs: exceljs.available,
        exceljs_version: exceljs.version,
        uuid_version: exceljs.uuidVersion,
        exceljs_root: exceljs.root,
        soffice: Boolean(soffice),
        soffice_path: soffice,
        healthy: exceljs.available,
        dependency_audit: "not-performed-by-runtime",
        safety_limits: {
          archive_bytes: MAX_ARCHIVE_BYTES,
          expanded_bytes: MAX_EXPANDED_BYTES,
          cell_records: MAX_CELL_RECORDS,
          merged_ranges: MAX_MERGED_RANGES,
        },
        installs_dependencies: false,
      };
    } else if (command === "check") {
      if (positional.length !== 1) throw new ToolError("check requires INPUT");
      payload = {...packageCheck(positional[0]), runtime: "node"};
    } else if (command === "inspect") {
      if (positional.length !== 1) throw new ToolError("inspect requires INPUT");
      payload = await workbookInspect(positional[0], Math.max(0, options.maxCells));
    } else if (command === "convert") {
      if (positional.length !== 2) throw new ToolError("convert requires INPUT OUTPUT");
      if (!new Set(["values", "formulas"]).has(options.view)) throw new ToolError("--view must be values or formulas");
      payload = await convertTabular(positional[0], positional[1], options.sheet, options.view, options.overwrite);
    } else if (command === "recalculate") {
      if (positional.length !== 2) throw new ToolError("recalculate requires INPUT OUTPUT.xlsx");
      payload = await recalculate(positional[0], positional[1], options.timeout, options.overwrite);
    } else if (command === "render") {
      if (positional.length !== 1 || !options.outputDir) throw new ToolError("render requires INPUT --output-dir DIR");
      payload = await render(positional[0], options.outputDir, options.timeout, options.overwrite);
    } else throw new ToolError(`unknown command: ${command}`);
    emit(payload, options.json);
    return payload.status === "blocked" ? 4 : 0;
  } catch (error) {
    const payload = {status: "blocked", runtime: "node", blockers: [error instanceof ToolError ? error.message : `unexpected error: ${error.message}`]};
    if (parsed?.options?.json) emit(payload, true);
    else process.stderr.write(`Error: ${payload.blockers[0]}\n`);
    return error instanceof ToolError ? 4 : 5;
  }
}

process.exitCode = await main();
