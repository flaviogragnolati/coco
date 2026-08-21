export function stripMermaidFence(source) {
  const text = String(source).trim();
  const match = text.match(/^```mermaid[^\n]*\n([\s\S]*?)\n```$/i);
  return match ? match[1].trimEnd() + "\n" : source;
}

export function normalizeSource(source, {repair = false} = {}) {
  let normalized = String(source).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const repairs = [];
  if (repair) {
    const unfenced = stripMermaidFence(normalized);
    if (unfenced !== normalized) {
      normalized = unfenced;
      repairs.push("removed-outer-mermaid-code-fence");
    }
    if (/^\s*graph\s+(?:TB|TD|BT|RL|LR)\b/im.test(normalized)) {
      normalized = normalized.replace(/^(\s*)graph(\s+(?:TB|TD|BT|RL|LR)\b)/im, "$1flowchart$2");
      repairs.push("normalized-legacy-graph-keyword-to-flowchart");
    }
  }
  if (!normalized.endsWith("\n")) normalized += "\n";
  return {source: normalized, repairs};
}
