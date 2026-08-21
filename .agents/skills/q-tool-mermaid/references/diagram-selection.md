# Diagram selection

Choose the smallest diagram that answers the audience's question.

| Need | Type | Avoid when |
|---|---|---|
| Process, decision, dependency | Flowchart | Order over time is the primary message. |
| Ordered messages and responsibility | Sequence | Static structure is the primary message. |
| Entities and approved cardinality | ER | The caller has not settled relationships. |
| Lifecycle and allowed transitions | State | The source describes activities rather than states. |
| Types, members, inheritance | Class | The goal is a persistence schema. |
| System context or containers (elements already fixed) | C4 | Mermaid C4 support is unavailable in the target renderer, or the request is to model or choose C4 views — route that to `q-tool-c4`. |
| Deployment or service topology | Architecture or flowchart | The source lacks approved nodes or trust boundaries. |
| Approved schedule | Gantt | Dates or sequencing are tentative or not authoritative. |

Split by audience question before increasing density. Prefer two traceable views over a single diagram that mixes lifecycle, topology, and sequence.
