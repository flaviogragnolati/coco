import { z } from "zod";
import { adminOptionsInputBase } from "~/schemas/admin/_options.schemas";
import {
	addressEmbeddedDetailSchema,
	addressEmbeddedInputSchema,
	userIdSchema,
} from "~/schemas/admin/address.schemas";
import { optionalUrl, requiredText } from "./_crud-schema-helpers";

const requiredEmail = z
	.string()
	.trim()
	.min(1, "El email es obligatorio")
	.pipe(z.string().email("Ingresá un email válido"));

export const userRoleSchema = z.enum(["user", "admin", "superadmin"]);

/** The signed-in admin, as the client needs them to *present* permissions. */
export const adminViewerSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	role: userRoleSchema,
});

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

export const userOptionsInputSchema = adminOptionsInputBase.extend({
	selectedValue: z.string().optional(),
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
