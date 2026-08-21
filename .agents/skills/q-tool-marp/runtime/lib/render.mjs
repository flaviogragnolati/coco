import {existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync} from "node:fs";
import {basename, dirname, extname, join, parse, resolve} from "node:path";
import {sha256File} from "./hash.mjs";
import {requireInside, samePath} from "./path-policy.mjs";
import {probeCapabilities, runMarp} from "./runtime.mjs";
import {validateDeck} from "./validate.mjs";

const FORMAT = {
  html: {extension: ".html", media: "text/html", args: []},
  pdf: {extension: ".pdf", media: "application/pdf", args: ["--pdf"]},
  pptx: {extension: ".pptx", media: "application/vnd.openxmlformats-officedocument.presentationml.presentation", args: ["--pptx"]},
  "png-title": {extension: ".png", media: "image/png", args: ["--image", "png"]},
  "png-set": {extension: ".png", media: "image/png", args: ["--images", "png"]}
};

function nonempty(path) {
  return existsSync(path) && statSync(path).isFile() && statSync(path).size > 0;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pngSetFiles(directory, stem) {
  const pattern = new RegExp(`^${escapeRegex(stem)}(?:\\.\\d+)?\\.png$`);
  return readdirSync(directory)
    .filter((name) => pattern.test(name))
    .sort()
    .map((name) => join(directory, name));
}

function expectedStageFiles(stage, outputName, format) {
  if (format !== "png-set") return [join(stage, outputName)];
  return pngSetFiles(stage, parse(outputName).name);
}

function transactionalCommit(stage, stagedPaths, destinations, previousPaths) {
  const backup = join(stage, ".previous");
  mkdirSync(backup);
  const movedPrevious = [];
  const movedNew = [];
  try {
    for (const previous of previousPaths) {
      const saved = join(backup, basename(previous));
      renameSync(previous, saved);
      movedPrevious.push({previous, saved});
    }
    for (let index = 0; index < stagedPaths.length; index += 1) {
      renameSync(stagedPaths[index], destinations[index]);
      movedNew.push(destinations[index]);
    }
  } catch (error) {
    for (const destination of movedNew.reverse()) rmSync(destination, {force: true});
    for (const {previous, saved} of movedPrevious.reverse()) {
      if (existsSync(saved)) renameSync(saved, previous);
    }
    throw error;
  }
}

export function outputForFormat(outputPath, format) {
  const spec = FORMAT[format];
  if (!spec) throw new Error(`unsupported format: ${format}`);
  if (extname(outputPath).toLowerCase() !== spec.extension) throw new Error(`${format} output must use ${spec.extension}`);
  return spec;
}

export function renderDeck(sourcePath, {
  format,
  outputPath,
  themePath,
  inputRoots,
  outputRoots,
  assetRoots = [],
  rawHtml = "disabled",
  overwrite = false,
  approvalRef = null,
  reservedPaths = [],
  capabilities = null,
  runner = runMarp
} = {}) {
  const spec = outputForFormat(outputPath, format);
  const validation = validateDeck(sourcePath, {themePath, inputRoots, assetRoots, rawHtml});
  if (!validation.valid) return {outcome: "blocked", validation, outputs: [], blockers: validation.errors, warnings: validation.warnings};

  let target;
  try {
    if (existsSync(resolve(outputPath)) && lstatSync(resolve(outputPath)).isSymbolicLink()) {
      throw new Error("output path must not be a symbolic link");
    }
    target = requireInside(outputPath, outputRoots, {target: true, label: "output"});
  } catch (error) {
    return {outcome: "blocked", validation, outputs: [], blockers: [error.message], warnings: validation.warnings};
  }
  const inputPaths = [validation.source, validation.theme, ...validation.assets.map((asset) => asset.path)];
  const canonicalReserved = reservedPaths.map((path) => resolve(path));
  if (canonicalReserved.some((reserved) => inputPaths.some((path) => samePath(path, reserved)))) {
    return {outcome: "blocked", validation, outputs: [], blockers: ["reserved path collides with a source, theme, or asset"], warnings: validation.warnings};
  }
  const protectedPaths = [...inputPaths, ...canonicalReserved];
  if (protectedPaths.some((path) => samePath(path, target))) {
    return {outcome: "blocked", validation, outputs: [], blockers: ["source, theme, assets, reserved paths, and output paths must be distinct"], warnings: validation.warnings};
  }
  if (existsSync(target) && (!overwrite || !approvalRef)) return {outcome: "blocked", validation, outputs: [], blockers: ["existing output requires --overwrite and --approval-ref"], warnings: validation.warnings};
  if (existsSync(target) && !lstatSync(target).isFile()) {
    return {outcome: "blocked", validation, outputs: [], blockers: ["output path must be a regular file"], warnings: validation.warnings};
  }
  if (format === "png-set") {
    const existing = pngSetFiles(dirname(target), parse(target).name);
    if (existing.some((path) => lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile())) {
      return {outcome: "blocked", validation, outputs: [], blockers: ["existing PNG set members must be regular files, not links or directories"], warnings: validation.warnings};
    }
    if (existing.length && (!overwrite || !approvalRef)) {
      return {outcome: "blocked", validation, outputs: [], blockers: ["existing PNG set requires approved overwrite"], warnings: validation.warnings};
    }
  }

  const current = capabilities || probeCapabilities();
  if (current.formats?.[format] !== "available") {
    return {outcome: "blocked", validation, capabilities: current, outputs: [], blockers: [`${format} capability is ${current.formats?.[format] || "unavailable"}`], warnings: validation.warnings};
  }

  mkdirSync(dirname(target), {recursive: true});
  try {
    target = requireInside(target, outputRoots, {target: true, label: "output after directory creation"});
  } catch (error) {
    return {outcome: "blocked", validation, capabilities: current, outputs: [], blockers: [error.message], warnings: validation.warnings};
  }
  const stage = mkdtempSync(join(dirname(target), ".q-tool-marp-"));
  const stagedOutput = join(stage, basename(target));
  const args = ["--no-config-file", "--no-parallel", ...spec.args];
  args.push(rawHtml === "safe" ? "--html" : "--html=false");
  args.push("--theme", validation.theme, "--allow-local-files");
  if (current.browser) args.push("--browser", current.browser.kind, "--browser-path", current.browser.path);
  args.push("--output", stagedOutput, validation.source);

  try {
    const run = runner(args, {timeout: 120000});
    if (!run?.ok) throw new Error(run?.stderr?.trim() || run?.stdout?.trim() || "Marp renderer failed");
    const staged = expectedStageFiles(stage, basename(target), format);
    if (staged.length === 0 || staged.some((path) => !nonempty(path))) throw new Error("renderer did not produce every expected non-empty output");

    const destinations = staged.map((stagedPath) => join(dirname(target), basename(stagedPath)));
    for (const destination of destinations) {
      const canonical = requireInside(destination, outputRoots, {target: true, label: "render output"});
      if (protectedPaths.some((path) => samePath(path, canonical))) throw new Error(`render output collides with an input or reserved path: ${canonical}`);
      if (existsSync(destination) && (lstatSync(destination).isSymbolicLink() || !lstatSync(destination).isFile())) {
        throw new Error(`render output must not replace a link or directory: ${destination}`);
      }
    }
    const previous = format === "png-set"
      ? pngSetFiles(dirname(target), parse(target).name)
      : destinations.filter((destination) => existsSync(destination));
    if (previous.length && (!overwrite || !approvalRef)) throw new Error("existing render output requires approved overwrite");
    transactionalCommit(stage, staged, destinations, previous);

    const outputs = [];
    for (const destination of destinations) {
      outputs.push({
        type: format === "png-set" ? "png" : format,
        path: resolve(destination),
        sha256: sha256File(destination),
        media_type: spec.media,
        creation_mode: "derived",
        semantic_authority: "none",
        authority_scope: "presentation"
      });
    }

    const noteStatus = {
      html: format === "html" ? (validation.note_count ? "unverified" : "omitted") : "not-requested",
      pdf: format === "pdf" ? "omitted" : "not-requested",
      pptx: format === "pptx" ? (validation.note_count ? "unverified" : "omitted") : "not-requested",
      images: format.startsWith("png") ? "omitted" : "not-requested"
    };
    return {
      outcome: validation.warnings.length ? "completed_with_warnings" : "completed",
      validation,
      capabilities: current,
      outputs,
      speaker_notes: {source_count: validation.note_count, ...noteStatus},
      command: [process.execPath, "marp.mjs", "render", validation.source, "--format", format].join(" "),
      blockers: [],
      warnings: validation.warnings
    };
  } catch (error) {
    return {outcome: "blocked", validation, capabilities: current, outputs: [], blockers: [error.message], warnings: validation.warnings};
  } finally {
    rmSync(stage, {recursive: true, force: true});
  }
}
