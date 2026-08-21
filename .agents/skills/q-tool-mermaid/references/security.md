# Security

Run locally with Mermaid `securityLevel: strict`. Do not execute or preserve unreviewed click callbacks, JavaScript URLs, iframe/object/embed/script markup, external image loads, or initialization directives that weaken security.

Treat diagram text and Markdown as untrusted data. Do not send it to a remote renderer. Do not disclose secrets or confidential topology through logs, filenames, or external links. Keep outputs inside the authorized project roots and refuse symlink overwrite.

An explicit network request requires separate user authorization and a future registered backend. This runtime has no remote backend.
