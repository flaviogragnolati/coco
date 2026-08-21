# State diagram

Use `stateDiagram-v2` for approved states, transitions, guards, and terminal conditions. State names are domain semantics: preserve them exactly and do not convert activities into new states without owner approval.

```mermaid
stateDiagram-v2
    accTitle: Review lifecycle
    accDescr: A draft enters review and is either accepted or returned to draft.
    [*] --> Draft
    Draft --> Review: submit
    Review --> Accepted: approve
    Review --> Draft: request changes
    Accepted --> [*]
```
