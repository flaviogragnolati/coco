---
name: q-consult-session
description: "Prepare and record a Quasar engagement session with traceable evidence: kickoff, interview, workshop, training, committee, or acceptance session. Use when asked to register minutes, capture who said what, record decisions and actions, or turn session attachments into classified evidence. It never diagnoses the current state or designs an intervention. Part of the Quasar AI delivery skills."
---

# Engagement session

Read `q-core-contract` for consulting evidence, confidentiality, and stage-result rules and `q-core-identity` for the `minutes` document kind and editorial structure. If either is missing, stop and install both with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-core-identity`.

Prepare and register one session. This skill records what happened; it never diagnoses findings, selects a remedy, changes a commitment, or records client acceptance without the client's attributable disposition.

## Output

Author `docs/consulting-workflow/records/<YYYY-MM-DD>-<slug>.md` as an `engagement-record`: authored, supporting for `engagement-evidence`, `Working`, and classified. Use `engagement-record-frontmatter.schema.yaml` and the `minutes` skeleton from `q-core-identity`. Include:

- purpose, agenda, time, participants, roles, and classification;
- attributable verbatim statements clearly distinguished from marked paraphrases;
- decisions and actions with stable IDs, owners, and user-supplied or approved dates;
- evidence or attachments discussed, their exact locators, and limitations;
- open questions, attribution gaps, and required confirmations.

Add each evidence item the session creates to the current stage's evidence register using `q-core-contract/references/evidence-entry.schema.yaml`; return the new unique `EVD-nnn` entries in `references_added`. For `restricted` material persist only its locator and a redacted summary, as the contract requires. Keep raw scratch notes transient.

## Procedure

1. Confirm session kind, purpose, participants, desired agenda, information classification, and whether recording or attribution consent exists. Never invent a participant, quote, decision, or action.
2. Prepare an agenda when the session is upcoming. When registering a past or live session, separate direct notes, supplied artifacts, verbatim language, paraphrase, and agent inference before drafting.
3. Extract authorized attachments through the optional mechanics below. Register the attachment locator and the extraction separately; never index a client-owned original.
4. Draft the record with the selected identity skeleton. Ask the user to confirm verbatim attribution, decisions, actions, and classification before treating them as recorded.
5. Allocate new run-wide evidence IDs, update only the current stage's evidence register, and return an exact delta. Route diagnostic hypotheses to `q-consult-current-state`; route intervention, governance, or operating-model options to `q-consult-intervention`; route a commitment deviation to `q-consult-workflow` change control.

Complete when the session record identifies its evidence and classification, every quote is marked verbatim or paraphrase, every decision/action has an accountable source, all new EVD IDs are unique in the run, and every diagnostic or design item names its owning route.

## Attachment mechanics

When `client-evidence-arrives-as-pdf-and-needs-verified-extraction` and `q-tool-pdf` is installed, pass one `pdf_request` with exact path, pages, extraction intent, authorized output, and `overwrite: false`; register the extraction as derived. If it is absent, `continue-with-manually-supplied-excerpts-and-record-the-extraction-gap`.

When `client-evidence-arrives-as-docx-and-needs-verified-extraction` and `q-tool-document` is installed, pass one `document_request` with the same exact boundaries and provenance requirements. If it is absent, `continue-with-manually-supplied-excerpts-and-record-the-docx-extraction-gap`.

## Boundaries

This skill records evidence; it never diagnoses a process or finding and never designs an intervention. “Map the process from these interviews” belongs to `q-consult-current-state`; “choose the future operating model” belongs to `q-consult-intervention`. A client disposition belongs to `q-consult-acceptance`, even when this skill records the meeting where it was stated.

## Stage result

Return a valid `stage_result`: the engagement record and current-stage evidence-register update with exact paths and source refs; new EVD entries in `references_added`; confirmed decisions/actions in their matching delta fields; attribution, consent, or access gaps in `blockers` or `required_user_actions`; and the owning consulting stage as `next_recommended_action`. In standalone mode persist the sidecar beside the engagement record with `global_state_updated: false` and `reconciliation_required: true`; never write workflow state or the artifact index.
