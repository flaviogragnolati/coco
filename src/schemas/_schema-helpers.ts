import { z } from "zod";

/**
 * Normalizes a Prisma `Decimal` (or a number) into the string shape tRPC
 * `.output()` contracts expose. Serialization concern, not a CRUD one — it is
 * consumed by admin and non-admin schemas alike.
 */
export const decimalOutputSchema = z.preprocess((value) => {
	if (value === null || value === undefined) return value;
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (
		typeof value === "object" &&
		"toString" in value &&
		typeof value.toString === "function"
	) {
		return value.toString();
	}
	return value;
}, z.string());
