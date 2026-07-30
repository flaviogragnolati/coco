import { cartGlossaryEntries } from "./data/cart";
import { catalogGlossaryEntries } from "./data/catalog";
import { crosscuttingGlossaryEntries } from "./data/crosscutting";
import { operationGlossaryEntries } from "./data/operation";
import { paymentsGlossaryEntries } from "./data/payments";
import { peopleGlossaryEntries } from "./data/people";
import { qaGlossaryEntries } from "./data/qa";
import { trackingGlossaryEntries } from "./data/tracking";
import type { GlossaryEntry } from "./glossary.types";

/**
 * The glossary content, curated by hand rather than generated.
 *
 * Generation was rejected because the expensive half of an entry — the Spanish
 * definition, the discouraged synonyms, the decision to collapse several enum
 * values into one meaning — is editorial and has no source to generate it from.
 * `prisma/schema.prisma` only supplies the skeleton, and `glossary.data.test.ts`
 * already holds the dataset to it: every model and every enum value must appear
 * exactly once, and every occurrence must resolve to a real table and column.
 * A missing entry is a failing test, not a silent gap — which is the guarantee
 * codegen would have bought, without the build step.
 *
 * Labels are imported from the existing `*LabelMap`s instead of copied, so the
 * glossary cannot drift from what the admin actually reads on screen. They are
 * written by hand only where no map covers the enum.
 *
 * Documented here in lieu of an ADR, following `admin-crud/status-presets.ts`:
 * migrating to codegen later is a contained change.
 *
 * The concatenation order mirrors `glossarySections`, which is also the render
 * order of the groups.
 */
export const glossaryEntries: GlossaryEntry[] = [
	...operationGlossaryEntries,
	...paymentsGlossaryEntries,
	...catalogGlossaryEntries,
	...cartGlossaryEntries,
	...trackingGlossaryEntries,
	...peopleGlossaryEntries,
	...qaGlossaryEntries,
	...crosscuttingGlossaryEntries,
];
