import {spawnSync} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import {homedir, tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const RUNTIME_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const SKILL_ROOT = resolve(RUNTIME_ROOT, "..");
const BIN = resolve(RUNTIME_ROOT, "node_modules", ".bin", process.platform === "win32" ? "mmdc.cmd" : "mmdc");
const PACKAGE_PATH = resolve(RUNTIME_ROOT, "node_modules", "@mermaid-js", "mermaid-cli", "package.json");
const PROFILES = new Set(["portable", "github", "static-light", "static-dark", "presentation"]);

export function browserExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable"
  ].filter(Boolean);
  const system = candidates.find((candidate) => existsSync(candidate));
  if (system) return system;
  try {
    const {Browser, computeExecutablePath} = require("@puppeteer/browsers");
    const {PUPPETEER_REVISIONS} = require("puppeteer-core/internal/revisions.js");
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(homedir(), ".cache", "puppeteer");
    for (const browser of [Browser.CHROMEHEADLESSSHELL, Browser.CHROME]) {
      const bundled = computeExecutablePath({cacheDir, browser, buildId: PUPPETEER_REVISIONS[browser]});
      if (existsSync(bundled)) return bundled;
    }
    return null;
  } catch {
    return null;
  }
}

export function mmdcAvailable() {
  if (process.env.Q_TOOL_MERMAID_DISABLE_MMDC === "1") return false;
  return existsSync(BIN);
}

export function mmdcReady() {
  return mmdcAvailable() && Boolean(browserExecutable());
}

export function mmdcVersion() {
  if (!mmdcAvailable()) return null;
  return existsSync(PACKAGE_PATH) ? JSON.parse(readFileSync(PACKAGE_PATH, "utf8")).version || null : null;
}

export function renderWithMmdc(sourcePath, outputPath, {profile = "portable"} = {}) {
  if (!mmdcAvailable()) throw new Error("Local @mermaid-js/mermaid-cli dependency is not installed. Run npm ci in runtime/ separately.");
  if (!mmdcReady()) throw new Error("No authorized Chromium, Chrome, or Puppeteer browser executable is available for Mermaid CLI.");
  if (!PROFILES.has(profile)) throw new Error(`Unknown render profile: ${profile}`);
  const profilePath = resolve(SKILL_ROOT, "assets", "profiles", `${profile}.json`);
  const temp = mkdtempSync(join(tmpdir(), "q-tool-mermaid-browser-"));
  try {
    const args = ["--input", sourcePath, "--output", outputPath, "--configFile", profilePath, "--quiet"];
    const executablePath = browserExecutable();
    const configPath = join(temp, "puppeteer.json");
    const config = {executablePath, headless: true};
    if (process.env.MERMAID_PUPPETEER_NO_SANDBOX === "1") config.args = ["--no-sandbox"];
    writeFileSync(configPath, JSON.stringify(config));
    args.push("--puppeteerConfigFile", configPath);
    const run = spawnSync(BIN, args, {encoding: "utf8", env: {...process.env, NO_PROXY: "*"}});
    if (run.error) throw run.error;
    if (run.status !== 0) throw new Error((run.stderr || run.stdout || `mmdc exited ${run.status}`).trim());
    if (!existsSync(outputPath)) throw new Error("mmdc reported success but did not create the requested output");
    return {renderer: "mmdc", rendererVersion: mmdcVersion() || "unknown"};
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
}
