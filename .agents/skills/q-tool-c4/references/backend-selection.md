# C4 backend selection

Read this reference whenever backend, layout, validation, or rendering is material. Detect local candidates with `python3 scripts/detect_c4_backends.py --json`, then validate the actual source before reporting success.

## Capability matrix

| Backend | Select when | Source authority | Validation and layout limits |
|---|---|---|---|
| Mermaid C4 or an appropriate Mermaid notation for Code | One or a few views, repository-native text, and the local Quasar Mermaid runtime satisfy the request | Authored, supporting `visual-representation` | Mermaid C4 is experimental and supports context, container, component, dynamic, and deployment. Styling is limited. Delegate all Mermaid encoding/rendering to `q-tool-mermaid`. |
| Structurizr DSL | One model must feed multiple synchronized views, filters, dynamic/deployment views, themes, or model queries | `workspace.dsl` is authored, supporting `visual-model` | Use stable view keys. `autoLayout` provides `tb`, `bt`, `lr`, or `rl` plus rank/node separation; it is not free-form positioning. Validate/export only with a detected local CLI. |
| C4-PlantUML | Directional layout hints, tags, sprites, legends, or mature PlantUML layout controls are required | Authored, supporting `visual-representation` | Prefer `!include <C4/...>` from the local PlantUML standard library. Validate and render with the detected local runtime; do not fetch remote includes under offline policy. |

The [Mermaid C4 reference](https://mermaid.js.org/syntax/c4) marks C4 syntax experimental. The [Structurizr DSL language](https://docs.structurizr.com/dsl/language) defines model views and automatic layout, while its [file-type contract](https://docs.structurizr.com/workspaces/file-types) distinguishes editable DSL from compiled JSON carrying layout. [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) documents its directional layout, tags, sprites, and legend controls.

## Selection rules

1. List required views and backend features from the request.
2. Prefer Mermaid only when its supported notation and verified local runtime cover every requirement.
3. Select Structurizr for model reuse and view synchronization, not merely because one Mermaid layout is awkward.
4. Select C4-PlantUML when precise layout controls or styling semantics are required and its runtime is verified.
5. Treat D2, Graphviz, hand-drawn canvases, and generic layout engines as presentation alternatives, not C4 semantic backends. They may derive a visual from an already approved model through another tool, with no semantic authority.
6. Never install a backend or send project architecture to a public render service as an implicit fallback.

## Structurizr layout

Keep `workspace.dsl` as the editable model-and-view source. Use explicit stable view keys because generated keys can lose manual layout continuity. Automatic layout belongs in DSL. Manual layout belongs in Structurizr's compiled `workspace.json`, which is not designed for hand editing; preserve it as authored support for `visual-layout` and keep it tied to the exact DSL/model version.

If manual layout is required but no local Structurizr UI/runtime is available, return a source-only warning when allowed or block the required layout/render. Do not translate coordinates into invented DSL syntax.

## Completion matrix

| Requested outcome | Runtime unavailable | Honest result |
|---|---|---|
| Source only, unverified source allowed | Structurizr or C4-PlantUML | `completed_with_warnings`; mark syntax/render unavailable |
| Source only through Mermaid | `q-tool-mermaid` absent or its canonical runtime unavailable | Return the model map and capability gap, or select another verified backend |
| Render or compatibility proof | Any selected runtime unavailable | `blocked` for that required output |
| Existing source validation | Selected runtime unavailable | `blocked` unless the requester explicitly accepts an unverified diagnostic |
