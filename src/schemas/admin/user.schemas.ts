import { z } from "zod";

import {
	addressEmbeddedDetailSchema,
	addressEmbeddedInputSchema,
	userIdSchema,
} from "~/schemas/admin/address.schemas";

const requiredText = (message: string) => z.string().trim().min(1, message);

const requiredEmail = z
	.string()
	.trim()
	.min(1, "El email es obligatorio")
	.pipe(z.string().email("Ingresá un email válido"));

const optionalUrl = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(z.string().url("Ingresá una URL válida").optional());

export const userRoleSchema = z.enum(["user", "admin", "superadmin"]);

export const userCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	email: requiredEmail,
	emailVerified: z.boolean().default(false),
	image: optionalUrl,
	role: userRoleSchema.default("user"),
	active: z.boolean().default(true),
	addresses: z.array(addressEmbeddedInputSchema).default([]),
});

export const userUpdateInputSchema = userCreateInputSchema.extend({
	id: userIdSchema,
});

export const userDeleteInputSchema = z.object({
	id: userIdSchema,
});

export const userListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const userListItemSchema = z.object({
	id: userIdSchema,
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
	role: userRoleSchema,
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
	addressCount: z.number().int().nonnegative(),
});

export const userDetailSchema = z.object({
	id: userIdSchema,
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
	role: userRoleSchema,
	active: z.boolean(),
	deleted: z.boolean(),
	addresses: z.array(addressEmbeddedDetailSchema),
});

export const userStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const userListOutputSchema = z.array(userListItemSchema);
