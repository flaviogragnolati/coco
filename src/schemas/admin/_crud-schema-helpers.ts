import { z } from "zod";

export const requiredText = (message: string) =>
	z.string().trim().min(1, message);

/**
 * Date sort for the paginated admin lists. Defaults to `desc` so every existing
 * caller keeps the newest-first order it had before the toggle existed.
 */
export const sortDirectionSchema = z.enum(["desc", "asc"]).default("desc");

export const nullishText = z
	.string()
	.trim()
	.nullish()
	.transform((value) => (value && value.length > 0 ? value : undefined));

export const optionalUrl = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(z.string().url("Ingresá una URL válida").optional());

// The two shapes fromDateTimeLocalValue accepts: a naive `datetime-local` value
// (interpreted in BUSINESS_TZ) or an already-unambiguous absolute instant.
const DATE_INPUT_PATTERN =
	/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function isValidDateInput(value: string) {
	return (
		DATE_INPUT_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime())
	);
}

export const dateInputSchema = z
	.string()
	.trim()
	.min(1, "La fecha es obligatoria")
	.refine(isValidDateInput, {
		message: "Ingresá una fecha válida",
	});

export const optionalDateInputSchema = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(
		z
			.string()
			.refine(isValidDateInput, {
				message: "Ingresá una fecha válida",
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
				message: "Ingresá JSON válido",
			});
			return z.NEVER;
		}
	});
