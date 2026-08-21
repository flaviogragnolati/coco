# Web capture standalone contract

Use this contract after a user manually invokes `$q-tool-web-markdown`. The user or downstream caller owns the reason for capture, source interpretation, citation, and any adoption. `q-tool-web-markdown` owns only browser-backed capture mechanics, public-network policy, bounded extraction, validation, optional atomic persistence, and operation provenance.

## Request

Construct one `web_capture_request` conforming to [`web-capture-request.schema.yaml`](web-capture-request.schema.yaml). Name one exact public HTTP(S) URL, owner, transient or working persistence, bounded limits, sensitivity flags without secrets, and an authorized root plus output path only when persistence is requested. Keep overwrite false unless a separate approval reference authorizes replacement.

The request cannot contain headers, cookies, credentials, browser flags, profiles, proxy configuration, arbitrary environment, batch inputs, or a non-HTTP(S) source. Complete it when the URL, owner, bounds, and every possible write are explicit.

## Result

Return one `web_capture_result` conforming to [`web-capture-result.schema.yaml`](web-capture-result.schema.yaml). Preserve the request ID and owner; record `generator_skill: q-tool-web-markdown`, redacted source locators, exact runtime and browser identity, effective egress policy, applied limits, structural and content-quality validation, optional output hash, and the distinction among `captured`, `blocked`, and `failed`.

Keep inline Markdown only in a transient result. A persisted output is derived with no semantic authority and cannot replace the original URL, a citation, or an owning Findings Register. If persistence occurs, include the standalone `stage_result`; the caller remains responsible for any artifact-index reconciliation.
