#!/usr/bin/env node
import {existsSync, readFileSync, rmSync, statSync} from "node:fs";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {basename, dirname, extname, join, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {capabilities} from "./lib/capabilities.mjs";
import {blockName, extractMermaidBlocks, replaceMermaidBlocks} from "./lib/markdown.mjs";
import {normalizeSource} from "./lib/normalize.mjs";
import {atomicWrite, authorizedPath, sha256} from "./lib/provenance.mjs";
import {renderSource} from "./lib/render.mjs";
import {loadRequest, validateRequest} from "./lib/request.mjs";
import {canonicalValidate} from "./lib/validate.mjs";

const HELP = `q-tool-mermaid local runtime

Usage:
  node runtime/mermaid.mjs doctor [--json]
  node runtime/mermaid.mjs capabilities [--json]
  node runtime/mermaid.mjs validate <diagram.mmd> [--profile portable] [--repair] [--write-repairs --overwrite] [--json]
  node runtime/mermaid.mjs render <diagram.mmd> --format svg --output diagram.svg [--backend mmdc|pretty] [--profile portable] [--overwrite] [--json]
  node runtime/mermaid.mjs compile <document.md> --output <derived.md> --assets-dir <dir> [--format svg] [--backend mmdc|pretty] [--profile portable] [--overwrite] [--json]
  node runtime/mermaid.mjs execute <diagram-request.yaml> [--root <authorized-root>] [--json]

The runtime is offline, refuses overwrite by default, and never installs dependencies.`;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else flags[key] = true;
  }
  return {positional, flags};
}

function output(value, json) {
  if (json) process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  else if (typeof value === "string") process.stdout.write(value + (value.endsWith("\n") ? "" : "\n"));
  else process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

function fail(error, json) {
  const message = error instanceof Error ? error.message : String(error);
  output({status: "failed", error: message}, json);
  process.exitCode = 1;
}

function safeRead(path, root) {
  return readFileSync(authorizedPath(path, root), "utf8");
}

function extensionPath(sourcePath, format) {
  const base = sourcePath.slice(0, sourcePath.length - extname(sourcePath).length);
  return format === "ascii" || format === "unicode" ? `${base}.${format}.txt` : `${base}.${format}`;
}

function markdownAlt(source, fallback) {
  const description = source.match(/^\s*accDescr\s*:\s*(.+)$/im)?.[1];
  const title = source.match(/^\s*accTitle\s*:\s*(.+)$/im)?.[1];
  return String(description || title || fallback).replace(/[\[\]]/g, "");
}

async function validateCommand(input, flags) {
  if (!input) throw new Error("validate requires a .mmd input path");
  const root = resolve(flags.root || process.cwd());
  const original = safeRead(input, root);
  const normalized = normalizeSource(original, {repair: Boolean(flags.repair)});
  if (flags["write-repairs"]) {
    if (!flags.repair || !flags.overwrite) throw new Error("--write-repairs requires --repair and explicit --overwrite approval");
    atomicWrite(input, normalized.source, {overwrite: true, root});
  }
  const validation = canonicalValidate(normalized.source, {profile: flags.profile || "portable"});
  const result = {
    status: validation.status,
    operation: "validate",
    source: resolve(input),
    type: validation.lint.type,
    repairs: normalized.repairs,
    lint: validation.lint,
    syntax: validation.status,
    renderer: validation.renderer,
    diagnostic: validation.diagnostic
  };
  output(result, flags.json);
  if (validation.status === "failed") process.exitCode = 1;
  else if (validation.status === "unavailable") process.exitCode = 2;
}

async function renderCommand(input, flags) {
  if (!input) throw new Error("render requires a .mmd input path");
  const root = resolve(flags.root || process.cwd());
  const original = safeRead(input, root);
  const normalized = normalizeSource(original, {repair: Boolean(flags.repair)});
  const format = flags.format || "svg";
  const backend = flags.backend || (format === "ascii" || format === "unicode" ? "pretty" : "mmdc");
  const target = flags.output || ((format === "ascii" || format === "unicode") ? null : extensionPath(resolve(input), format));
  const result = await renderSource(normalized.source, {
    backend,
    format,
    profile: flags.profile || "portable",
    output: target,
    overwrite: Boolean(flags.overwrite),
    root
  });
  const response = {
    status: "passed",
    operation: "render",
    source: resolve(input),
    source_sha256: sha256(Buffer.from(normalized.source)),
    output: result.output,
    output_sha256: result.output ? sha256(readFileSync(result.output)) : sha256(Buffer.from(result.content)),
    format,
    renderer: result.renderer,
    renderer_version: result.rendererVersion,
    repairs: normalized.repairs,
    content: target ? undefined : result.content
  };
  output(response, flags.json);
}

export async function compileDocument(input, flags) {
  if (!input) throw new Error("compile requires a Markdown input path");
  if (!flags.output || !flags["assets-dir"]) throw new Error("compile requires --output and --assets-dir");
  const root = resolve(flags.root || process.cwd());
  const markdown = safeRead(input, root);
  const blocks = extractMermaidBlocks(markdown);
  if (!blocks.length) throw new Error("No Mermaid blocks were found");
  const format = flags.format || "svg";
  if (!["svg", "png", "pdf"].includes(format)) throw new Error("Markdown compilation supports svg, png, or pdf assets");
  const backend = flags.backend || "mmdc";
  const outputPath = authorizedPath(flags.output, root);
  const assetsDir = authorizedPath(flags["assets-dir"], root);
  const targets = blocks.map((block) => join(assetsDir, `${blockName(block)}.${format}`));

  for (const target of [outputPath, ...targets]) {
    authorizedPath(target, root);
    if (existsSync(target) && !flags.overwrite) throw new Error(`Output exists; pass --overwrite after approval: ${target}`);
  }

  const staging = mkdtempSync(join(tmpdir(), "q-tool-mermaid-compile-"));
  const staged = [];
  try {
    for (const block of blocks) {
      const normalized = normalizeSource(block.source, {repair: Boolean(flags.repair)});
      const stagedPath = join(staging, `${blockName(block)}.${format}`);
      const rendered = await renderSource(normalized.source, {
        backend,
        format,
        profile: flags.profile || "portable",
        output: stagedPath,
        overwrite: true,
        root: staging
      });
      if (!existsSync(stagedPath) || statSync(stagedPath).size === 0) throw new Error(`Render ${block.index} did not produce a non-empty asset`);
      staged.push({block, normalized, stagedPath, rendered});
    }

    const replacements = staged.map(({block}, index) => {
      const path = relative(dirname(outputPath), targets[index]).split(sep).join("/");
      const href = path.startsWith(".") ? path : `./${path}`;
      return `![${markdownAlt(block.source, `Diagram ${block.index}`)}](${href})`;
    });
    const derived = replaceMermaidBlocks(markdown, blocks, replacements);

    for (let index = 0; index < staged.length; index += 1) {
      atomicWrite(targets[index], readFileSync(staged[index].stagedPath), {overwrite: Boolean(flags.overwrite), root});
    }
    atomicWrite(outputPath, derived, {overwrite: Boolean(flags.overwrite), root});

    return {
      status: "passed",
      operation: "compile",
      input: resolve(input),
      output: outputPath,
      diagrams: staged.map(({block, normalized, rendered}, index) => ({
        index: block.index,
        type: rendered.validation.lint.type,
        asset: targets[index],
        asset_sha256: sha256(readFileSync(targets[index])),
        source_sha256: sha256(Buffer.from(normalized.source)),
        renderer: rendered.renderer,
        renderer_version: rendered.rendererVersion,
        repairs: normalized.repairs
      }))
    };
  } finally {
    rmSync(staging, {recursive: true, force: true});
  }
}

async function executeCommand(requestPath, flags) {
  if (!requestPath) throw new Error("execute requires a diagram-request YAML or JSON path");
  const root = resolve(flags.root || process.cwd());
  const requestData = loadRequest(authorizedPath(requestPath, root));
  const contract = validateRequest(requestData);
  if (!contract.valid) throw new Error(`Invalid diagram request: ${contract.errors.join("; ")}`);
  const request = requestData.diagram_request;

  const repairs = [];
  const warnings = [];
  const blockers = [];
  const renders = [];
  const sourcePath = request.source?.path || request.output.source_path;
  let source;
  if (request.source?.code) {
    const normalized = normalizeSource(request.source.code, {repair: request.policy.max_repair_attempts > 0});
    source = normalized.source;
    repairs.push(...normalized.repairs);
    if (["create", "revise"].includes(request.operation)) {
      atomicWrite(request.output.source_path, source, {overwrite: request.output.overwrite, root});
    }
  } else source = safeRead(sourcePath, root);

  const validation = canonicalValidate(source, {profile: request.output.profile});
  if (request.diagram.type !== "auto" && validation.lint.type !== request.diagram.type) {
    warnings.push(`Requested type ${request.diagram.type} resolved as ${validation.lint.type}; caller review is required.`);
  }
  warnings.push(...validation.lint.warnings.map((item) => item.message));
  if (validation.status === "failed") blockers.push(validation.diagnostic || "Canonical validation failed");
  if (validation.status === "unavailable") warnings.push("Local Mermaid runtime is not installed; syntax and requested renders are unavailable.");

  if (validation.status === "passed") {
    for (const format of request.output.formats) {
      const backend = format === "ascii" || format === "unicode" ? "pretty" : "mmdc";
      const target = extensionPath(request.output.source_path, format);
      try {
        const rendered = await renderSource(source, {
          backend,
          format,
          profile: request.output.profile,
          output: target,
          overwrite: request.output.overwrite,
          root
        });
        renders.push({
          path: rendered.output,
          format,
          creation_mode: "derived",
          semantic_authority: "none",
          renderer: rendered.renderer,
          renderer_version: rendered.rendererVersion,
          sha256: sha256(readFileSync(rendered.output))
        });
      } catch (error) {
        blockers.push(`${format} render failed: ${error.message}`);
      }
    }
  }

  const sourceResultPath = sourcePath || "<inline>";
  const result = {
    schema_version: "1.0",
    diagram_result: {
      request_id: request.request_id,
      outcome: blockers.length ? "blocked" : warnings.length ? "completed_with_warnings" : "completed",
      owner_skill: request.ownership.owner_skill,
      generator_skill: "q-tool-mermaid",
      selected_type: validation.lint.type,
      source: {
        path: sourceResultPath,
        sha256: sha256(Buffer.from(source)),
        creation_mode: "authored",
        semantic_authority: "supporting"
      },
      renders,
      validation: {
        request_contract: "passed",
        syntax: validation.status,
        accessibility: validation.lint.accessibility,
        security: validation.lint.security,
        visual_render: request.output.formats.length === 0 ? "not-requested" : validation.status === "unavailable" ? "unavailable" : blockers.length ? "failed" : "passed",
        semantic_alignment: "caller-review-required"
      },
      repairs,
      warnings,
      blockers,
      provenance: {
        generator_skill: "q-tool-mermaid",
        source_refs: request.sources.map((item) => `${item.artifact_id}@${item.version}`)
      }
    }
  };
  output(result, flags.json);
  if (blockers.length) process.exitCode = 1;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const {positional, flags} = parseArgs(rest);
  if (!command || command === "help" || flags.help || command === "--help" || command === "-h") {
    output(HELP, false);
    return;
  }
  if (command === "doctor") {
    const current = capabilities();
    output({status: current.canonical.available ? "passed" : "degraded", ...current}, flags.json);
    if (!current.canonical.available) process.exitCode = 2;
    return;
  }
  if (command === "capabilities") {
    output(capabilities(), flags.json);
    return;
  }
  if (command === "validate") return validateCommand(positional[0], flags);
  if (command === "render") return renderCommand(positional[0], flags);
  if (command === "compile") {
    const result = await compileDocument(positional[0], flags);
    output(result, flags.json);
    return;
  }
  if (command === "execute") return executeCommand(positional[0], flags);
  throw new Error(`Unknown command: ${command}`);
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => fail(error, process.argv.includes("--json")));
}
