const TYPE_PATTERNS = [
  ["flowchart", /^(?:flowchart|graph)\b/i],
  ["sequence", /^sequenceDiagram\b/i],
  ["er", /^erDiagram\b/i],
  ["state", /^stateDiagram(?:-v2)?\b/i],
  ["class", /^classDiagram\b/i],
  ["c4", /^C4(?:Context|Container|Component|Dynamic|Deployment)\b/i],
  ["architecture", /^architecture-beta\b/i],
  ["gantt", /^gantt\b/i],
  ["pie", /^pie\b/i],
  ["mindmap", /^mindmap\b/i],
  ["timeline", /^timeline\b/i],
  ["gitgraph", /^gitGraph\b/i],
  ["journey", /^journey\b/i],
  ["quadrant", /^quadrantChart\b/i],
  ["requirement", /^requirementDiagram\b/i],
  ["sankey", /^sankey-beta\b/i],
  ["xychart", /^xychart-beta\b/i],
  ["block", /^block-beta\b/i],
  ["kanban", /^kanban\b/i],
  ["packet", /^packet-beta\b/i],
  ["radar", /^radar-beta\b/i],
  ["treemap", /^treemap-beta\b/i],
  ["zenuml", /^zenuml\b/i]
];

export const PRETTY_TYPES = new Set(["flowchart", "sequence", "state", "class", "er", "xychart"]);

export function firstStatement(source) {
  const lines = String(source).replace(/^\uFEFF/, "").split(/\r?\n/);
  let inFrontmatter = lines[0]?.trim() === "---";
  let frontmatterClosed = !inFrontmatter;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (inFrontmatter && index > 0 && line === "---") {
      inFrontmatter = false;
      frontmatterClosed = true;
      continue;
    }
    if (!frontmatterClosed || !line || line.startsWith("%%")) continue;
    return line;
  }
  return "";
}

export function detectType(source) {
  const statement = firstStatement(source);
  for (const [type, pattern] of TYPE_PATTERNS) {
    if (pattern.test(statement)) return type;
  }
  return "unknown";
}
