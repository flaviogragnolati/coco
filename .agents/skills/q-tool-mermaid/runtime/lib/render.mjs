import {mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {extname, join} from "node:path";
import {atomicWrite} from "./provenance.mjs";
import {renderWithMmdc} from "./renderers/mmdc.mjs";
import {renderWithPretty} from "./renderers/pretty.mjs";
import {canonicalValidate} from "./validate.mjs";

export async function renderSource(source, {
  backend = "mmdc",
  format = "svg",
  profile = "portable",
  output = null,
  overwrite = false,
  root = process.cwd()
} = {}) {
  const validation = canonicalValidate(source, {profile});
  if (validation.status !== "passed") {
    throw new Error(validation.status === "unavailable" ? validation.diagnostic : `Canonical validation failed: ${validation.diagnostic}`);
  }

  if (backend === "pretty") {
    const rendered = await renderWithPretty(source, {format, profile});
    const written = output ? atomicWrite(output, rendered.content, {overwrite, root}) : null;
    return {...rendered, output: written, format, validation};
  }
  if (backend !== "mmdc") throw new Error(`Unknown backend: ${backend}`);
  if (!["svg", "png", "pdf"].includes(format)) throw new Error(`mmdc does not produce ${format}`);
  if (!output) throw new Error("mmdc rendering requires --output");
  if (extname(output).toLowerCase() !== `.${format}`) throw new Error(`Output extension must be .${format}`);

  const temp = mkdtempSync(join(tmpdir(), "q-tool-mermaid-render-"));
  const input = join(temp, "input.mmd");
  const staged = join(temp, `output.${format}`);
  try {
    writeFileSync(input, source);
    const renderer = renderWithMmdc(input, staged, {profile});
    if (statSync(staged).size === 0) throw new Error("Renderer created an empty output");
    const content = readFileSync(staged);
    const written = atomicWrite(output, content, {overwrite, root});
    return {...renderer, output: written, format, validation};
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
}
