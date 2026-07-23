import { z } from "zod";

const optionalTrimmedText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

export const adminOptionsInputBase = z.object({
	search: optionalTrimmedText,
	take: z.number().int().min(1).max(100).default(50),
});

export const adminOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	deleted: z.boolean(),
});

export const adminOptionsOutputSchema = z.array(adminOptionSchema);
