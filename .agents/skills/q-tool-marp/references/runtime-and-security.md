# Runtime and security

Load this reference before validation or rendering when paths, assets, raw HTML, or browsers are involved.

## Capability

The bundled runtime pins `@marp-team/marp-cli`. It never installs packages during execution. HTML requires that local package; PDF, standard PPTX, and PNG require both the package and a browser route proven through a temporary smoke render. `Q_TOOL_MARP_BROWSER_PATH` is a path hint, not proof.

## Path boundary

Canonicalize existing inputs with `realpath`. For new outputs, canonicalize the nearest existing parent and append the requested leaf. Require each path to remain within at least one declared root. Reject symlink escape, source/output collision, a pre-existing output without approved overwrite, and a sidecar without explicit persistence approval.

## Content boundary

Reject remote and protocol-relative Markdown/CSS resources, `@import`, remote `url(...)`, active or unknown asset formats, iframes, object/embed/script tags, config files, arbitrary engines/plugins, server/watch/preview modes, and the experimental editable-PPTX option. Accept only local raster Markdown assets and local raster or font theme assets. Raw HTML is disabled by default; the safe policy permits only the runtime's small formatting whitelist and no event handlers, URI attributes, or embedded content.

Pass `--allow-local-files` only after source, theme, and assets pass the root checks. Always pass `--no-config-file` and invoke the pinned local binary. Do not treat a zero exit code as visual validation.

## Atomic write

Render to a temporary file or directory under the destination parent. Verify every expected output is non-empty, then rename it into place. On failure, remove staging and leave the source and prior output intact. `png-title` produces one image; `png-set` must enumerate the whole numbered set in the result.

Complete runtime work when capability, path containment, content safety, atomic output, and cleanup all have inspectable evidence.
