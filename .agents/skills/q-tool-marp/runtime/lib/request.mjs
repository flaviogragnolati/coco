const OPERATIONS = new Set(["create", "revise", "validate", "render"]);
const FORMATS = new Set(["source", "html", "pdf", "pptx", "png-title", "png-set"]);
const MODES = new Set(["orchestrated", "standalone"]);

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateRequest(request) {
  const errors = [];
  if (!object(request)) return {valid: false, errors: ["request must be an object"]};
  if (request.schema_version !== "1.0") errors.push("schema_version must be 1.0");
  if (!text(request.request_id)) errors.push("request_id is required");
  if (!OPERATIONS.has(request.operation)) errors.push("operation is invalid");
  if (!object(request.caller) || !text(request.caller.skill_id) || !MODES.has(request.caller.mode)) errors.push("caller is invalid");
  if (request.caller?.mode === "orchestrated" && !text(request.caller.workflow)) errors.push("orchestrated caller requires workflow");
  if (!text(request.owner_skill)) errors.push("owner_skill is required");
  if (!Array.isArray(request.sources) || request.sources.length === 0) errors.push("sources must be non-empty");
  if (!object(request.deck) || !text(request.deck.approved_plan_ref)) errors.push("deck and approved_plan_ref are required");
  if (!Array.isArray(request.deck?.formats) || request.deck.formats.length === 0 || request.deck.formats.some((format) => !FORMATS.has(format))) errors.push("deck formats are invalid");
  if (Array.isArray(request.deck?.formats) && new Set(request.deck.formats).size !== request.deck.formats.length) errors.push("deck formats must be unique");
  if (!object(request.deck?.theme) || !text(request.deck.theme.path) || !/^[a-f0-9]{64}$/.test(request.deck.theme.sha256 || "")) errors.push("theme path and sha256 are required");
  if (!object(request.roots) || !Array.isArray(request.roots.input) || request.roots.input.length === 0 || !Array.isArray(request.roots.output) || request.roots.output.length === 0) errors.push("input and output roots are required");
  if (!object(request.output) || !text(request.output.basename)) errors.push("output policy is required");
  if (request.output?.overwrite === true && !text(request.output.approval_ref)) errors.push("overwrite requires approval_ref");
  if (request.output?.persist_sidecar === true && (!text(request.output.sidecar_path) || !text(request.output.approval_ref))) errors.push("persistent sidecar requires path and approval_ref");
  if (["revise", "validate", "render"].includes(request.operation) && !text(request.deck?.source_path)) errors.push(`${request.operation} requires deck.source_path`);
  if (request.operation === "create" && !text(request.output?.source_path)) errors.push("create requires output.source_path");
  if (request.deck?.formats?.some((format) => format !== "source") && !text(request.output?.render_dir)) errors.push("rendered formats require output.render_dir");
  if (!object(request.policy) || request.policy.network_allowed !== false || request.policy.config_allowed !== false || request.policy.custom_engine_allowed !== false || request.policy.plugins_allowed !== false) errors.push("offline fixed-engine policy is required");
  if (request.policy?.allow_local_files === true && (!Array.isArray(request.deck?.asset_roots) || request.deck.asset_roots.length === 0)) errors.push("local files require asset roots");
  return {valid: errors.length === 0, errors};
}
