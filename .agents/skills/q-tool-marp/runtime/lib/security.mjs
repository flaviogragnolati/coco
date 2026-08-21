import {dirname, resolve} from "node:path";

const REMOTE = /(?:https?:|ftp:|file:|data:|javascript:|(?:^|[\s("'])\/\/)/i;
const FORBIDDEN_HTML = new Set(["script", "iframe", "object", "embed", "link", "style", "video", "audio", "form", "input"]);
const SAFE_HTML = new Set(["br", "sup", "sub", "mark", "span"]);

export function parseFrontmatter(source) {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return {data: {}, body: source, error: "missing YAML frontmatter"};
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) return {data: {}, body: source, error: "unterminated YAML frontmatter"};
  const data = {};
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (!match) return {data, body: lines.slice(end + 1).join("\n"), error: `unsupported frontmatter line: ${line}`};
    const raw = match[2].replace(/^['"]|['"]$/g, "");
    data[match[1]] = raw === "true" ? true : raw === "false" ? false : raw;
  }
  return {data, body: lines.slice(end + 1).join("\n"), error: null};
}

export function remoteReferences(text) {
  const findings = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (/^\s*@import\b/i.test(line) || REMOTE.test(line)) findings.push({line: index + 1, text: line.trim()});
  }
  return findings;
}

export function htmlViolations(source, policy = "disabled") {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");
  const errors = [];
  for (const match of withoutComments.matchAll(/<\/?([A-Za-z][\w-]*)\b([^>]*)>/g)) {
    const tag = match[1].toLowerCase();
    const attrs = match[2] || "";
    if (policy === "disabled") errors.push(`raw HTML is disabled: <${tag}>`);
    else if (!SAFE_HTML.has(tag) || FORBIDDEN_HTML.has(tag)) errors.push(`raw HTML tag is not allowed: <${tag}>`);
    else if (/\b(?:on\w+|href|src|style)\s*=/i.test(attrs)) errors.push(`raw HTML attributes are not allowed on <${tag}>`);
  }
  return errors;
}

export function referencedAssets(source, themeCss, sourcePath, themePath) {
  const assets = [];
  const markdown = /!\[[^\]]*\]\((?:<)?([^)>\s]+)(?:>)?(?:\s+["'][^"']*["'])?\)/g;
  for (const match of source.matchAll(markdown)) assets.push({raw: match[1], base: dirname(sourcePath), origin: "markdown"});
  const cssUrl = /url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi;
  for (const match of themeCss.matchAll(cssUrl)) assets.push({raw: match[2], base: dirname(themePath), origin: "theme"});
  return assets.map((asset) => ({...asset, path: resolve(asset.base, decodeURIComponent(asset.raw))}));
}

export function analyzeSource(source) {
  const frontmatter = parseFrontmatter(source);
  const errors = [];
  const warnings = [];
  if (frontmatter.error) errors.push(frontmatter.error);
  if (frontmatter.data.marp !== true) errors.push("frontmatter must declare marp: true");
  if (!frontmatter.data.theme) errors.push("frontmatter must declare a theme");
  const slides = frontmatter.body.split(/^\s*---\s*$/m).filter((slide) => slide.trim());
  if (slides.length === 0) errors.push("deck must contain at least one slide");
  const notes = [...source.matchAll(/<!--([\s\S]*?)-->/g)]
    .map((match) => match[1].trim())
    .filter((note) => note && !/^[_A-Za-z][\w-]*\s*:/.test(note));
  slides.forEach((slide, index) => {
    const visible = slide.replace(/<!--[\s\S]*?-->/g, "").trim();
    const words = visible.split(/\s+/).filter(Boolean).length;
    const lines = visible.split(/\r?\n/).filter((line) => line.trim()).length;
    if (words > 110 || lines > 16) warnings.push(`slide ${index + 1} is dense (${words} words, ${lines} non-empty lines)`);
  });
  if (notes.length < slides.length) warnings.push(`${slides.length - notes.length} slide(s) have no speaker note`);
  if (source.includes("{{")) errors.push("unresolved template placeholder remains in source");
  return {frontmatter, slides, notes, errors, warnings};
}
