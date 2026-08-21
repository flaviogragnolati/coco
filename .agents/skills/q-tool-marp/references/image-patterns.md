# Local image patterns

Load this reference only when the approved deck uses images.

- Resolve each Markdown image and CSS `url(...)` to a canonical local file inside an authorized asset root.
- Prefer relative references in the delivered bundle, then record the canonical path and hash used during rendering.
- Preserve aspect ratio. Use intentional crop or contain behavior and verify the rendered result rather than relying on source dimensions.
- Keep visible attribution near third-party evidence and fuller provenance in notes when required.
- Reject HTTP(S), protocol-relative, data, file, and other unapproved URI schemes. Do not fetch or embed a remote resource during rendering.
- The current local runtime accepts raster Markdown assets and raster or font theme assets. It rejects SVG, HTML, and other active or unknown formats because nested references or executable content could bypass the offline boundary; rasterize them through a separately approved process before delegation.

Complete the image branch when every asset is local, authorized, hashed, attributable, and visually inspected in each requested render.
