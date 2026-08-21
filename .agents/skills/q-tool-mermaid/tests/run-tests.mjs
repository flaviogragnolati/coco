import assert from "node:assert/strict";
import {copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {capabilities} from "../runtime/lib/capabilities.mjs";
import {lintSource} from "../runtime/lib/lint.mjs";
import {extractMermaidBlocks, replaceMermaidBlocks} from "../runtime/lib/markdown.mjs";
import {normalizeSource} from "../runtime/lib/normalize.mjs";
import {renderSource} from "../runtime/lib/render.mjs";
import {loadRequest, validateRequest} from "../runtime/lib/request.mjs";
import {detectType} from "../runtime/lib/type-detector.mjs";
import {canonicalValidate} from "../runtime/lib/validate.mjs";
import {compileDocument} from "../runtime/mermaid.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");
const fixture = (...parts) => resolve(HERE, "fixtures", ...parts);
const validSource = readFileSync(fixture("valid", "flowchart.mmd"), "utf8");

assert.equal(detectType(validSource), "flowchart");
assert.equal(detectType("sequenceDiagram\nA->>B: hi\n"), "sequence");
assert.equal(lintSource(validSource).valid, true);
assert.equal(lintSource(readFileSync(fixture("invalid", "unknown-type.mmd"), "utf8")).valid, false);
assert.equal(lintSource(readFileSync(fixture("security", "click.mmd"), "utf8")).security, "failed");

const repaired = normalizeSource("```mermaid\ngraph LR\nA-->B\n```", {repair: true});
assert.match(repaired.source, /^flowchart LR/);
assert.deepEqual(repaired.repairs, ["removed-outer-mermaid-code-fence", "normalized-legacy-graph-keyword-to-flowchart"]);

const markdown = readFileSync(fixture("markdown", "two-diagrams.md"), "utf8");
const blocks = extractMermaidBlocks(markdown);
assert.equal(blocks.length, 2);
assert.doesNotMatch(replaceMermaidBlocks(markdown, blocks, ["![one](one.svg)", "![two](two.svg)"]), /```mermaid/);

const validRequest = loadRequest(fixture("diagram-request.valid.yaml"));
const invalidRequest = loadRequest(fixture("diagram-request.invalid.yaml"));
assert.equal(validateRequest(validRequest).valid, true);
assert.equal(validateRequest(invalidRequest).valid, false);
const batchRequest = structuredClone(validRequest);
batchRequest.diagram_request.operation = "compile";
assert.equal(validateRequest(batchRequest).valid, false);
const extraPropertyRequest = structuredClone(validRequest);
extraPropertyRequest.diagram_request.caller.unapproved = true;
assert.equal(validateRequest(extraPropertyRequest).valid, false);

process.env.Q_TOOL_MERMAID_DISABLE_MMDC = "1";
assert.equal(canonicalValidate(validSource).status, "unavailable");
assert.equal(capabilities().canonical.available, false);
delete process.env.Q_TOOL_MERMAID_DISABLE_MMDC;

for (const profile of ["portable", "github", "static-light", "static-dark", "presentation"]) {
  const data = JSON.parse(readFileSync(resolve(SKILL, "assets", "profiles", `${profile}.json`), "utf8"));
  assert.equal(data.securityLevel, "strict");
}

const current = capabilities();
if (current.canonical.available) {
  const temp = mkdtempSync(join(tmpdir(), "q-tool-mermaid-test-"));
  try {
    const input = join(temp, "diagram.mmd");
    const svg = join(temp, "diagram.svg");
    copyFileSync(fixture("valid", "flowchart.mmd"), input);

    assert.equal(canonicalValidate(validSource).status, "passed");
    await renderSource(validSource, {output: svg, format: "svg", root: temp});
    assert.ok(existsSync(svg) && readFileSync(svg).length > 0);

    const ascii = join(temp, "diagram.ascii.txt");
    await renderSource(validSource, {backend: "pretty", output: ascii, format: "ascii", profile: "static-dark", root: temp});
    assert.ok(readFileSync(ascii, "utf8").trim().length > 0);

    const markdownInput = join(temp, "source.md");
    const markdownOutput = join(temp, "derived.md");
    const assets = join(temp, "assets");
    writeFileSync(markdownInput, markdown);
    const compile = await compileDocument(markdownInput, {output: markdownOutput, "assets-dir": assets, root: temp});
    assert.doesNotMatch(readFileSync(markdownOutput, "utf8"), /```mermaid/);
    assert.equal(compile.diagrams.length, 2);
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
} else {
  process.stdout.write("canonical renderer tests skipped: run npm ci in runtime/\n");
}

process.stdout.write("q-tool-mermaid tests passed\n");
