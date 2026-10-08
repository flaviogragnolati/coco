import { z } from "zod";

export const SUPPLIER_APPLICATION_LIMITS = {
	contactName: 120,
	companyName: 160,
	email: 254,
	phone: 40,
	offering: 2000,
} as const;

const PHONE_PATTERN = /^\+?[\d\s()-]+$/;
const MIN_PHONE_DIGITS = 6;

const boundedText = (label: string, max: number) =>
	z
		.string()
		.trim()
		.min(1, `${label} es obligatorio`)
		.max(max, `${label} no puede superar los ${max} caracteres`);

const emptyStringToNull = (value: unknown) => {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const optionalEmailSchema = z
	.preprocess(
		emptyStringToNull,
		z
			.email("Ingresá un email válido")
			.max(SUPPLIER_APPLICATION_LIMITS.email, "El email es demasiado largo")
			.nullable()
			.optional(),
	)
	.transform((value) => value ?? null);

const optionalPhoneSchema = z
	.preprocess(
		emptyStringToNull,
		z
			.string()
			.max(SUPPLIER_APPLICATION_LIMITS.phone, "El teléfono es demasiado largo")
			.refine(
				(value) =>
					PHONE_PATTERN.test(value) &&
					value.replace(/\D/g, "").length >= MIN_PHONE_DIGITS,
				"Ingresá un teléfono válido",
			)
			.nullable()
			.optional(),
	)
	.transform((value) => value ?? null);

export const supplierApplicationSubmitInputSchema = z
	.object({
		contactName: boundedText(
			"Tu nombre",
			SUPPLIER_APPLICATION_LIMITS.contactName,
		),
		companyName: boundedText(
			"El nombre de la empresa",
			SUPPLIER_APPLICATION_LIMITS.companyName,
		),
		email: optionalEmailSchema,
		phone: optionalPhoneSchema,
		offering: boundedText(
			"Lo que ofrecés",
			SUPPLIER_APPLICATION_LIMITS.offering,
		),
		// Honeypot: hidden from people, so only a bot fills it. Unbounded on
		// purpose: a length error would tell the bot it was caught.
		website: z.string().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.email || value.phone) return;
		ctx.addIssue({
			code: "custom",
			message: "Dejanos un email o un teléfono para contactarte",
			path: ["email"],
		});
	});
