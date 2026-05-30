import { z } from "zod";

import { userRoleSchema } from "~/schemas/admin/user.schemas";

const requiredText = (message: string) => z.string().trim().min(1, message);

const emptyStringToNull = (value: unknown) => {
	if (typeof value !== "string") return value;

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const optionalTextInputSchema = z
	.preprocess(emptyStringToNull, z.string().nullable().optional())
	.transform((value) => value ?? null);

const optionalDateInputSchema = z.preprocess((value) => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? new Date(`${trimmed}T00:00:00.000Z`) : null;
	}

	return value ?? null;
}, z.date().nullable());

export const profileSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
	role: userRoleSchema,
	document: z.string().nullable(),
	taxId: z.string().nullable(),
	dob: z.date().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const profileUpdateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	document: optionalTextInputSchema,
	taxId: optionalTextInputSchema,
	dob: optionalDateInputSchema,
});

export type Profile = z.output<typeof profileSchema>;
export type ProfileUpdateInput = z.output<typeof profileUpdateInputSchema>;
export type ProfileUpdateFormInput = z.input<typeof profileUpdateInputSchema>;
