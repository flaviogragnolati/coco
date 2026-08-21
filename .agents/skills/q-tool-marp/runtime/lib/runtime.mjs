import {accessSync, constants, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {delimiter, dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNTIME_ROOT = resolve(HERE, "..");
const CLI_ENTRY = join(RUNTIME_ROOT, "node_modules", "@marp-team", "marp-cli", "marp-cli.js");
const CLI_PACKAGE = join(RUNTIME_ROOT, "node_modules", "@marp-team", "marp-cli", "package.json");

function executable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function pathExecutable(name) {
  if (name.includes("/") || name.includes("\\")) return executable(resolve(name)) ? resolve(name) : null;
  const extensions = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";") : [""];
  for (const part of (process.env.PATH || "").split(delimiter)) {
    for (const extension of extensions) {
      const candidate = join(part, `${name}${extension.toLowerCase()}`);
      if (executable(candidate)) return candidate;
    }
  }
  return null;
}

export function runtimeInstalled() {
  return process.env.Q_TOOL_MARP_DISABLE_RUNTIME !== "1" && existsSync(CLI_ENTRY) && existsSync(CLI_PACKAGE);
}

export function marpVersion() {
  if (!runtimeInstalled()) return null;
  try {
    return JSON.parse(readFileSync(CLI_PACKAGE, "utf8")).version || null;
  } catch {
    return null;
  }
}

export function runMarp(args, {timeout = 60000} = {}) {
  if (!runtimeInstalled()) return {ok: false, status: null, stdout: "", stderr: "local Marp CLI is not installed"};
  const run = spawnSync(process.execPath, [CLI_ENTRY, ...args], {
    cwd: RUNTIME_ROOT,
    encoding: "utf8",
    timeout,
    env: {...process.env, NO_UPDATE_NOTIFIER: "1"}
  });
  return {ok: run.status === 0, status: run.status, stdout: run.stdout || "", stderr: run.stderr || ""};
}

const DEFAULT_BROWSERS = [
  {kind: "chrome", names: ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]},
  {kind: "edge", names: ["microsoft-edge-stable", "microsoft-edge"]},
  {kind: "firefox", names: ["firefox"]}
];

function browserVersion(path) {
  const run = spawnSync(path, ["--version"], {encoding: "utf8", timeout: 5000});
  if (run.status !== 0) return null;
  const version = `${run.stdout || ""}${run.stderr || ""}`.trim();
  return version || null;
}

function realSmoke(browser) {
  const temp = mkdtempSync(join(tmpdir(), "q-tool-marp-browser-"));
  try {
    const source = join(temp, "smoke.md");
    const output = join(temp, "smoke.pdf");
    writeFileSync(source, "---\nmarp: true\n---\n# Browser smoke\n");
    const run = runMarp([
      "--no-config-file", "--no-parallel", "--pdf", "--browser", browser.kind,
      "--browser-path", browser.path, "--output", output, source
    ]);
    return run.ok && existsSync(output) && readFileSync(output).length > 0;
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
}

export function probeCapabilities({runtime = runtimeInstalled(), candidates = null, smoke = realSmoke} = {}) {
  const version = runtime ? marpVersion() : null;
  const base = {
    node: process.version,
    marp_cli: version,
    network: false,
    formats: {
      html: runtime ? "available" : "missing-runtime",
      pdf: runtime ? "missing-browser" : "missing-runtime",
      pptx: runtime ? "missing-browser" : "missing-runtime",
      "png-title": runtime ? "missing-browser" : "missing-runtime",
      "png-set": runtime ? "missing-browser" : "missing-runtime"
    },
    browser: null
  };
  if (!runtime || process.env.Q_TOOL_MARP_DISABLE_BROWSER === "1") return base;

  let available = candidates;
  if (!available) {
    available = [];
    const override = process.env.Q_TOOL_MARP_BROWSER_PATH;
    if (override) available.push({kind: process.env.Q_TOOL_MARP_BROWSER_KIND || "chrome", path: override});
    for (const browser of DEFAULT_BROWSERS) {
      for (const name of browser.names) {
        const path = pathExecutable(name);
        if (path) {
          available.push({kind: browser.kind, path});
          break;
        }
      }
    }
  }

  for (const candidate of available) {
    const path = pathExecutable(candidate.path);
    if (!path) continue;
    const versionText = candidate.version || browserVersion(path);
    if (!versionText) continue;
    const browser = {kind: candidate.kind, path, version: versionText, smoke_render: "failed"};
    if (!smoke(browser)) continue;
    browser.smoke_render = "passed";
    base.browser = browser;
    for (const format of ["pdf", "pptx", "png-title", "png-set"]) base.formats[format] = "available";
    break;
  }
  return base;
}
