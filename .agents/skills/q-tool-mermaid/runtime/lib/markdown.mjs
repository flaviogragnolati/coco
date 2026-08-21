export function extractMermaidBlocks(markdown) {
  const text = String(markdown);
  const blocks = [];
  const pattern = /```mermaid[^\n]*\n([\s\S]*?)\n```/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    blocks.push({index: blocks.length + 1, source: match[1], start: match.index, end: pattern.lastIndex, raw: match[0]});
  }
  return blocks;
}

export function slug(value, fallback) {
  const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

export function blockName(block) {
  const title = block.source.match(/^\s*accTitle\s*:\s*(.+)$/im)?.[1];
  return `${String(block.index).padStart(2, "0")}-${slug(title, "diagram")}`;
}

export function replaceMermaidBlocks(markdown, blocks, replacements) {
  let output = String(markdown);
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    output = output.slice(0, block.start) + replacements[index] + output.slice(block.end);
  }
  return output;
}
