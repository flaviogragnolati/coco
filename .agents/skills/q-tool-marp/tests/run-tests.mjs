import assert from "node:assert/strict";
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {prepareSidecar, writeSidecar} from "../runtime/marp.mjs";
import {renderDeck} from "../runtime/lib/render.mjs";
import {probeCapabilities, runtimeInstalled} from "../runtime/lib/runtime.mjs";
import {validateRequest} from "../runtime/lib/request.mjs";
import {remoteReferences} from "../runtime/lib/security.mjs";
import {validateDeck} from "../runtime/lib/validate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");
const fixture = (...parts) => resolve(HERE, "fixtures", ...parts);

const validRequest = JSON.parse(readFileSync(fixture("marp-request.valid.json"), "utf8"));
const invalidRequest = JSON.parse(readFileSync(fixture("marp-request.invalid.json"), "utf8"));
assert.equal(validateRequest(validRequest).valid, true);
assert.equal(validateRequest(invalidRequest).valid, false);
const overwriteRequest = structuredClone(validRequest);
overwriteRequest.output.overwrite = true;
assert.equal(validateRequest(overwriteRequest).valid, false);
const sidecarRequest = structuredClone(validRequest);
sidecarRequest.output.persist_sidecar = true;
sidecarRequest.output.sidecar_path = "/work/output/result.json";
assert.equal(validateRequest(sidecarRequest).valid, false);
const duplicateFormatRequest = structuredClone(validRequest);
duplicateFormatRequest.deck.formats.push(duplicateFormatRequest.deck.formats[0]);
assert.equal(validateRequest(duplicateFormatRequest).valid, false);

const triggers = JSON.parse(readFileSync(resolve(HERE, "trigger-cases.json"), "utf8"));
assert.ok(triggers.positive.length >= 3 && triggers.negative.length >= 3);
assert.ok(triggers.positive.every((item) => item.expected === "q-tool-marp"));
assert.deepEqual(new Set(triggers.negative.map((item) => item.expected)), new Set(["q-report-deck", "q-tool-pptx", "q-report-workflow", "upstream-content-owner"]));
assert.ok(triggers.positive.some((item) => /Marp/i.test(item.prompt) && /Markdown/i.test(item.prompt)));
assert.equal(triggers.fallback[0].expected, "validated-editable-source-plus-explicit-render-gap");

const neutralTheme = readFileSync(resolve(SKILL, "assets", "themes", "neutral.css"), "utf8");
const quasarTheme = readFileSync(resolve(SKILL, "..", "..", "report", "q-report-deck", "assets", "marp", "quasar.css"), "utf8");
for (const content of [neutralTheme, quasarTheme]) {
  assert.equal(remoteReferences(content).length, 0);
  assert.doesNotMatch(content, /@import|gradient|box-shadow|text-shadow/i);
}
assert.doesNotMatch(neutralTheme, /quasar/i);
assert.match(quasarTheme, /#27367e/i);
assert.match(quasarTheme, /#69bc9b/i);

const missingRuntime = probeCapabilities({runtime: false, candidates: []});
assert.equal(missingRuntime.formats.html, "missing-runtime");
assert.equal(missingRuntime.formats.pdf, "missing-runtime");
const missingBrowser = probeCapabilities({runtime: true, candidates: []});
assert.equal(missingBrowser.formats.html, "available");
assert.equal(missingBrowser.formats.pptx, "missing-browser");
const provenBrowser = probeCapabilities({
  runtime: true,
  candidates: [{kind: "chrome", path: process.execPath, version: "Mock Chrome 1"}],
  smoke: () => true
});
assert.equal(provenBrowser.formats["png-set"], "available");
assert.equal(provenBrowser.browser.smoke_render, "passed");

const temp = mkdtempSync(join(tmpdir(), "q-tool-marp-test-"));
try {
  const input = join(temp, "input");
  const assets = join(input, "assets");
  const output = join(temp, "output");
  const outside = join(temp, "outside");
  mkdirSync(assets, {recursive: true});
  mkdirSync(output);
  mkdirSync(outside);
  const theme = join(input, "neutral.css");
  const source = join(input, "deck.md");
  const image = join(assets, "chart.png");
  writeFileSync(theme, neutralTheme);
  writeFileSync(image, Buffer.from([137, 80, 78, 71]));
  writeFileSync(source, `---\nmarp: true\ntheme: neutral\nsize: 16:9\n---\n<!-- _class: lead -->\n# Verified deck\n\n![chart](assets/chart.png)\n\n<!-- Explain the approved chart. -->\n---\n## Next action\n\nOwner and date\n<!-- Confirm the owner. -->\n`);

  const validation = validateDeck(source, {themePath: theme, inputRoots: [input], assetRoots: [assets]});
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(validation.slide_count, 2);
  assert.equal(validation.note_count, 2);
  assert.equal(validation.assets.length, 1);

  const mismatchedTheme = join(input, "mismatched-theme.md");
  writeFileSync(mismatchedTheme, "---\nmarp: true\ntheme: another-theme\n---\n# Mismatch\n");
  assert.equal(validateDeck(mismatchedTheme, {themePath: theme, inputRoots: [input], assetRoots: [assets]}).valid, false);

  const remote = join(input, "remote.md");
  writeFileSync(remote, "---\nmarp: true\ntheme: neutral\n---\n# Remote\n![x](https://example.com/x.png)\n");
  assert.equal(validateDeck(remote, {themePath: theme, inputRoots: [input], assetRoots: [assets]}).valid, false);

  const html = join(input, "html.md");
  writeFileSync(html, "---\nmarp: true\ntheme: neutral\n---\n# HTML\n<iframe src='x'></iframe>\n");
  assert.equal(validateDeck(html, {themePath: theme, inputRoots: [input], assetRoots: [assets], rawHtml: "disabled"}).valid, false);
  assert.equal(validateDeck(html, {themePath: theme, inputRoots: [input], assetRoots: [assets], rawHtml: "safe"}).valid, false);

  const escaped = join(outside, "escape.md");
  writeFileSync(escaped, "---\nmarp: true\ntheme: neutral\n---\n# Escape\n");
  assert.equal(validateDeck(escaped, {themePath: theme, inputRoots: [input], assetRoots: [assets]}).valid, false);

  const secret = join(outside, "secret.png");
  const linked = join(assets, "linked.png");
  writeFileSync(secret, "secret");
  symlinkSync(secret, linked);
  const symlinkDeck = join(input, "symlink.md");
  writeFileSync(symlinkDeck, "---\nmarp: true\ntheme: neutral\n---\n# Symlink\n![x](assets/linked.png)\n");
  assert.equal(validateDeck(symlinkDeck, {themePath: theme, inputRoots: [input], assetRoots: [assets]}).valid, false);

  const activeAsset = join(assets, "active.svg");
  writeFileSync(activeAsset, "<svg xmlns='http://www.w3.org/2000/svg'><script>throw 1</script></svg>");
  const activeDeck = join(input, "active.md");
  writeFileSync(activeDeck, "---\nmarp: true\ntheme: neutral\n---\n# Active asset\n![x](assets/active.svg)\n");
  assert.equal(validateDeck(activeDeck, {themePath: theme, inputRoots: [input], assetRoots: [assets]}).valid, false);

  const fakeCapabilities = {
    node: process.version,
    marp_cli: "4.5.0",
    browser: {kind: "chrome", path: process.execPath, version: "Mock Chrome 1", smoke_render: "passed"},
    formats: {html: "available", pdf: "available", pptx: "available", "png-title": "available", "png-set": "available"}
  };
  const fakeRunner = (args) => {
    const target = args[args.indexOf("--output") + 1];
    if (args.includes("--images")) {
      const parsed = target.replace(/\.png$/, "");
      writeFileSync(`${parsed}.001.png`, "one");
      writeFileSync(`${parsed}.002.png`, "two");
    } else {
      writeFileSync(target, "rendered");
    }
    return {ok: true, stdout: "", stderr: ""};
  };

  const titleOutput = join(output, "title.png");
  const title = renderDeck(source, {format: "png-title", outputPath: titleOutput, themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], capabilities: fakeCapabilities, runner: fakeRunner});
  assert.equal(title.outcome, "completed");
  assert.equal(title.outputs.length, 1);
  assert.ok(existsSync(titleOutput));

  const nestedOutput = join(output, "nested", "deck.html");
  const nested = renderDeck(source, {format: "html", outputPath: nestedOutput, themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], capabilities: fakeCapabilities, runner: fakeRunner});
  assert.equal(nested.outcome, "completed");
  assert.ok(existsSync(nestedOutput));

  const setOutput = join(output, "slides.png");
  const set = renderDeck(source, {format: "png-set", outputPath: setOutput, themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], capabilities: fakeCapabilities, runner: fakeRunner});
  assert.equal(set.outputs.length, 2);
  assert.ok(set.outputs.every((item) => /slides\.00[12]\.png$/.test(item.path)));

  writeFileSync(join(output, "slides.003.png"), "stale");
  const replacedSet = renderDeck(source, {format: "png-set", outputPath: setOutput, themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], overwrite: true, approvalRef: "approval-overwrite-set", capabilities: fakeCapabilities, runner: fakeRunner});
  assert.equal(replacedSet.outputs.length, 2);
  assert.equal(existsSync(join(output, "slides.003.png")), false);

  const reservedSetMember = join(output, "slides.001.png");
  const reserved = renderDeck(source, {format: "png-set", outputPath: setOutput, themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], overwrite: true, approvalRef: "approval-overwrite-set", reservedPaths: [reservedSetMember], capabilities: fakeCapabilities, runner: fakeRunner});
  assert.equal(reserved.outcome, "blocked");
  assert.equal(readFileSync(reservedSetMember, "utf8"), "one");

  const collisionSource = join(input, "collision.html");
  writeFileSync(collisionSource, readFileSync(source));
  const collision = renderDeck(collisionSource, {format: "html", outputPath: collisionSource, themePath: theme, inputRoots: [input], outputRoots: [input], assetRoots: [assets], capabilities: fakeCapabilities, runner: fakeRunner});
  assert.equal(collision.outcome, "blocked");

  const existing = join(output, "existing.html");
  writeFileSync(existing, "old");
  const refused = renderDeck(source, {format: "html", outputPath: existing, themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], capabilities: fakeCapabilities, runner: fakeRunner});
  assert.equal(refused.outcome, "blocked");
  assert.equal(readFileSync(existing, "utf8"), "old");

  assert.throws(() => prepareSidecar(existing, [output], true, "approval-sidecar", [existing]), /distinct/);
  const sidecarPath = prepareSidecar(join(output, "result.json"), [output], false, "approval-sidecar", [existing]);
  const sidecarResult = {persistent_writes: [sidecarPath], outcome: "completed"};
  writeSidecar(sidecarResult, sidecarPath);
  assert.deepEqual(JSON.parse(readFileSync(sidecarPath, "utf8")), sidecarResult);

  const failedPath = join(output, "failed.html");
  const failed = renderDeck(source, {format: "html", outputPath: failedPath, themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], capabilities: fakeCapabilities, runner: () => ({ok: false, stderr: "intentional failure"})});
  assert.equal(failed.outcome, "blocked");
  assert.equal(existsSync(failedPath), false);

  const degraded = renderDeck(source, {format: "pdf", outputPath: join(output, "blocked.pdf"), themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets], capabilities: missingBrowser, runner: fakeRunner});
  assert.equal(degraded.outcome, "blocked");
  assert.match(degraded.blockers[0], /missing-browser/);

  if (runtimeInstalled()) {
    const actual = renderDeck(source, {format: "html", outputPath: join(output, "actual.html"), themePath: theme, inputRoots: [input], outputRoots: [output], assetRoots: [assets]});
    assert.notEqual(actual.outcome, "blocked", actual.blockers?.join("; "));
    assert.ok(existsSync(join(output, "actual.html")));
  } else {
    assert.equal(missingRuntime.formats.html, "missing-runtime");
  }
} finally {
  rmSync(temp, {recursive: true, force: true});
}

process.stdout.write("q-tool-marp tests passed\n");
