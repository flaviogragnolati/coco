import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";

/**
 * What a lifecycle command actually did, as codes and numbers. Only the commands
 * whose outcome the admin's own input decides return one — everywhere else the
 * declared effect disclosure *is* the outcome, because a successful pure-ladder
 * command performed exactly the cascade it announced.
 *
 * Deliberately free of Spanish: the rendering lives in the client catalog next to
 * every other label in the admin, so the server never owns copy.
 */
export const appliedEffectSchema = z.object({
	code: z.string().min(1),
	count: z.number().int().nonnegative().nullable(),
	/** Decimal string, never a float — quantities are `Decimal(18,4)`. */
	quantity: decimalOutputSchema.nullable(),
});

export const appliedEffectsSchema = z.array(appliedEffectSchema);
