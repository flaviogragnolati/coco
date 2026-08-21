# Troubleshooting

Use the exact parser or renderer diagnostic before changing source.

| Symptom | Safe response |
|---|---|
| Markdown fences were saved into `.mmd` | Strip only the outer Mermaid fence and validate again. |
| `graph` portability warning | Normalize to `flowchart` when meaning and direction are unchanged. |
| Reserved `end` token used as a node label | Quote or rename the label without changing the represented concept. |
| Unclosed `subgraph`, `alt`, `loop`, or `rect` | Add the missing `end` only when nesting is unambiguous. |
| HTML, click action, or external URL rejected | Remove it or return for explicit security review; do not weaken `securityLevel`. |
| Pretty backend rejects the type | Fall back to canonical `mmdc` when the requested format permits it, otherwise report a capability gap. |
| Browser executable missing | Set `PUPPETEER_EXECUTABLE_PATH` to an authorized local Chromium/Chrome installation or install runtime prerequisites separately. |
| Dense or clipped render | Simplify labels, split the view, change direction, or use a channel profile; preserve meaning. |

Never repair cardinality, component ownership, message order, protocols, trust boundaries, states, dates, or commitments without the semantic owner.
