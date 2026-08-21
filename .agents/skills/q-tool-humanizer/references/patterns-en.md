# English AI-writing pattern reference

Load this reference only for English segments handled by `detect` or `rewrite`. The families describe contextual tendencies, not banned words or proof of authorship. Require accumulation, density, or a clear rhetorical effect.

Do not use this file as a general clarity checklist. Generic wordiness and hedging belong to the `C` families in `clarity-en.md`.

## H1 inflated-significance

### What to inspect

- claims that a routine event is pivotal, historic, transformative, foundational, or an enduring legacy;
- unsupported links to a broader movement, changing landscape, cultural identity, or future direction;
- elaborate substitutes for `is`, `are`, or `has`, especially `serves as`, `stands as`, `represents`, `boasts`, or `features`;
- importance asserted in place of a concrete function or result.

Keep the language when significance is itself the sourced claim, or when a domain term such as `key` has a precise defined meaning.

### Examples

Before:

> The May release marked a pivotal moment in the platform's evolution by adding CSV export.

After:

> The May release added CSV export.

Before:

> The portal serves as the team's documentation hub and boasts six operational runbooks.

After:

> The portal is the team's documentation hub and has six operational runbooks.

The revision uses only facts already present. It does not invent why the release mattered or who considered it pivotal.

## H2 promotional-tone

### What to inspect

- `groundbreaking`, `world-class`, `cutting-edge`, `seamless`, `renowned`, `breathtaking`, `must-see`, `vibrant`, `stunning`;
- `nestled in`, `in the heart of`, `rich heritage`, `commitment to excellence`, `unmatched experience`;
- praise presented in the narrator's voice instead of attributed evaluation;
- benefits without a mechanism, comparison, or supplied evidence.

Keep evaluative language inside an exact quotation, an attributed review, or copy whose approved purpose is explicitly promotional.

### Examples

Before:

> The vibrant library offers a world-class reading experience with 80 seats and evening access until 9 p.m.

After:

> The library has 80 seats and stays open until 9 p.m.

Before:

> Our seamless onboarding flow guides customers through account setup and stands as a testament to our commitment to customer success.

After:

> The onboarding flow guides customers through account setup.

The second revision retains the stated function but drops praise that the source does not substantiate.

## H3 superficial-participles

### What to inspect

- sentence-final clauses beginning with `ensuring`, `highlighting`, `showcasing`, `reflecting`, `symbolizing`, `fostering`, `cultivating`, or `underscoring`;
- participle clauses that add an unproved result, intention, symbolism, or causal link;
- several participle clauses chained after one factual statement;
- an interpretive clause whose agent or evidence is unclear.

Keep a participle clause when it expresses a clear simultaneous action by the grammatical subject and carries supported information.

### Examples

Before:

> The client retries a failed request up to three times, ensuring uninterrupted service and showcasing the system's resilience.

After:

> The client retries a failed request up to three times.

Before:

> The sign uses blue lettering, reflecting the team's deep connection to the coast.

After:

> The sign uses blue lettering. [Gap: the source does not explain why blue was chosen.]

Do not invent an interview, designer statement, or symbolic explanation to fill the gap.

## H4 vague-attribution

### What to inspect

- `experts say`, `researchers believe`, `industry reports suggest`, `observers note`, `critics argue`, `studies show`;
- passive consensus claims such as `is widely regarded` or `is generally considered`;
- plural attribution supported by one source or no named source;
- a precise number attached to an unnamed authority.

Named, traceable attribution is not a finding merely because it uses a reporting verb.

### Examples

Before:

> Industry experts say the change reduced checkout time by 20 percent.

After:

> [Gap: name the source for the claimed 20 percent reduction.]

Before:

> Several reports describe the service as the market leader.

After:

> [Gap: identify the reports and the market definition, or remove the claim.]

Do not rewrite either sentence as an unattributed fact. The evidence owner must resolve the gap.

## H5 formulaic-structure

### What to inspect

- repeated negative parallelism: `not only X but also Y`, `not just X, but Y`, `not merely X`;
- forced triads used to sound complete rather than to represent three real items;
- false ranges such as `from security to culture` when the endpoints share no scale;
- canned `Challenges`, `Future outlook`, or `Challenges and opportunities` sections;
- repeated section openings and closings that summarize what the reader just read;
- generic positive conclusions such as `the future looks bright`, `the journey continues`, or `despite these challenges`;
- letter framing outside correspondence, including `I hope this message finds you well`.

Keep an actual three-item set, a meaningful range, an informative summary, or a letter salutation when the genre requires it.

### Examples

Before:

> The guide covers everything from authentication to team culture to quarterly budgeting.

After:

> The guide covers authentication, team culture, and quarterly budgeting.

Before:

> The project still lacks an approved migration plan. In conclusion, despite this challenge, it continues its promising journey toward innovation.

After:

> The project still lacks an approved migration plan.

If no concrete closing fact exists, remove the empty conclusion rather than invent one.

Before:

> The release is not just faster, reducing median page load time from 1.8 seconds to 1.2 seconds; it is a complete reimagining of collaboration.

After:

> The release reduces median page load time from 1.8 seconds to 1.2 seconds.

Both measurements appear in the before text. If a live source omits them, do not invent them.

## H6 ai-vocabulary

### What to inspect

Look for dense co-occurrence, not isolated use:

- `delve`, `tapestry`, `realm`, `landscape` used abstractly, `multifaceted`, `intricate`, `nuanced interplay`;
- `pivotal`, `crucial`, `vital`, `robust`, `holistic`, `comprehensive`, `transformative` without a defined criterion;
- `leverage`, `unlock`, `elevate`, `empower`, `foster`, `drive impact`, `navigate` used as generic business verbs;
- connector chains such as repeated `moreover`, `furthermore`, `additionally`, and `in today's rapidly evolving`;
- synonym cycling that renames one actor or object in every sentence to avoid ordinary repetition.

Keep the term when it is the clearest domain word, appears in quoted material, or carries a definition that a simpler word would lose.

### Examples

Before:

> Moreover, by letting teams review access changes together, the platform empowers them to navigate the evolving security landscape and unlock robust collaboration.

After:

> The platform lets teams review access changes together.

The after sentence keeps the concrete function already stated in the source.

Before:

> The operator checks the queue. The administrator then clears it. The system steward records the result.

After:

> The operator checks the queue, clears it, and records the result.

Repeat the same noun when it refers to the same actor.

## H7 format-tics

### What to inspect

- em dashes used repeatedly for ordinary commas, parentheses, or sentence breaks;
- bold applied mechanically to every label or key phrase;
- vertical lists whose items all start with an inline heading and colon but contain connected prose;
- title case in ordinary sentence-style headings;
- decorative emoji in professional prose;
- curly quotation marks treated as evidence by themselves;
- tables or thematic breaks added where prose would be easier to follow.

Typography follows the target's house style. A single em dash, curly quote, table, bold phrase, or emoji is not an authorship signal.

### Examples

Before:

> ## Deployment Risks And Next Steps

After:

> ## Deployment risks and next steps

Before:

> **Latency:** The latency improved. **Capacity:** The capacity increased.

After:

> Latency improved, and capacity increased.

Before:

> The policy applies to contractors, not employees, and that distinction is easy to miss.

After:

> The policy applies to contractors, not employees, and that distinction is easy to miss.

The unchanged example shows why punctuation or structure must have a contextual effect before it becomes a finding.

## H8 chatbot-artifacts

### What to inspect

- `Of course`, `Certainly`, `Great question`, `You're absolutely right`, `I hope this helps`;
- `Would you like me to`, `Let me know if`, `Here is the requested`, or other assistant handoff chatter pasted into content;
- `As an AI language model`, `as of my last update`, or training-cutoff disclaimers;
- visible prompts, tool markers, response labels, or instructions to the model;
- placeholders such as `[Company Name]`, `[insert source]`, or `Dear [Name]` in a supposedly finished artifact;
- an email greeting or sign-off in a document whose genre is not correspondence.

Keep collaborative phrasing in an actual conversation and keep declared template placeholders in an artifact that is still intentionally a template.

### Examples

Before:

> Great question! Here is the requested overview of the refund policy. Let me know if you want more detail. Customers may request a refund within 30 days.

After:

> Customers may request a refund within 30 days.

Before:

> Acme will deliver the report to [Client Name] on [Date].

After:

> Acme will deliver the report to [Client Name] on [Date].

For the second example, report unresolved placeholders instead of guessing the client or date.

## H9 citation-signals

### What to inspect

- a DOI, ISBN, URL, title, author, or publication that cannot be resolved in the available evidence;
- a citation whose source exists but does not support the attached claim;
- tracking such as `utm_source=chatgpt.com` or a link to a search-results page;
- model artifacts such as `turn0search0`, `oaicite`, `contentReference`, or bracketed tool placeholders;
- generic source titles, missing page locations for precise quotations, or references declared but never used.

These signals do not prove a citation is false. They trigger evidence review and never authorize a rewrite.

### Examples

Before:

> Adoption doubled in 2025. [1](https://example.org/report?utm_source=chatgpt.com)

After:

> Adoption doubled in 2025. [1](https://example.org/report?utm_source=chatgpt.com)

Detection note: `H9`, verify that the report supports the doubling claim and obtain the canonical URL from the evidence owner.

Before:

> The protocol is secure. [turn0search0]

After:

> The protocol is secure. [turn0search0]

Detection note: `H9`, unresolved tool citation; do not publish or silently remove it.

## Reference completion check

Before returning an English result, confirm that:

- every retained `H` finding depends on context rather than a watch word alone;
- generic filler is owned by `C4`, not duplicated here;
- every after example and live rewrite preserves supplied facts;
- `H4` never turns anonymous attribution into fact;
- `H9` leaves citations unchanged and names an evidence owner;
- deliberate voice, house style, quotations, templates, and domain terms are excluded when appropriate.
