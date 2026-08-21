# Token format and validation

Load this whenever the stage emits tokens, themes, modes, or resolvers. It governs the shape of `05b-design-tokens.json` and the honesty of any validation claim.

## What the token set is

`05b-design-tokens.json` is the only place token values live. Use the Design Tokens Community Group (DTCG) JSON format:

- a token is an object carrying `$value` and `$type`, with optional `$description` and `$extensions`;
- a group is any object without `$value`, and it may set a `$type` its descendants inherit;
- an alias is a reference to another token written as `{group.token}`;
- `$`-prefixed keys are format keywords; every other key is a token or group name.

Record the exact format target — the specification version or draft date the project adopts — inside the file's own metadata and in the specification. A token set without a declared target cannot be checked meaningfully.

## Three token tiers

Keep the tiers separated in the file structure, because collapsing them is what makes a token set unmaintainable:

| Tier | Holds | Rule |
|---|---|---|
| Primitive | Raw values: the ramp, the scale, the family | Named by what it is, never by where it is used. No primitive is consumed directly by a component. |
| Semantic | Aliases to primitives, named by role | The only tier features and components should reference. Themes and modes vary here. |
| Component | Aliases to semantic tokens for one component's needs | Add only when a component genuinely needs a value the semantic tier cannot express. |

An alias chain that skips the semantic tier or a component token that hard-codes a raw value both defeat theming. Fix the taxonomy rather than adding an exception.

## Themes and modes

Add a theme or mode only when the product confirms it — light and dark, density, brand variants, platform variants. For each one:

- vary semantic tokens, never primitives;
- keep every context structurally complete, so no consumer resolves to a missing token;
- check each material context, not only the base set;
- prefer the adopted format's own resolver or context mechanism, and record its contract in the specification when the format the project adopts cannot express it;
- avoid legacy mode extensions unless an existing consumer requires them, and record that requirement when it does.

## Running the check

Terrazzo CLI (`@terrazzo/cli`, invoked as `tz check`) is the recommended default validator when the project runs Node.js and the dependency is appropriate. It is a recommendation, not a package requirement.

`q-plan-tech-foundation` confirms and records the package, its exact version, the real project command, the observed format compatibility, any accepted extension or tolerance, and the update policy. This stage uses what the project confirmed. Run it against the persisted file with the project's own package manager, for example:

```text
pnpm exec tz check docs/development-workflow/experience/05b-design-tokens.json
```

Never install, download, or upgrade tooling to make a check pass, and never validate an extracted or reconstructed copy of the tokens instead of the persisted artifact.

## What a passing check means

A successful run means the file parsed, its structure and types satisfied the pinned tool's rules, its aliases resolved, and any configured lint passed. State exactly that.

It does not mean the file conforms to a normative published schema — the format has no official normative JSON Schema — and it does not demonstrate interoperability with every downstream consumer. A tool may accept legacy compatibility forms and extended types that a stricter consumer rejects. When strictness matters, record the additional local rules the project enforces and the known differences it tolerates.

Never write "validated against the official schema". Write what ran, at which version, with which result.

## When the check cannot run

`SKILL.md` owns the two outcomes: an unavailable validator warns with a recorded gap, and missing confirmed values block. One trap belongs here — do not invent values to make the file checkable. A token set that parses because it was filled with plausible numbers is worse than an unverified one, because the gap is no longer visible to anyone downstream.
