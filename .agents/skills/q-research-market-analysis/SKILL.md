---
name: q-research-market-analysis
description: "Analyze an authorized Quasar market-research brief and exact Findings Register with deterministic local methods for market sizing, TAM/SAM/SOM, top-down and bottom-up reconciliation, forecasts, sensitivity, unit normalization, demand segmentation, competitor matrices, market shares, CRn, HHI, and conditional scenarios. Use after evidence collection when research_profile is market with analysis_modules, or target this stage explicitly with valid brief and findings versions. It writes one supporting market-analysis artifact and never gathers sources, operates primary fieldwork, processes survey microdata, or authors a report. For general research without market modules, evidence gathering, participant contact, or report rendering, use the owning Research or Reporting skill instead. Part of the Quasar AI delivery skills; requires the q-core-contract companion."
---

# Market analysis

Produce one auditable `market-analysis.yaml` whose published results remain conditional on the authorized measurement contract, registered findings, explicit assumptions, and approved scenarios. Do not introduce evidence or turn analysis into decision, commercial, or reporting authority.

Read the `q-core-contract` companion for shared governance, research ownership, lifecycle, and stage results; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Validate the artifact against [`references/market-analysis.schema.yaml`](references/market-analysis.schema.yaml).

## Activate the stage

Run in orchestrated mode when the exact authorized Research Brief declares `research_profile: market` and at least one `analysis_module`. Also run when the orchestrator or user explicitly selects `q-research-market-analysis` and supplies resolvable brief and Findings Register IDs and versions plus a measurement contract.

Skip this stage for a general-profile run without market modules; preserve the route `scope → investigate → synthesize`. Route source discovery to `q-research-investigate`, report composition to `q-report-source`, participant contact or primary-research operations to a capability gap, and raw survey-response analysis outside this package. Published aggregate survey or interview findings may be interpreted only when already registered as evidence.

Complete activation when mode, exact inputs, measurement contract, requested modules, and the absence of primary-fieldwork operations are explicit; otherwise return a scope or capability gap without a market result.

## Load only the selected methods

| Reference | Load when |
|---|---|
| [Measurement and sizing](references/measurement-and-sizing.md) | Sizing, TAM/SAM/SOM, unit normalization, top-down/bottom-up reconciliation, or demand segmentation is selected. |
| [Forecast and sensitivity](references/forecast-and-sensitivity.md) | Forecast, sensitivity, or scenario analysis is selected. |
| [Competitor and concentration](references/competitor-and-concentration.md) | Competitive landscape, shares, CRn, or HHI is selected. |
| [Custom methods](references/custom-methods.md) | No bundled method fits and project-local code is proposed. |
| [Methods and ethics](references/methods-and-ethics.md) | Survey/interview evidence, competitor intelligence, concentration, sensitive evidence, or a legal/financial inference boundary is in scope. |

## Analyze

1. **Lock lineage.** Load the exact brief and Findings Register versions. Resolve every calculation input to a registered `finding_id` or declared assumption; refuse unregistered source material. Confirm that the Findings Register did not become a calculation or recommendation ledger.
2. **Normalize measurement.** Bind `measurement_contract_ref`; reconcile product, buyer/user/payer, transaction, value-chain level, geography, channels, periods, measure, unit, denominator, stock/flow, gross/net, tax treatment, currency/base year, price basis, and taxonomy. Stop the affected result when a material mismatch lacks an explicit conversion calculation.
3. **Plan modules.** Select only the brief's approved `analysis_modules`. Give every assumption, calculation, scenario, reconciliation gap, and publishable result a stable ID. Keep module breadth inside this skill rather than creating another owner.
4. **Execute reproducibly.** Prefer the bundled standard-library scripts for their matching method. Use local, bounded inputs; record script path, version, command, hash, formula, input refs, assumptions, and rounding. JSON/CSV/XLSX output is transient unless the user explicitly requests a registered derived export.
5. **Reconcile.** Detect double counting and denominator drift. Keep top-down and bottom-up results separate, report their midpoint-relative gap, and record `unresolved_reconciliation` when the difference is material. Never average incompatible methods to hide the conflict.
6. **Stress uncertainty.** Use at least two genuinely different scenarios for scenario-based modules, state invalidation conditions, and expose sensitivity or switching values. Do not assign scenario probabilities without a separately validated probabilistic model.
7. **Obtain decisions.** Ask the user to confirm every material method, assumption, scenario, reconciliation disposition, and proposed published result. A method or calculation change after approval creates a new artifact version and makes dependent synthesis, baseline, and reports stale.
8. **Promote results.** Put every value intended for synthesis or Reporting in `published_results` with calculation, scenario, finding, assumption, unit, denominator, base-year, qualifier, and optional export refs. A JSON/CSV-only value is not reportable.
9. **Validate and return.** Run `scripts/validate_market_analysis.py`, record its summary, and return the stage delta. In standalone mode write only the owned artifact and return `global_state_updated: false` with `reconciliation_required: true`.

Complete analysis when every selected module has a validated result or explicit gap, all lineage resolves, material choices have approval evidence, unresolved reconciliation and limitations remain visible, and every downstream value is promoted to `published_results`.

## Artifact and export authority

`market-analysis.yaml` is authored, `Working`, and supporting. It is authoritative within this stage only for recorded methods, assumptions, calculations, scenarios, and published results; the Research Brief retains scope authority and the Findings Register retains evidence authority.

Persist a requested JSON/CSV/XLSX export only as `creation_mode: derived`, `semantic_authority: none`, with path, schema, hash, provenance, and a reference from this artifact. An export can feed a chart or audit but cannot be the only semantic support of a synthesis or report block. This stage never writes workflow state or the artifact index.

When `requested-market-analysis-derived-export-is-xlsx`, delegate only workbook mechanics to `q-tool-spreadsheet` through one `spreadsheet_request` based on exact approved calculation and published-result refs. Market Analysis still owns every formula, assumption, value, qualifier, and export mapping. If the optional tool is absent, `persist-the-approved-json-or-csv-export-or-report-the-xlsx-capability-gap-without-changing-results`.

Keep authorized project-local custom-method code as `creation_mode: authored`, `semantic_authority: none`, linked from its calculation with the lineage required below. It is reproducibility support, not a second semantic artifact or a downstream evidence source.

## Custom method gate

When no bundled method fits, create project-local code only within the authorized project path. Record why bundled methods do not apply, code path, hash, exact input refs, reproducible command, tests or verification, limitations, review status, and approval for material changes. Do not present it as skill-validated or modify this package automatically; reusable promotion requires a separate `q-maint-ai-workflow` task.

## Bundled CLIs

All scripts are deterministic, standard-library Python, bounded, local-only, and make no network, model, database, or image call:

```bash
python3 scripts/calculate_market_sizing.py --help
python3 scripts/forecast_sensitivity.py --help
python3 scripts/check_unit_consistency.py --help
python3 scripts/calculate_concentration.py --help
python3 scripts/validate_competitor_matrix.py --help
python3 scripts/validate_market_analysis.py --help
```

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Analysis invents evidence | A calculation cites a URL or number absent from the Findings Register. | Return to `q-research-investigate` or record an evidence gap; calculate only from registered findings and approved assumptions. |
| 2 | A derived export becomes truth | Reporting cites a JSON/CSV row that was never promoted into `published_results`. | Keep the export `derived/none` and promote the qualified result into the authored artifact. |
| 3 | Hidden denominator or double count | Revenue at two value-chain levels or overlapping segments are added. | Normalize the measurement contract, require disjoint coverage, and block or reconcile incompatible inputs. |
| 4 | Scenario certainty | TAM/SAM/SOM, a forecast, HHI, or CRn is presented as a guaranteed outcome or legal conclusion. | Preserve assumptions, ranges, invalidation conditions, and the descriptive/non-advisory boundary. |
| 5 | Embedded fieldwork | The stage recruits, contacts, surveys, interviews, stores PII, or processes raw responses. | Return a capability gap; interpret only already-published aggregate evidence registered by Investigation. |
| 6 | Silent custom code | A one-off script produces a result without hash, command, tests, limitations, review, or approval. | Apply the custom-method lineage gate or leave the module unresolved. |
| 7 | Cross-owner rewrite | The stage changes the brief, findings, synthesis, report source, workflow state, or artifact index. | Return typed deltas and stale refs to their owners; write only `market-analysis.yaml`, authorized exports, and approved project-local custom-method code. |

## Completion

Return a valid `stage_result` naming the exact brief and findings inputs, market-analysis version, selected modules, validated published result IDs, unresolved reconciliation, derived exports, project-local custom-method code, approvals, stale downstream artifacts, blockers, limitations, and one next action.
