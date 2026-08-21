#!/usr/bin/env node
import {readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {doctorBrowser, BrowserCaptureError, capturePage} from "./lib/browser.mjs";
import {startEgressProxy} from "./lib/egress-proxy.mjs";
import {authorizeUrl, redactUrl, urlFingerprint} from "./lib/network-policy.mjs";
import {prepareOutput, sha256Text, writeAtomicUtf8} from "./lib/output.mjs";
import {buildRequest, validateResult} from "./lib/request.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HELP = `q-tool-web-markdown local runtime

Usage:
  scripts/web-markdown doctor [--json]
  scripts/web-markdown capture <public-url> [--output <new-path> --output-root <authorized-root>] [--timeout-ms <1000-60000>] [--overwrite --approval-ref <id>] [--request-id <id>] [--owner <skill-id>] [--json]

The fixed adapter captures one public HTTP(S) page through a sandboxed local
Chrome-family browser and a connection-pinning egress proxy. It never installs
software, invokes a global web2md or npx, accepts credentials/browser flags,
uses environment proxies, disables sandboxing, crawls, or writes debug HTML.
`;

function adapterIdentity() {
  const packageJson = JSON.parse(readFileSync(resolve(HERE, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(resolve(HERE, "package-lock.json"), "utf8"));
  const root = lock.packages?.[""] || {};
  const valid = packageJson.name === "@quasar/q-tool-web-markdown-runtime"
    && packageJson.version === "1.0.0"
    && root.name === packageJson.name
    && root.version === packageJson.version
    && !packageJson.dependencies
    && !packageJson.devDependencies;
  if (!valid) throw new Error("adapter package identity or lock metadata is inconsistent");
  return `${packageJson.name}@${packageJson.version}`;
}

function parse(argv) {
  const positional = [];
  const options = {};
  const boolean = new Set(["json", "overwrite"]);
  const valued = new Set(["output", "output-root", "timeout-ms", "approval-ref", "request-id", "owner"]);
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const key = item.slice(2);
    if (boolean.has(key)) {
      if (options[key]) throw new Error(`duplicate option --${key}`);
      options[key] = true;
      continue;
    }
    if (!valued.has(key)) throw new Error(`unsupported option --${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`--${key} requires a value`);
    if (options[key] !== undefined) throw new Error(`duplicate option --${key}`);
    options[key] = value;
    index += 1;
  }
  return {positional, options};
}

function emit(value, json) {
  if (json || typeof value !== "string") process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  else process.stdout.write(`${value}\n`);
}

function emptyCapture() {
  return {extraction: null, markdown: null, output_path: null, sha256: null, bytes: 0, characters: 0, metrics: {}};
}

function failureResult({request, category, message, adapter}) {
  const blockedCategories = new Set(["capability", "authorization", "network-policy", "filesystem"]);
  return {
    schema_version: "1.0",
    request_id: request?.request_id || "unresolved-request",
    owner: request?.owner || "q-tool-web-markdown",
    generator_skill: "q-tool-web-markdown",
    outcome: blockedCategories.has(category) ? "blocked" : "failed",
    category,
    source: {
      requested_url: request?.url ? redactUrl(request.url) : "[unresolved-url]",
      requested_url_sha256: request?.url ? urlFingerprint(request.url) : "0".repeat(64),
      final_url: null,
      final_url_sha256: null,
      accessed_at: new Date().toISOString()
    },
    runtime: {adapter, node: process.version, browser: null, sandbox: "unavailable"},
    policy: {network: "public-http-read-only", connection_pinning: "proxy-resolved-ip", direct_fallback: false},
    capture: emptyCapture(),
    validation: {status: "failed", checks: {}},
    warnings: [],
    blockers: [message],
    required_user_actions: category === "capability" ? ["Provide a supported local Chrome-family browser that starts with its sandbox enabled."] : [],
    next_recommended_action: category === "capability" ? "Resolve the reported local runtime gap, then rerun doctor." : "Review the reported blocker without expanding scope implicitly."
  };
}

function stageDelta(request, output) {
  return {
    stage_result: {
      skill_id: "q-tool-web-markdown",
      mode: "standalone",
      outcome: "completed",
      authored_outputs: [],
      derived_outputs: [{
        path: output.path,
        sha256: output.sha256,
        creation_mode: "derived",
        semantic_authority: "none",
        authority_scope: "browser-rendered-source-capture"
      }],
      updated_outputs: [],
      references_added: [{url: redactUrl(request.url), accessed_at: new Date().toISOString()}],
      traceability_delta: [],
      decisions_added_or_updated: [],
      risks_added_or_updated: [],
      stale_artifacts: [],
      blockers: [],
      warnings: [],
      required_user_actions: [],
      next_recommended_action: null
    },
    orchestration: {mode: "standalone", global_state_updated: false, reconciliation_required: true}
  };
}

async function runDoctor(options) {
  const adapter = adapterIdentity();
  let proxy;
  try {
    proxy = await startEgressProxy();
    const browser = await doctorBrowser({proxy});
    if (proxy.metrics.blocked.length) throw new BrowserCaptureError("network-policy", proxy.metrics.blocked[0]);
    return {
      schema_version: "1.0",
      outcome: "available",
      adapter,
      node: process.version,
      browser,
      sandbox: "verified",
      egress_guard: {proxy: "loopback-http", dns_at_proxy: true, connects_to_validated_ip: true, direct_fallback: false},
      blockers: [],
      next_recommended_action: "Run capture for one explicitly named public URL."
    };
  } catch (error) {
    return {
      schema_version: "1.0",
      outcome: "blocked",
      adapter,
      node: process.version,
      browser: null,
      sandbox: "unavailable",
      egress_guard: {proxy: "loopback-http", dns_at_proxy: true, connects_to_validated_ip: true, direct_fallback: false},
      blockers: [error.message],
      next_recommended_action: "Resolve the exact local capability gap; do not install or disable sandboxing during a capture."
    };
  } finally {
    if (proxy) await proxy.close();
  }
}

async function runCapture(rawUrl, options) {
  const adapter = adapterIdentity();
  const timeout = options["timeout-ms"] === undefined ? undefined : Number(options["timeout-ms"]);
  let request;
  try {
    if (options["timeout-ms"] !== undefined && !Number.isInteger(timeout)) throw new Error("--timeout-ms must be an integer");
    request = buildRequest(rawUrl, {
      output: options.output,
      output_root: options["output-root"],
      overwrite: options.overwrite,
      approval_ref: options["approval-ref"],
      request_id: options["request-id"],
      owner: options.owner,
      timeout_ms: timeout
    });
  } catch (error) {
    return failureResult({request: null, category: "authorization", message: error.message, adapter});
  }
  let target = null;
  let proxy;
  try {
    if (request.output.path) {
      try {
        target = prepareOutput(request.output.path, request.output.authorized_root, {
          overwrite: request.output.overwrite,
          approvalRef: request.output.approval_ref
        });
      } catch (error) {
        throw new BrowserCaptureError("filesystem", error.message);
      }
    }
    try {
      await authorizeUrl(request.url);
    } catch (error) {
      throw new BrowserCaptureError("network-policy", error.message);
    }
    try {
      proxy = await startEgressProxy({
        maxConnections: request.limits.max_requests,
        maxBytes: request.limits.max_bytes
      });
    } catch (error) {
      throw new BrowserCaptureError("capability", `egress proxy unavailable: ${error.message}`);
    }
    const captured = await capturePage(request.url, {proxy, limits: request.limits});
    if (proxy.metrics.blocked.length) throw new BrowserCaptureError("network-policy", proxy.metrics.blocked[0]);
    const markdown = captured.extracted.markdown;
    const output = {
      path: target,
      sha256: sha256Text(markdown),
      bytes: Buffer.byteLength(markdown, "utf8"),
      characters: markdown.length
    };
    const result = {
      schema_version: "1.0",
      request_id: request.request_id,
      owner: request.owner,
      generator_skill: "q-tool-web-markdown",
      outcome: "captured",
      category: "success",
      source: {
        requested_url: redactUrl(request.url),
        requested_url_sha256: urlFingerprint(request.url),
        final_url: redactUrl(captured.extracted.final_url),
        final_url_sha256: urlFingerprint(captured.extracted.final_url),
        accessed_at: new Date().toISOString()
      },
      runtime: {adapter, node: process.version, browser: captured.browser, sandbox: "verified"},
      policy: {
        network: "public-http-read-only",
        methods: ["GET", "HEAD"],
        connection_pinning: "proxy-resolved-ip",
        direct_fallback: false,
        environment_proxy: false,
        limits: request.limits
      },
      capture: {
        extraction: "dom-main-article-body-v1",
        markdown: target ? null : markdown,
        output_path: output.path,
        sha256: output.sha256,
        bytes: output.bytes,
        characters: output.characters,
        metrics: captured.metrics
      },
      validation: {status: "passed", checks: captured.quality.checks},
      warnings: captured.quality.warnings,
      blockers: [],
      required_user_actions: [],
      next_recommended_action: "Use the original URL and access time for citation or route interpretation to the owning evidence skill."
    };
    if (target) Object.assign(result, stageDelta(request, output));
    const checked = validateResult(result);
    if (!checked.valid) throw new BrowserCaptureError("internal", checked.errors.join("; "));
    if (target) {
      const written = writeAtomicUtf8(target, markdown);
      if (written.sha256 !== output.sha256 || written.bytes !== output.bytes) {
        throw new BrowserCaptureError("filesystem", "persisted output verification did not match the validated result");
      }
    }
    return result;
  } catch (error) {
    const category = error instanceof BrowserCaptureError ? error.category : target ? "filesystem" : "internal";
    return failureResult({request, category, message: error.message, adapter});
  } finally {
    if (proxy) await proxy.close();
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }
  try {
    const command = argv[0];
    const {positional, options} = parse(argv.slice(1));
    if (command === "doctor") {
      if (positional.length || Object.keys(options).some((key) => key !== "json")) throw new Error("doctor accepts only --json");
      const result = await runDoctor(options);
      emit(result, Boolean(options.json));
      return result.outcome === "available" ? 0 : 1;
    }
    if (command !== "capture") throw new Error(`unknown command: ${command}`);
    if (positional.length !== 1) throw new Error("capture requires exactly one public URL");
    const result = await runCapture(positional[0], options);
    emit(result, Boolean(options.json));
    return result.outcome === "captured" ? 0 : 1;
  } catch (error) {
    if (argv.includes("--json")) {
      let result = {outcome: "blocked", category: "authorization", blockers: [error.message]};
      if (argv[0] === "capture") {
        try {
          result = failureResult({request: null, category: "authorization", message: error.message, adapter: adapterIdentity()});
        } catch {}
      }
      emit(result, true);
    }
    else process.stderr.write(`q-tool-web-markdown: ${error.message}\n`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().then((code) => { process.exitCode = code; });
}
