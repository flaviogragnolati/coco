import { z } from "zod";

export const requiredText = (message: string) =>
	z.string().trim().min(1, message);

export const optionalText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

export const optionalUrl = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(z.string().url("Ingresa una URL valida").optional());

export const dateInputSchema = z
	.string()
	.trim()
	.min(1, "La fecha es obligatoria")
	.refine((value) => !Number.isNaN(new Date(value).getTime()), {
		message: "Ingresa una fecha valida",
	});

export const optionalDateInputSchema = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(
		z
			.string()
			.refine((value) => !Number.isNaN(new Date(value).getTime()), {
				message: "Ingresa una fecha valida",
			})
			.optional(),
	);

export function validateDateRange(
	value: { fromDate: string; toDate?: string },
	ctx: z.RefinementCtx,
) {
	if (!value.toDate) return;

	if (new Date(value.toDate) < new Date(value.fromDate)) {
		ctx.addIssue({
			code: "custom",
			message: "La fecha hasta no puede ser anterior a la fecha desde",
			path: ["toDate"],
		});
	}
}

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

export function requiredDecimalString(label: string, scale: number) {
	const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`);

	return z
		.string()
		.trim()
		.min(1, `${label} es obligatorio`)
		.regex(pattern, `${label} debe tener hasta ${scale} decimales`)
		.refine((value) => Number(value) > 0, {
			message: `${label} debe ser mayor a 0`,
		});
}

export function optionalDecimalString(label: string, scale: number) {
	const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`);

	return z
		.string()
		.trim()
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined))
		.pipe(
			z
				.string()
				.regex(pattern, `${label} debe tener hasta ${scale} decimales`)
				.refine((value) => Number(value) > 0, {
					message: `${label} debe ser mayor a 0`,
				})
				.optional(),
		);
}

export const jsonTextareaSchema = z
	.string()
	.trim()
	.optional()
	.transform((value, ctx) => {
		if (!value || value.length === 0) return undefined;

		try {
			JSON.parse(value) as unknown;
			return value;
		} catch {
			ctx.addIssue({
				code: "custom",
				message: "Ingresa JSON valido",
			});
			return z.NEVER;
		}
	});
