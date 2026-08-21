#!/usr/bin/env node
import {existsSync, lstatSync, mkdtempSync, renameSync, rmSync, writeFileSync} from "node:fs";
import {basename, dirname, join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {sha256File} from "./lib/hash.mjs";
import {requireInside, samePath} from "./lib/path-policy.mjs";
import {renderDeck} from "./lib/render.mjs";
import {probeCapabilities} from "./lib/runtime.mjs";
import {validateDeck} from "./lib/validate.mjs";

const HELP = `q-tool-marp local runtime

Usage:
  node runtime/marp.mjs capabilities [--json]
  node runtime/marp.mjs validate <deck.md> --theme <theme.css> --input-root <dir> [--asset-root <dir>] [--raw-html disabled|safe] [--json]
  node runtime/marp.mjs render <deck.md> --format html|pdf|pptx|png-title|png-set --output <path> --theme <theme.css> --input-root <dir> --output-root <dir> [--asset-root <dir>] [--overwrite --approval-ref <id>] [--sidecar <path>] [--json]

The runtime is offline, uses the pinned local Marp CLI with --no-config-file,
and never installs dependencies or enables server, watch, preview, plugins,
custom engines, or experimental editable PPTX.
`;

function parse(argv) {
  const positional = [];
  const options = {};
  const repeatable = new Set(["input-root", "output-root", "asset-root"]);
  const boolean = new Set(["json", "overwrite"]);
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const key = item.slice(2);
    if (boolean.has(key)) {
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`--${key} requires a value`);
    index += 1;
    if (repeatable.has(key)) (options[key] ||= []).push(value);
    else options[key] = value;
  }
  return {positional, options};
}

function emit(value, json = false) {
  process.stdout.write(json ? `${JSON.stringify(value, null, 2)}\n` : `${value}\n`);
}

function requireOption(options, key) {
  if (!options[key]) throw new Error(`--${key} is required`);
  return options[key];
}

export function prepareSidecar(sidecar, outputRoots, overwrite, approvalRef, protectedPaths = []) {
  if (!approvalRef) throw new Error("persistent sidecar requires --approval-ref");
  if (existsSync(resolve(sidecar)) && lstatSync(resolve(sidecar)).isSymbolicLink()) {
    throw new Error("sidecar path must not be a symbolic link");
  }
  const target = requireInside(sidecar, outputRoots, {target: true, label: "sidecar"});
  if (!existsSync(dirname(target))) throw new Error("sidecar parent directory must already exist");
  if (existsSync(target) && !overwrite) throw new Error("existing sidecar requires --overwrite");
  if (existsSync(target) && !lstatSync(target).isFile()) throw new Error("sidecar path must be a regular file");
  if (protectedPaths.some((path) => samePath(path, target))) throw new Error("sidecar must be distinct from source, theme, assets, and render outputs");
  return target;
}

export function writeSidecar(result, target) {
  const stage = mkdtempSync(join(dirname(target), ".q-tool-marp-sidecar-"));
  const temporary = join(stage, basename(target));
  const backup = join(stage, ".previous");
  let movedPrevious = false;
  try {
    writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`);
    if (existsSync(target)) {
      renameSync(target, backup);
      movedPrevious = true;
    }
    renameSync(temporary, target);
    return resolve(target);
  } catch (error) {
    if (movedPrevious && !existsSync(target) && existsSync(backup)) renameSync(backup, target);
    throw error;
  } finally {
    rmSync(stage, {recursive: true, force: true});
  }
}

export function buildResult(sourcePath, themePath, operation, requestId, ownerSkill, execution) {
  const capabilities = execution.capabilities || probeCapabilities();
  const validation = execution.validation || {};
  const blocked = execution.outcome === "blocked";
  const inputs = [];
  if (sourcePath && existsSync(sourcePath)) inputs.push({ref: "marp-source", path: resolve(sourcePath), sha256: sha256File(sourcePath)});
  if (themePath && existsSync(themePath)) inputs.push({ref: "marp-theme", path: resolve(themePath), sha256: sha256File(themePath)});
  return {
    schema_version: "1.0",
    request_id: requestId,
    outcome: execution.outcome,
    owner_skill: ownerSkill,
    generator_skill: "q-tool-marp",
    operation,
    runtime: {
      node: capabilities.node || process.version,
      marp_cli: capabilities.marp_cli ?? null,
      browser: capabilities.browser || null
    },
    inputs,
    outputs: execution.outputs || [],
    validation: {
      structural: validation.validation?.structural || (blocked ? "failed" : "passed"),
      assets: validation.validation?.assets || (blocked ? "failed" : "passed"),
      network: validation.validation?.network || (blocked ? "failed" : "passed"),
      html: validation.validation?.html || (blocked ? "failed" : "passed"),
      notes: validation.validation?.notes || "not-required",
      rendered: operation === "render" ? (blocked ? "unavailable" : "passed") : "not-required",
      visual: "not-required",
      release_readiness: "not-assessed"
    },
    speaker_notes: execution.speaker_notes || {
      source_count: validation.note_count || 0,
      html: "not-requested",
      pdf: "not-requested",
      pptx: "not-requested",
      images: "not-requested"
    },
    persistent_writes: (execution.outputs || []).map((output) => output.path),
    capability_gaps: blocked ? (execution.blockers || []).filter((item) => /capability|runtime|browser/.test(item)) : [],
    warnings: execution.warnings || [],
    blockers: execution.blockers || [],
    reconciliation_required: true,
    provenance: {
      source_refs: ["marp-source"],
      theme: themePath && existsSync(themePath) ? {path: resolve(themePath), sha256: sha256File(themePath)} : {path: "unavailable", sha256: "0".repeat(64)},
      assets: (validation.assets || []).map(({path, sha256}) => ({path, sha256})),
      command: execution.command || "capability-probe-or-validation"
    }
  };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }
  const command = argv[0];
  const {positional, options} = parse(argv.slice(1));
  if (command === "capabilities") {
    emit(probeCapabilities(), Boolean(options.json));
    return 0;
  }
  if (!new Set(["validate", "render"]).has(command)) throw new Error(`unknown command: ${command}`);
  const source = positional[0];
  if (!source) throw new Error(`${command} requires a deck path`);
  const theme = requireOption(options, "theme");
  const inputRoots = options["input-root"] || [];
  const outputRoots = options["output-root"] || [];
  const assetRoots = options["asset-root"] || [];
  const rawHtml = options["raw-html"] || "disabled";

  if (command === "validate") {
    const validation = validateDeck(source, {themePath: theme, inputRoots, assetRoots, rawHtml});
    emit(validation, Boolean(options.json));
    return validation.valid ? 0 : 1;
  }

  let sidecarTarget = null;
  if (options.sidecar) {
    const protectedPaths = [
      requireInside(source, inputRoots, {label: "source"}),
      requireInside(theme, [...inputRoots, ...assetRoots], {label: "theme"}),
      requireInside(requireOption(options, "output"), outputRoots, {target: true, label: "output"})
    ];
    sidecarTarget = prepareSidecar(
      options.sidecar,
      outputRoots,
      Boolean(options.overwrite),
      options["approval-ref"] || null,
      protectedPaths
    );
  }

  const execution = renderDeck(source, {
    format: requireOption(options, "format"),
    outputPath: requireOption(options, "output"),
    themePath: theme,
    inputRoots,
    outputRoots,
    assetRoots,
    rawHtml,
    overwrite: Boolean(options.overwrite),
    approvalRef: options["approval-ref"] || null,
    reservedPaths: sidecarTarget ? [sidecarTarget] : []
  });
  const result = buildResult(source, theme, "render", options["request-id"] || "standalone-marp-request", options["owner-skill"] || "q-tool-marp", execution);
  if (sidecarTarget && execution.outcome !== "blocked") {
    result.persistent_writes.push(sidecarTarget);
    try {
      writeSidecar(result, sidecarTarget);
    } catch (error) {
      result.persistent_writes = result.persistent_writes.filter((path) => !samePath(path, sidecarTarget));
      result.outcome = "blocked";
      result.blockers.push(`provenance sidecar write failed: ${error.message}`);
      result.validation.release_readiness = "blocked";
    }
  }
  emit(result, Boolean(options.json));
  return result.outcome === "blocked" ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    const json = process.argv.includes("--json");
    if (json) process.stdout.write(`${JSON.stringify({outcome: "blocked", errors: [error.message]}, null, 2)}\n`);
    else process.stderr.write(`q-tool-marp: ${error.message}\n`);
    process.exitCode = 1;
  });
}
