import {randomUUID} from "node:crypto";
import {normalizePublicUrl} from "./network-policy.mjs";

export const DEFAULT_LIMITS = Object.freeze({
  timeout_ms: 30000,
  max_redirects: 5,
  max_requests: 80,
  max_bytes: 20 * 1024 * 1024,
  max_dom_bytes: 5 * 1024 * 1024,
  max_markdown_bytes: 2 * 1024 * 1024
});

export function validateRequest(request) {
  const errors = [];
  const keys = ["schema_version", "request_id", "owner", "operation", "url", "persistence", "output", "limits", "sensitivity"];
  if (!request || typeof request !== "object" || Array.isArray(request)) return {valid: false, errors: ["request must be an object"]};
  for (const key of keys) if (!(key in request)) errors.push(`missing request field ${key}`);
  if (request.schema_version !== "1.0") errors.push("schema_version must be 1.0");
  if (request.operation !== "capture") errors.push("operation must be capture");
  if (!request.request_id || !request.owner) errors.push("request_id and owner are required");
  try { normalizePublicUrl(request.url); } catch (error) { errors.push(error.message); }
  if (!new Set(["transient", "working"]).has(request.persistence)) errors.push("persistence must be transient or working");
  const output = request.output || {};
  if (output.overwrite && !output.approval_ref) errors.push("overwrite requires approval_ref");
  if ((output.path && !output.authorized_root) || (!output.path && output.authorized_root)) errors.push("output path and authorized_root must be supplied together");
  if (request.persistence === "working" && !output.path) errors.push("working persistence requires an output path");
  if (request.persistence === "transient" && output.path) errors.push("transient persistence cannot name an output path");
  const limits = request.limits || {};
  const bounds = {
    timeout_ms: [1000, 60000], max_redirects: [0, 10], max_requests: [1, 200],
    max_bytes: [1024, 50 * 1024 * 1024], max_dom_bytes: [1024, 10 * 1024 * 1024],
    max_markdown_bytes: [256, 5 * 1024 * 1024]
  };
  for (const [key, [minimum, maximum]] of Object.entries(bounds)) {
    if (!Number.isInteger(limits[key]) || limits[key] < minimum || limits[key] > maximum) errors.push(`limit ${key} is outside its allowed range`);
  }
  if (!request.sensitivity || typeof request.sensitivity.contains_secret_query !== "boolean" || typeof request.sensitivity.contains_sensitive_content !== "boolean") {
    errors.push("sensitivity flags must be explicit booleans");
  }
  const extra = Object.keys(request).filter((key) => !keys.includes(key));
  if (extra.length) errors.push(`unknown request fields: ${extra.join(", ")}`);
  return {valid: errors.length === 0, errors};
}

export function buildRequest(url, options = {}) {
  const normalized = normalizePublicUrl(url);
  const timeout = options.timeout_ms ?? DEFAULT_LIMITS.timeout_ms;
  const request = {
    schema_version: "1.0",
    request_id: options.request_id || randomUUID(),
    owner: options.owner || "q-tool-web-markdown",
    operation: "capture",
    url: normalized.href,
    persistence: options.output ? "working" : "transient",
    output: {
      authorized_root: options.output_root || null,
      path: options.output || null,
      overwrite: Boolean(options.overwrite),
      approval_ref: options.approval_ref || null
    },
    limits: {...DEFAULT_LIMITS, timeout_ms: timeout},
    sensitivity: {
      contains_secret_query: Boolean(normalized.search),
      contains_sensitive_content: false
    }
  };
  const checked = validateRequest(request);
  if (!checked.valid) throw new Error(checked.errors.join("; "));
  return request;
}

export function validateResult(result) {
  const errors = [];
  if (!result || typeof result !== "object") return {valid: false, errors: ["result must be an object"]};
  if (result.schema_version !== "1.0" || result.generator_skill !== "q-tool-web-markdown") errors.push("result identity is invalid");
  if (!new Set(["captured", "blocked", "failed"]).has(result.outcome)) errors.push("result outcome is invalid");
  if (result.outcome === "captured" && result.blockers?.length) errors.push("captured result cannot contain blockers");
  if (result.outcome !== "captured" && !result.blockers?.length) errors.push("blocked or failed result requires a blocker");
  if (result.outcome === "captured" && (!result.capture?.sha256 || result.capture.bytes <= 0)) errors.push("captured result requires output hash and bytes");
  if (result.outcome === "captured" && result.capture?.extraction !== "dom-main-article-body-v1") errors.push("captured result requires the fixed extraction identity");
  if (result.capture?.output_path && result.capture?.markdown !== null) errors.push("persisted result must not duplicate Markdown inline");
  if (!result.capture?.output_path && result.outcome === "captured" && typeof result.capture?.markdown !== "string") errors.push("transient captured result requires inline Markdown");
  if (result.capture?.output_path && (!result.stage_result || result.orchestration?.global_state_updated !== false || result.orchestration?.reconciliation_required !== true)) {
    errors.push("persisted result requires a standalone reconciliation delta");
  }
  return {valid: errors.length === 0, errors};
}
