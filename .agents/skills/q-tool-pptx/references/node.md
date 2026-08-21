# Node backend

Load this reference only after routing selects Node.

## Supported environment

```bash
cd scripts/node
npm install
node pptx-tool.mjs doctor
```

The dependency owner is `scripts/node/package.json`. The adapter is ESM, imports builtins with `node:` specifiers, and resolves input paths from the caller's working directory. Node 20 or newer is the supported runtime. Rendering additionally needs LibreOffice (`soffice`) and Poppler (`pdftoppm`) on the PATH.

## Library roles

| Library/tool | Use it for | Do not assume |
|---|---|---|
| jszip | opening the package, listing parts, extracting media, feeding XML to the parser | OOXML semantics — it sees bytes, not slides |
| fast-xml-parser | parsing slide/notes/rels XML (`preserveOrder` for text extraction), well-formedness validation | schema-level OOXML validation or faithful re-serialization for editing |
| LibreOffice + Poppler | rendering slides to images | font-faithful output for fonts not installed locally |

The read-side pairing (JSZip + fast-xml-parser) is deliberately read-only. Rewriting slide XML from a JavaScript object round-trip is how packages get corrupted; structural and text edits route to Python, which works on the modeled object tree.

## Creation boundary

Node does not provide a creation route in this version. The current PptxGenJS dependency tree failed the package vulnerability gate because its image parser had no corrected release available during integration. Route programmatic creation to the Python backend; never install or add an undeclared Node package during a skill run.

## Reading decks in Node

- Slide order comes from `ppt/presentation.xml` (`<p:sldIdLst>`) resolved through `ppt/_rels/presentation.xml.rels` — never from sorting part filenames; `slide10.xml` sorts before `slide2.xml` and slides can be reordered without renaming parts.
- Text extraction with `preserveOrder` keeps content-stream order, which is the package's z-order, not necessarily the visual reading order; say so when order matters.
- A slide's notes part hangs off the slide's own `_rels` file with a `notesSlide` relationship type; notes bodies also contain the slide-number placeholder, which the adapter filters out of extracted notes.
- Group shapes nest arbitrarily; the text walker recurses the whole element tree so grouped text is not lost.
- Chart and SmartArt text lives in separate parts (`ppt/charts/…`, `ppt/diagrams/…`) and is not part of the slide's text tree; report that boundary when completeness matters.

## Node pitfalls

- Node cannot open and faithfully rewrite an existing deck. Route template fills to Python `replace-text`.
- `fast-xml-parser` with default options collapses repeated elements and strips ordering; text extraction must use `preserveOrder: true` or paragraphs interleave wrongly.
- Attribute access depends on the configured prefix (`@_`); a mismatch silently reads `undefined` and drops relationships.
- JSZip returns whatever encoding you ask for; request `nodebuffer` for binary parts and `string` only for XML.
- A Node or package failure is a runtime failure, not deck corruption; route to Python before committing any output when the operation remains semantics-preserving.
- Large decks load fully into memory in JSZip; very large media-heavy inputs may need the Python path.
- `render` shells out to LibreOffice and Poppler; treat their absence as exit-code-4 environment gaps, not as adapter bugs.
