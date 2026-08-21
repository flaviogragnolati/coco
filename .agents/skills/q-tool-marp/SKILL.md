---
name: q-tool-marp
description: "Create, revise, validate, and render offline Marp or Marpit Markdown presentations for Quasar workflows through a capability-checked local runtime. Use when the user explicitly asks for Marp, Markdown slides, an editable Marp source bundle, or local Marp HTML, PDF, standard PPTX, or PNG output. Do not use for a generic report or branded deck whose narrative, slide plan, or identity is undecided; route that work to q-report-deck. Do not use when PowerPoint text, shapes, or charts must remain object-editable; route that requirement to q-tool-pptx. Preserve caller-owned meaning and treat renders as derived with no semantic authority. Requires the q-core-contract companion."
---

# Work with Marp presentations

Produce an editable Marp source and only the requested locally verified derivatives. Preserve caller ownership: this tool owns Marp syntax, theme and asset mechanics, safe path handling, validation, rendering, speaker-note diagnostics, and provenance; it does not own narrative, facts, slide order, brand, release, or publication.

Read the `q-core-contract` companion before acting. If it is missing, stop and install both skills with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-tool-marp`. Never install the runtime during a skill execution, access the network, load a config file, enable a custom engine or plugin, start server/watch/preview modes, publish, or update workflow state or the artifact index.

## Operations

| Operation | Outcome |
|---|---|
| `create` | Author a new `.md` source from approved content or a confirmed slide plan. |
| `revise` | Change an existing Marp source without silently changing caller-owned meaning. |
| `validate` | Return source, theme, asset, path, HTML, note, density, and runtime diagnostics. |
| `render` | Validate first, then create requested HTML, PDF, standard PPTX, `png-title`, or `png-set` outputs. |

## 1. Resolve authority and request

1. Determine the operation, execution mode, owner, exact source refs, approved slide content or plan, required formats, source/theme/assets, authorized canonical input and output roots, overwrite policy, raw-HTML policy, browser hint, sidecar policy, and validation demand.
2. In orchestrated mode, require one schema-valid [`marp_request`](references/marp-request.schema.yaml) under the [integration contract](references/integration-contract.md). Preserve `owner_skill`, approved source refs, and forbidden semantic changes unchanged.
3. In standalone mode, construct the same request from the prompt. Ask only when a missing choice changes meaning, paths, overwrite authorization, security, or a required deliverable.
4. Route an undecided report narrative, branded Quasar deck, or slide plan to `q-report-deck`; route object-editable PowerPoint requirements to `q-tool-pptx`; route diagram meaning to its domain owner and only approved Mermaid encoding to `q-tool-mermaid`.

Complete this step when one owner, one operation, exact sources, formats, roots, approvals, semantic non-goals, and the next writer are explicit.

## 2. Author or revise the source

For `create`, use the neutral template in `assets/templates/template-neutral.md` unless the caller supplies an authorized theme and template. For a Reporting deck, use only the paths and hashes resolved by `q-report-deck`; never reach into another skill for brand assets at runtime.

Read [Marp syntax](references/marp-syntax.md) when authoring directives, slide breaks, backgrounds, or notes. Read [authoring quality](references/authoring-quality.md) when slide density, narrative-to-slide mapping, accessibility, or notes need judgment. Read [image patterns](references/image-patterns.md) only when local images are part of the approved plan. Read [theme CSS](references/theme-css-guide.md) only when creating or revising a custom theme.

Keep all claims, numbers, qualifiers, citations, commitments, and source IDs faithful to approved inputs. Preserve speaker notes as Marpit comments in the editable source. Treat density checks as warnings, never as authority to summarize or delete content.

Complete this step when every slide maps to approved content, the source remains editable, every asset is local and attributable, and no semantic change is hidden inside layout work.

## 3. Validate safety and structure

Read [runtime and security](references/runtime-and-security.md) before processing local assets, raw HTML, symlinks, browser paths, or any untrusted Markdown/CSS.

Run:

```bash
node runtime/marp.mjs validate deck.md --theme theme.css --input-root /authorized/input --asset-root /authorized/assets --raw-html disabled --json
```

Require `marp: true`, a resolvable theme, at least one slide, canonical paths inside the declared roots, and local assets inside declared asset roots. Reject remote or protocol-relative URLs, remote `@import` or `url(...)`, iframes, disabled raw HTML, config files, custom engines/plugins, source/output collisions, and symlink escapes. Report missing notes and excessive density as scoped warnings.

Complete validation only when deterministic checks pass or the result names the exact blocker or unavailable check without claiming success.

## 4. Probe and render locally

Run `node runtime/marp.mjs capabilities --json` before rendering. HTML requires the pinned local Marp CLI. PDF, standard PPTX, `png-title`, and `png-set` additionally require a browser route proven by a smoke render; a discovered executable path alone is not capability evidence. `Q_TOOL_MARP_BROWSER_PATH` may name an approved local browser path, but it still undergoes the smoke test.

Render one format at a time:

```bash
node runtime/marp.mjs render deck.md --format html --output deck.html --theme theme.css --input-root /authorized/input --output-root /authorized/output --asset-root /authorized/assets --json
```

Use `png-title` for one first-slide image and `png-set` for the complete numbered set. The runtime always passes `--no-config-file`, disables parallel observation modes, and enables local files only after path validation. It writes staging output on the destination filesystem and moves complete non-empty results into place. Pass `--overwrite --approval-ref <id>` only after explicit replacement approval. Persist a provenance sidecar only when the request names its path and approval reference.

Do not use `--pptx-editable`; it is experimental, reduces fidelity, and does not satisfy this contract. Use `q-tool-pptx` when editable PowerPoint objects are required.

Complete rendering when every requested output exists, is non-empty, hashes back to the validated source/theme/assets, and records actual Node, Marp CLI, and browser versions. Otherwise return the editable source plus an explicit format-specific capability gap.

## 5. Return an ownership-safe result

Return one schema-valid [`marp_result`](references/marp-result.schema.yaml) with the original request ID and owner, `generator_skill: q-tool-marp`, input and output hashes, runtime versions, separate validation/render/release-readiness states, note preservation by format, persistent writes, warnings, blockers, and provenance.

Classify a standalone Marp Markdown source, newly created theme, and persisted bundle assets as authored and supporting for `slide-representation`; classify every HTML, PDF, PPTX, or PNG as derived with `semantic_authority: none`. For Reporting, `q-report-deck` owns both source bundle and renders as derived/no-authority presentation artifacts. Only the root orchestrator reconciles persistent outputs.

When standalone execution writes files, also return a valid `stage_result` with `global_state_updated: false` and `reconciliation_required: true`. Use `completed_with_warnings` only when usable requested outputs exist and remaining gaps are non-required; use `blocked` for unauthorized paths or overwrite, security failure, semantic ambiguity, missing required runtime, failed required validation, or missing requested output.

Complete the operation when outputs and checks are evidenced, ownership is unchanged, limitations are explicit, and the caller has one truthful next action.

## Hard boundaries

- Preserve the source plus exact CSS and local assets as the editable representation; editability never grants semantic authority.
- Keep standard Marp PPTX distinct from a native object-editable PPTX.
- Never infer narrative, brand, data, citations, conclusions, or commitments to improve slide fit.
- Never access remote assets, install packages, load arbitrary configuration, execute plugins, or start an observing mode.
- Never overwrite, persist a sidecar, publish, or change global workflow records without the separately required authority.
