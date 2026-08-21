import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {PRETTY_TYPES, detectType} from "../type-detector.mjs";

const RUNTIME_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SKILL_ROOT = resolve(RUNTIME_ROOT, "..");
const PACKAGE_PATH = resolve(RUNTIME_ROOT, "node_modules", "beautiful-mermaid", "package.json");
const PROFILES = new Set(["portable", "github", "static-light", "static-dark", "presentation"]);

function renderOptions(profile) {
  if (!PROFILES.has(profile)) throw new Error(`Unknown render profile: ${profile}`);
  const config = JSON.parse(readFileSync(resolve(SKILL_ROOT, "assets", "profiles", `${profile}.json`), "utf8"));
  const variables = config.themeVariables || {};
  const dark = config.theme === "dark";
  return {
    bg: variables.background || (dark ? "#111827" : "#ffffff"),
    fg: variables.primaryTextColor || (dark ? "#f9fafb" : "#27272a"),
    line: variables.lineColor || (dark ? "#d1d5db" : "#52525b"),
    accent: variables.primaryBorderColor || (dark ? "#93c5fd" : "#2563eb"),
    muted: variables.secondaryTextColor || (dark ? "#a1a1aa" : "#71717a"),
    surface: variables.primaryColor || (dark ? "#1f2937" : "#f4f4f5"),
    border: variables.primaryBorderColor || (dark ? "#93c5fd" : "#a1a1aa"),
    font: variables.fontFamily || "Arial, sans-serif"
  };
}

export function prettyAvailable() {
  return existsSync(PACKAGE_PATH);
}

export function prettyVersion() {
  if (!prettyAvailable()) return null;
  return JSON.parse(readFileSync(PACKAGE_PATH, "utf8")).version || "unknown";
}

export async function renderWithPretty(source, {format = "svg", profile = "portable"} = {}) {
  if (!prettyAvailable()) throw new Error("Local beautiful-mermaid dependency is not installed. Run npm ci in runtime/ separately.");
  const type = detectType(source);
  if (!PRETTY_TYPES.has(type)) throw new Error(`The pretty backend does not support diagram type: ${type}`);
  const library = await import("beautiful-mermaid");
  const options = renderOptions(profile);
  let content;
  if (format === "svg") content = library.renderMermaidSVG(source, options);
  else if (format === "ascii" || format === "unicode") {
    content = library.renderMermaidASCII(source, {
      useAscii: format === "ascii",
      colorMode: "none",
      theme: {
        fg: options.fg,
        border: options.border,
        line: options.line,
        arrow: options.accent,
        accent: options.accent,
        bg: options.bg
      }
    });
  } else throw new Error(`The pretty backend does not support ${format}; use svg, ascii, or unicode.`);
  if (!String(content).trim()) throw new Error("The pretty backend returned an empty result");
  return {content: String(content), renderer: "pretty", rendererVersion: prettyVersion() || "unknown"};
}
