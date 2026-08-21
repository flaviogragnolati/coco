import {mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {lintSource} from "./lint.mjs";
import {mmdcAvailable, mmdcReady, renderWithMmdc} from "./renderers/mmdc.mjs";

export function canonicalValidate(source, {profile = "portable"} = {}) {
  const lint = lintSource(source, {profile});
  if (!lint.valid) return {status: "failed", lint, renderer: null, diagnostic: "Source lint failed before canonical parsing."};
  if (!mmdcAvailable()) return {status: "unavailable", lint, renderer: null, diagnostic: "Local Mermaid CLI is not installed."};
  if (!mmdcReady()) return {status: "unavailable", lint, renderer: null, diagnostic: "No local browser executable is available to Mermaid CLI."};

  const temp = mkdtempSync(join(tmpdir(), "q-tool-mermaid-validate-"));
  const input = join(temp, "input.mmd");
  const output = join(temp, "output.svg");
  try {
    writeFileSync(input, source);
    const renderer = renderWithMmdc(input, output, {profile});
    if (statSync(output).size === 0 || !readFileSync(output).length) throw new Error("Canonical validation created an empty SVG.");
    return {status: "passed", lint, renderer, diagnostic: null};
  } catch (error) {
    return {status: "failed", lint, renderer: null, diagnostic: error.message};
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
}
