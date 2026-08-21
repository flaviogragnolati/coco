import {readFileSync} from "node:fs";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);

const OPERATIONS = new Set(["create", "revise", "validate", "render"]);
const FORMATS = new Set(["svg", "png", "pdf", "ascii", "unicode"]);
const PROFILES = new Set(["portable", "github", "static-light", "static-dark", "presentation"]);
const MODES = new Set(["orchestrated", "standalone"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function objectShape(value, label, required, optional, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (value[key] === undefined || value[key] === null) errors.push(`${label}.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label}.${key} is not allowed`);
  }
  return true;
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} must be a non-empty string`);
}

function stringArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  value.forEach((item, index) => requireString(item, `${label}[${index}]`, errors));
}

export function loadRequest(path) {
  const {parse} = require("yaml");
  return parse(readFileSync(path, "utf8"));
}

export function validateRequest(data) {
  const errors = [];
  if (!objectShape(data, "request", ["schema_version", "diagram_request"], [], errors)) return {valid: false, errors};
  if (data?.schema_version !== "1.0") errors.push("schema_version must be 1.0");
  const request = data?.diagram_request;
  if (!objectShape(
    request,
    "diagram_request",
    ["request_id", "operation", "caller", "ownership", "sources", "diagram", "output", "policy"],
    ["source"],
    errors
  )) return {valid: false, errors};
  requireString(request.request_id, "diagram_request.request_id", errors);
  if (!OPERATIONS.has(request.operation)) errors.push("diagram_request.operation is invalid");

  if (objectShape(request.caller, "diagram_request.caller", ["skill_id", "workflow", "mode"], [], errors)) {
    requireString(request.caller.skill_id, "diagram_request.caller.skill_id", errors);
    requireString(request.caller.workflow, "diagram_request.caller.workflow", errors);
    if (!MODES.has(request.caller.mode)) errors.push("diagram_request.caller.mode is invalid");
  }

  if (objectShape(
    request.ownership,
    "diagram_request.ownership",
    ["owner_skill", "owner_workflow", "creation_mode", "semantic_authority", "authority_scope"],
    [],
    errors
  )) {
    requireString(request.ownership.owner_skill, "diagram_request.ownership.owner_skill", errors);
    requireString(request.ownership.owner_workflow, "diagram_request.ownership.owner_workflow", errors);
    if (request.ownership.creation_mode !== "authored" || request.ownership.semantic_authority !== "supporting" || request.ownership.authority_scope !== "visual-representation") {
      errors.push("diagram_request.ownership must classify Mermaid source as authored/supporting visual-representation");
    }
  }

  if (!Array.isArray(request.sources)) errors.push("diagram_request.sources must be an array");
  else request.sources.forEach((source, index) => {
    const label = `diagram_request.sources[${index}]`;
    if (objectShape(source, label, ["artifact_id", "version"], [], errors)) {
      requireString(source.artifact_id, `${label}.artifact_id`, errors);
      requireString(source.version, `${label}.version`, errors);
    }
  });

  if (request.source !== undefined && objectShape(request.source, "diagram_request.source", [], ["path", "code"], errors)) {
    if (request.source.path !== undefined) requireString(request.source.path, "diagram_request.source.path", errors);
    if (request.source.code !== undefined) requireString(request.source.code, "diagram_request.source.code", errors);
  }

  if (objectShape(
    request.diagram,
    "diagram_request.diagram",
    ["purpose", "audience", "type", "required_elements", "required_relationships", "forbidden_inferences"],
    [],
    errors
  )) {
    requireString(request.diagram.purpose, "diagram_request.diagram.purpose", errors);
    requireString(request.diagram.audience, "diagram_request.diagram.audience", errors);
    requireString(request.diagram.type, "diagram_request.diagram.type", errors);
    stringArray(request.diagram.required_elements, "diagram_request.diagram.required_elements", errors);
    stringArray(request.diagram.forbidden_inferences, "diagram_request.diagram.forbidden_inferences", errors);
    if (!Array.isArray(request.diagram.required_relationships)) errors.push("diagram_request.diagram.required_relationships must be an array");
    else request.diagram.required_relationships.forEach((relationship, index) => {
      const label = `diagram_request.diagram.required_relationships[${index}]`;
      if (objectShape(relationship, label, ["from", "to", "label"], [], errors)) {
        for (const key of ["from", "to", "label"]) requireString(relationship[key], `${label}.${key}`, errors);
      }
    });
  }

  if (objectShape(request.output, "diagram_request.output", ["source_path", "formats", "profile", "overwrite"], [], errors)) {
    requireString(request.output.source_path, "diagram_request.output.source_path", errors);
    if (!Array.isArray(request.output.formats)) errors.push("diagram_request.output.formats must be an array");
    else for (const format of request.output.formats) {
      if (!FORMATS.has(format)) errors.push(`unsupported output format: ${format}`);
    }
    if (!PROFILES.has(request.output.profile)) errors.push("diagram_request.output.profile is invalid");
    if (typeof request.output.overwrite !== "boolean") errors.push("diagram_request.output.overwrite must be boolean");
  }

  if (objectShape(request.policy, "diagram_request.policy", ["network", "max_repair_attempts"], [], errors)) {
    if (request.policy.network !== false) errors.push("diagram_request.policy.network must be false");
    if (!Number.isInteger(request.policy.max_repair_attempts) || request.policy.max_repair_attempts < 0 || request.policy.max_repair_attempts > 2) {
      errors.push("diagram_request.policy.max_repair_attempts must be an integer from 0 to 2");
    }
  }

  if (!request.source?.code && !request.source?.path && !request.output?.source_path) {
    errors.push("a source.code, source.path, or output.source_path is required");
  }
  return {valid: errors.length === 0, errors};
}
