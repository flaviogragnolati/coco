# Trackers — detection, config, and per-platform adapters

Read this when publishing tickets, or when `<delivery>/tracker.yml` is missing.

## Detection ladder

Run top to bottom; the first hit wins.

1. **`<delivery>/tracker.yml`** — obey it and stop. Nothing below runs.
2. **A documented workflow** — `docs/agents/issue-tracker.md`, or a `gh` / `linear` / `jira` section in `AGENTS.md` / `CLAUDE.md`. Follow it, including its triage-label vocabulary.
3. **Tooling you can actually reach in this session** — an MCP server for Linear, Jira, or GitHub; `gh auth status` returning authenticated. A tracker you cannot write to is not a candidate, however prominently the project names it.
4. **`git remote -v`** — a GitHub or GitLab remote makes that platform the natural default, but only when step 3 confirms you can write to it.
5. **Nothing matched** → `local`.

Ask the user exactly once, with a recommended default, when two candidates survive or when the platform is reachable but the target project / team / repo is ambiguous. Then write `tracker.yml` — the question belongs to the project, not to the run.

## `tracker.yml`

```yaml
schema_version: 1
provider: local | github | linear | jira | <other>
project: <repo | team key | project key>      # null for local
access: local | gh-cli | mcp | api
labels:
  ready: ready-for-agent
edges: native | sub-issue | text              # how "Blocked by" is expressed
parent: native | text                         # how the parent link is expressed
status_field: <field name | null>             # the tracker's own status field
status_map:                                   # canonical → tracker value
  ready: <value>
  in-progress: <value>
  done: <value>
  blocked: <value | null>                     # null → lives only in the local index (Blocked by edges)
  superseded: <value | null>                  # null → tracker ticket is closed with a superseded comment
```

`edges`, `parent`, `status_field`, and `status_map` describe how this provider expresses the canonical ticket body. `blocked` and `superseded` are canonical states that many trackers cannot represent natively: when their mapping is `null`, they live only in the local `index.md` — `blocked` is derived from open `Blocked by` edges, and a `superseded` ticket is closed on the tracker with a comment naming its replacement. Fill them from the adapter below on the first run; later runs read them instead of re-deciding. Keep the file this small — a config that grows past what it is asked every run is a config that rots.

## Adapters

The ticket body is identical everywhere. Only the shape of edges, parent, and status changes.

### `local`

- One file per ticket at `<delivery>/tickets/{feature-slug}/NN-{slug}.md`, numbered from `01` in dependency order. One ticket per file, never a combined file.
- **Edges:** text. `**Blocked by:** {slug}-01, {slug}-03`.
- **Parent:** text — a repo-relative path, with the section when the parent is a plan.
- **Status:** the ticket's own `**Status:**` line; there is no second field to keep in sync.
- **Board:** `index.md`.
- Commit the files. A work queue that exists on one machine is not a queue.

### `github`

- Publish with `gh issue create` (or the GitHub MCP when one is connected).
- **Body:** the canonical sections as `##` headings; acceptance criteria as a task list so GitHub renders progress on the issue.
- **Edges:** GitHub has sub-issues (parent → child), not blocking. Express blocking as a `## Blocked by` section referencing `#N`, and reserve sub-issues for a genuine parent → child link. Faking a blocking edge with a sub-issue makes the hierarchy lie.
- **Parent:** sub-issue relation to the parent issue when the source was one; otherwise a link in the body.
- **Status:** an issue is open or closed. `in-progress` maps to open plus an assignee, or to a project-board column when the repo uses one — read the repo's convention rather than inventing a column.
- **Label:** `ready-for-agent`; create it if the repo doesn't have it.
- Record `#N` in the index.

### `linear`

- Publish through the Linear MCP when connected; otherwise the API.
- **Edges:** native `blocks` / `blocked by` relations. Use them — they drive Linear's own ready views, which is the whole reason the frontier is worth expressing natively.
- **Parent:** native sub-issue relation.
- **Status:** workflow states. Read the team's actual states before mapping; the common shape is `ready → Todo` (or `Backlog` when the team gates triage), `in-progress → In Progress`, `done → Done`.
- **Label:** `ready-for-agent`.
- Record the identifier (`ENG-241`) in the index.

### `jira`

- Publish through the Jira MCP when connected; otherwise the REST API.
- **Edges:** native issue links of type `Blocks` / `is blocked by`.
- **Parent:** the parent field, or `Epic Link` on older company-managed projects. Confirm which the project uses before writing — they are not interchangeable.
- **Status:** transitions, not free-text writes. Read the project's available transitions and map onto them; a status name that doesn't exist in the workflow fails quietly on some configurations, so verify the transition landed.
- **Issue type:** `Story` for a slice, `Task` for enabling work, `Sub-task` only where the project genuinely uses them.
- **Label:** `ready-for-agent`.
- Record the key (`ABC-123`) in the index.

### `other` or unreachable

When the project names a tracker you have no way to write to, publish `local` and say plainly that the tickets exist and the sync doesn't. Offer the set in a form the user can paste or import. Tickets the user can act on beat a blocked run every time.

## Rules that hold for every adapter

- **Dependency order.** Blockers first, so each edge references an identifier that already exists.
- **One ticket, one issue.** Never batch several slices into one issue to save calls.
- **The parent issue is read-only.** Never close, reword, or re-scope it.
- **Record every returned identifier** in `index.md` before finishing.
- **On a re-run, match by the local ID** recorded in the index — never by title, which drifts the moment someone edits it on the tracker.
