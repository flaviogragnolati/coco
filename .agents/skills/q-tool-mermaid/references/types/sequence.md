# Sequence diagram

Use `sequenceDiagram` when order, responsibility, request/response, async messages, retries, or alternate outcomes matter. Name participants by role, keep message labels action-oriented, and use `alt`, `opt`, `loop`, or `par` only when the source supports that control structure.

Do not infer calls, protocols, responses, or error behavior.

```mermaid
sequenceDiagram
    accTitle: Session lookup
    accDescr: A client asks the API for a session and the API reads the session store.
    actor client as Client
    participant api as API
    participant store as Session store
    client->>api: Get session
    api->>store: Read token
    store-->>api: Session result
    api-->>client: Response
```
