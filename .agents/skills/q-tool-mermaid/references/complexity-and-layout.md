# Complexity and layout

Treat density warnings as review prompts rather than universal limits. Inspect nodes, relationships, nesting, label length, and audience size together.

- Start with the primary path or boundary.
- Group only elements with one defensible relationship.
- Choose `LR` for short process chains and `TB` when wide labels or many branches would make `LR` too broad.
- Replace repeated cross-diagram detail with a stable reference, not duplicated nodes.
- Split a view when the audience must zoom or trace multiple unrelated paths to answer the stated purpose.

The bundled lint warns at conservative thresholds; the rendered artifact and caller review decide whether a split is required.
