import {detectType} from "./type-detector.mjs";

const ACCESSIBLE_TYPES = new Set(["flowchart", "sequence", "er", "state", "class"]);
const SECURITY_RULES = [
  ["click-directive", /^\s*click\s+/im, "Click directives are disabled by the local security policy."],
  ["javascript-url", /javascript\s*:/i, "JavaScript URLs are not allowed."],
  ["active-html", /<(?:script|iframe|object|embed)\b/i, "Active HTML is not allowed."],
  ["init-directive", /%%\s*\{\s*init\s*:/i, "Initialization directives are replaced by an approved profile."],
  ["external-url", /https?:\/\//i, "External URLs require separate review and are disabled by default."]
];

function complexity(source) {
  const lines = source.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("%%"));
  const arrows = (source.match(/-->|---|==>|-.->|->>|-->>|\|o--|\|\|--|o\{/g) || []).length;
  const subgraphs = (source.match(/^\s*subgraph\b/gim) || []).length;
  return {lines: lines.length, relationships: arrows, groups: subgraphs};
}

export function lintSource(source, {profile = "portable"} = {}) {
  const text = String(source);
  const type = detectType(text);
  const errors = [];
  const warnings = [];
  if (!text.trim()) errors.push({code: "empty-source", message: "Mermaid source is empty."});
  if (type === "unknown") errors.push({code: "unknown-type", message: "The first Mermaid statement does not declare a recognized diagram type."});

  for (const [code, pattern, message] of SECURITY_RULES) {
    if (pattern.test(text)) errors.push({code, message});
  }

  if (ACCESSIBLE_TYPES.has(type)) {
    if (!/^\s*accTitle\s*:/im.test(text)) warnings.push({code: "missing-acc-title", message: "Add accTitle for supported renderers."});
    if (!/^\s*accDescr\s*:/im.test(text)) warnings.push({code: "missing-acc-description", message: "Add accDescr for supported renderers."});
  }
  if (["portable", "github"].includes(profile) && /^\s*style\s+/im.test(text)) {
    warnings.push({code: "inline-style", message: "Portable profiles prefer classDef over inline style directives."});
  }
  if (["portable", "github"].includes(profile) && /<br\s*\/?\s*>/i.test(text)) {
    warnings.push({code: "html-label", message: "Portable profiles avoid HTML labels."});
  }

  const metrics = complexity(text);
  if (metrics.lines > 80 || metrics.relationships > 35 || metrics.groups > 6) {
    warnings.push({code: "complexity", message: "Review whether the diagram should be split for its audience.", metrics});
  }

  return {
    valid: errors.length === 0,
    type,
    profile,
    security: errors.some((item) => SECURITY_RULES.some(([code]) => code === item.code)) ? "failed" : "passed",
    accessibility: warnings.some((item) => item.code.startsWith("missing-acc")) ? "warnings" : "passed",
    errors,
    warnings,
    metrics
  };
}
