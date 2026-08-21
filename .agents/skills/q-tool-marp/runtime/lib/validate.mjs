import {existsSync, readFileSync} from "node:fs";
import {extname, resolve} from "node:path";
import {sha256File} from "./hash.mjs";
import {requireInside} from "./path-policy.mjs";
import {analyzeSource, htmlViolations, referencedAssets, remoteReferences} from "./security.mjs";

const RASTER_ASSETS = new Set([".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const FONT_ASSETS = new Set([".otf", ".ttf", ".woff", ".woff2"]);

export function validateDeck(sourcePath, {
  themePath,
  inputRoots,
  assetRoots = [],
  rawHtml = "disabled"
} = {}) {
  const errors = [];
  const warnings = [];
  let source;
  let theme;
  try {
    source = requireInside(sourcePath, inputRoots, {label: "source"});
    theme = requireInside(themePath, [...inputRoots, ...assetRoots], {label: "theme"});
  } catch (error) {
    return {valid: false, errors: [error.message], warnings, assets: [], slide_count: 0, note_count: 0};
  }

  const markdown = readFileSync(source, "utf8");
  const css = readFileSync(theme, "utf8");
  const analysis = analyzeSource(markdown);
  errors.push(...analysis.errors);
  warnings.push(...analysis.warnings);
  const themeDeclaration = css.match(/^\s*\/\*\s*@theme\s+([a-z0-9-]+)\s*\*\//im);
  if (!themeDeclaration) errors.push("theme CSS must declare a stable @theme identifier");
  else if (analysis.frontmatter.data.theme !== themeDeclaration[1]) {
    errors.push(`frontmatter theme ${analysis.frontmatter.data.theme || "is missing"} does not match CSS @theme ${themeDeclaration[1]}`);
  }

  const remote = [...remoteReferences(markdown), ...remoteReferences(css)];
  if (remote.length) errors.push(...remote.map((finding) => `remote reference at line ${finding.line}: ${finding.text}`));
  errors.push(...htmlViolations(markdown, rawHtml));

  const assets = [];
  for (const asset of referencedAssets(markdown, css, source, theme)) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(asset.raw)) {
      errors.push(`asset URI is not local: ${asset.raw}`);
      continue;
    }
    try {
      const path = requireInside(asset.path, assetRoots, {label: `${asset.origin} asset`});
      if (!existsSync(path)) throw new Error(`asset does not exist: ${path}`);
      const extension = extname(path).toLowerCase();
      const allowed = asset.origin === "theme" ? new Set([...RASTER_ASSETS, ...FONT_ASSETS]) : RASTER_ASSETS;
      if (!allowed.has(extension)) throw new Error(`unsupported or active ${asset.origin} asset type: ${extension || "extensionless"}`);
      assets.push({path, sha256: sha256File(path), origin: asset.origin});
    } catch (error) {
      errors.push(error.message);
    }
  }

  return {
    valid: errors.length === 0,
    source: resolve(source),
    theme: resolve(theme),
    source_sha256: sha256File(source),
    theme_sha256: sha256File(theme),
    assets,
    slide_count: analysis.slides.length,
    note_count: analysis.notes.length,
    notes: analysis.notes,
    validation: {
      structural: errors.some((error) => /frontmatter|slide|placeholder/.test(error)) ? "failed" : "passed",
      assets: errors.some((error) => /asset|theme/.test(error)) ? "failed" : "passed",
      network: remote.length ? "failed" : "passed",
      html: errors.some((error) => /HTML/.test(error)) ? "failed" : "passed",
      notes: "passed"
    },
    errors,
    warnings
  };
}
