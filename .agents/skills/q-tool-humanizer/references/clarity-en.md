# English clarity reference

Load this reference only for English `improve` work, or for a `rewrite` that explicitly includes clarity and concision. Apply each principle to the supplied meaning; do not use the reference to add facts, simplify away uncertainty, or flatten a deliberate authorial voice.

These principles are a compact, modern Quasar adaptation of public-domain composition ideas associated with William Strunk's early *The Elements of Style*, supplemented by original examples.

## C1 active-voice

Make the actor and action visible when they matter. Convert avoidable nominalizations into verbs. Keep passive voice when the actor is unknown, irrelevant, deliberately withheld, or less important than the affected object.

### Signals

- `was performed by`, `is carried out by`, `will be reviewed by` when the actor should lead;
- `make an assessment of`, `conduct an implementation of`, `provide notification of`;
- empty subjects such as `there was a decision to` or `it was determined that`.

### Examples

Before:

> A review of the access logs was performed by the security team on Friday.

After:

> The security team reviewed the access logs on Friday.

Before:

> The team carried out the implementation of the cache change.

After:

> The team implemented the cache change.

Keep the passive in a sentence such as `The keys were stolen overnight` when the source does not identify the thief.

## C2 positive-form

State what is true when a negative construction only makes the reader decode its opposite. Preserve negation when it defines a prohibition, contrast, exception, risk, or factual absence.

### Signals

- `did not remember` where `forgot` carries the same meaning;
- `not uncommon`, `not unlikely`, `not without`, or stacked negatives;
- a paragraph that explains a desired behavior only through prohibitions.

### Examples

Before:

> The worker does not continue when the token is absent.

After:

> The worker stops when the token is absent.

Before:

> The option is not unavailable in the enterprise plan.

After:

> The option is available in the enterprise plan.

Do not change `The service must not store passwords` to a weaker positive statement.

## C3 concrete-language

Prefer observable actors, actions, objects, and criteria over generic abstractions. Concrete does not mean more detailed than the evidence.

### Signals

- `an issue occurred`, `the situation changed`, `performance was affected` without the known event;
- abstract noun chains that hide the action;
- adjectives such as `better`, `efficient`, or `significant` without the criterion already present in the source.

### Examples

Before:

> A performance issue affected the import process, which took 14 minutes.

After:

> The import took 14 minutes.

Before:

> The configuration adjustment changed the behavior of the retry limit from three attempts to five.

After:

> The configuration raised the retry limit from three attempts to five.

If the source says only `an issue occurred`, keep the uncertainty and name the missing observation rather than guessing the failure.

## C4 omit-needless-words

Remove words that add neither meaning nor a necessary relationship. Preserve qualifications that express real uncertainty, scope, frequency, or risk.

### Signals

- `in order to`, `due to the fact that`, `at this point in time`, `in the event that`;
- `has the ability to`, `it is important to note that`, `the reason is because`;
- duplicated qualifiers such as `might potentially`, `completely and totally`, `each and every`;
- stacked hedges that do not represent distinct uncertainty.

### Examples

Before:

> In order to start the job, the operator must first enter the token at this point in time.

After:

> To start the job, the operator must enter the token now.

Before:

> The update might potentially delay some requests by up to two seconds.

After:

> The update might delay some requests by up to two seconds.

Keep `might`, `some`, and `up to` in the second revision because each limits a different part of the claim.

## C5 parallel-structure

Give coordinate ideas matching grammatical forms so the reader can see their relationship.

### Signals

- a list that mixes nouns, infinitives, clauses, and commands without purpose;
- paired alternatives with mismatched structure;
- headings or acceptance criteria that change form unpredictably.

### Examples

Before:

> The role requires reviewing incidents, clear reports, and to train new analysts.

After:

> The role requires reviewing incidents, writing clear reports, and training new analysts.

Before:

> The migration can either run tonight or the team can postpone it until Monday.

After:

> The team can run the migration tonight or postpone it until Monday.

Do not force parallelism across ideas that are not coordinate.

## C6 cohesion-and-order

Keep related words close and order clauses so references resolve without backtracking. Place the subject near its main verb unless a deliberate interruption is necessary.

### Signals

- a modifier far from the word it modifies;
- a long parenthetical phrase between subject and verb;
- `this`, `that`, `it`, or `they` with more than one plausible referent;
- chronology or cause presented after its result without a clear reason.

### Examples

Before:

> After the audit, the team archived the records that were older than a year, and no other records.

After:

> After the audit, the team archived only records older than a year.

Before:

> After the cache expired, the API returned an empty object; this empty response surprised the client.

After:

> The cache expired, and the API returned an empty object. That response surprised the client.

The revision resolves `which` without adding a causal claim beyond the stated sequence.

## C7 paragraph-unit

Give each paragraph one controlling topic. Open with the point or context the reader needs, develop it with related evidence, and move unrelated material elsewhere.

### Signals

- one paragraph covers several decisions with no visible relationship;
- the topic appears only in the final sentence;
- examples or caveats precede the claim they qualify;
- a one-sentence paragraph is repeated for visual rhythm rather than emphasis.

### Example

Before:

> The release changes authentication. The support team answers tickets in two regions. Tokens now expire after 30 minutes, and refresh tokens rotate after use. The release also changes the login page.

After:

> The release changes authentication. Tokens now expire after 30 minutes, refresh tokens rotate after use, and the login page has changed.
>
> The support team answers tickets in two regions.

The facts remain the same; the paragraphs now have separate subjects.

## C8 emphatic-placement

Place the most consequential supported point where the sentence naturally emphasizes it, often at the end. Do not manufacture drama or bury required conditions.

### Signals

- a sentence ends with housekeeping after presenting the decision;
- the key contrast sits inside a parenthesis;
- a long lead delays the actor and action without building necessary context.

### Examples

Before:

> The team chose the managed queue, after comparing three options, because it supports regional failover.

After:

> After comparing three options, the team chose the managed queue because it supports regional failover.

Before:

> The migration is scheduled for Friday, and the important condition is that the restore test must pass first.

After:

> The migration is scheduled for Friday only if the restore test passes first.

The condition stays explicit and gains appropriate emphasis.

## C9 sentence-variety

Vary sentence length and structure when repetition hides relationships or creates a mechanical cadence. Variation serves meaning; it is not a quota.

### Signals

- many adjacent sentences begin with the same subject and verb pattern;
- every sentence has similar length and weight;
- several short statements obscure cause, contrast, or sequence;
- one very long sentence contains relationships that should be explicit.

### Examples

Before:

> The worker reads the message. The worker validates the token. The worker stores the result. The worker acknowledges the message.

After:

> The worker reads the message, validates the token, and stores the result before acknowledging the message.

Before:

> The test passed, the deployment finished, users still saw stale data because one cache node did not restart, and the team removed that node from rotation before traffic returned to normal.

After:

> The test passed and the deployment finished, but users still saw stale data because one cache node did not restart. The team removed that node from rotation, and traffic returned to normal.

## Reference completion check

Before returning an English clarity revision, confirm that:

- every edit maps to one `C` family;
- active voice did not invent an actor;
- positive form preserved prohibitions and material contrasts;
- concrete language came from supplied evidence;
- concision retained all meaningful qualifiers;
- paragraph and sentence changes kept facts, chronology, causality, and emphasis honest;
- no clarity edit was reported again as an `H` finding.
