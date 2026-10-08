import { z } from "zod";

import { Prisma } from "~/prisma/client";
import {
	supplierAddressSchema,
	supplierContactInfoSchema,
} from "~/schemas/admin/supplier.schemas";

export const QUINTAL_SUPPLIER_NAME = "Quintal";
export const QUINTAL_SHEET_NAME = "Lista WEB";

// Fixed scales of the Decimal(18,4) quantity and Decimal(18,2) money columns, so
// the data file round-trips through Prisma without rounding.
const quantitySchema = z
	.string()
	.regex(/^\d+\.\d{4}$/, "Cantidad con 4 decimales");
const moneySchema = z.string().regex(/^\d+\.\d{2}$/, "Monto con 2 decimales");
const sourceRowSchema = z.number().int().positive();

export const priceSourceSchema = z.enum(["listed", "derived"]);

export const quintalPackSchema = z.object({
	sourceRow: sourceRowSchema,
	detail: z.string().min(1),
	quantity: quantitySchema,
	price: moneySchema,
	unitPrice: moneySchema,
	priceSource: priceSourceSchema,
});

const supplierTermsSchema = z.object({
	sourceRow: sourceRowSchema,
	detail: z.string().min(1),
	moq: quantitySchema,
	moqPrice: moneySchema,
	step: quantitySchema,
	stepPrice: moneySchema,
	refPrice: moneySchema,
	priceSource: priceSourceSchema,
});

const clientTermsSchema = z.object({
	moq: quantitySchema,
	moqPrice: moneySchema,
	step: quantitySchema,
	stepPrice: moneySchema,
	max: quantitySchema.nullable(),
	unitPrice: moneySchema,
});

const bulkTierSchema = z.object({
	sourceRow: sourceRowSchema,
	minQuantity: quantitySchema,
	unitPrice: moneySchema,
});

const fractionSurchargeSchema = z.object({
	sourceRow: sourceRowSchema,
	detail: z.string().min(1),
	surchargePerKg: moneySchema,
	minimumQuantity: quantitySchema.nullable(),
});

function priceOf(unitPrice: string, quantity: string) {
	return new Prisma.Decimal(unitPrice)
		.times(quantity)
		.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export const quintalProductSchema = z
	.object({
		key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9-]+)+$/),
		sourceRows: z.array(sourceRowSchema).min(1),
		category: z.string().min(1),
		subcategory: z.string().min(1).nullable(),
		sourceLabel: z.string().min(1),
		name: z.string().trim().min(1),
		description: z.string().min(1),
		unit: z.enum(["kg", "piece"]),
		supplierTerms: supplierTermsSchema,
		clientTerms: clientTermsSchema,
		alternatePacks: z.array(quintalPackSchema),
		bulkTiers: z.array(bulkTierSchema),
		fractionSurcharge: fractionSurchargeSchema.nullable(),
	})
	.superRefine((product, ctx) => {
		const supplier = product.supplierTerms;
		if (new Prisma.Decimal(supplier.moq).lte(0)) {
			ctx.addIssue({ code: "custom", message: "MOQ del proveedor <= 0" });
		}
		if (
			supplier.step !== supplier.moq ||
			supplier.stepPrice !== supplier.moqPrice
		) {
			ctx.addIssue({
				code: "custom",
				message: "El step del proveedor debe ser el pack (step = MOQ)",
			});
		}

		const client = product.clientTerms;
		if (new Prisma.Decimal(client.moq).lte(0)) {
			ctx.addIssue({ code: "custom", message: "MOQ del cliente <= 0" });
		}
		if (
			!priceOf(client.unitPrice, client.moq).eq(client.moqPrice) ||
			!priceOf(client.unitPrice, client.step).eq(client.stepPrice)
		) {
			ctx.addIssue({
				code: "custom",
				message: "Precio de MOQ/step del cliente incoherente con el unitario",
			});
		}
	});

export const quintalNoteSchema = z.object({
	row: sourceRowSchema.nullable(),
	code: z.string().min(1),
	message: z.string().min(1),
});

export const quintalCatalogSchema = z.object({
	source: z.object({
		fileName: z.string().min(1),
		sha256: z.string().regex(/^[0-9a-f]{64}$/),
		sheet: z.literal(QUINTAL_SHEET_NAME),
		listDate: z.iso.datetime(),
		pricesIncludeVat: z.literal(false),
		currency: z.literal("ARS"),
		paymentTerms: z.string().min(1),
	}),
	supplier: z.object({
		name: z.literal(QUINTAL_SUPPLIER_NAME),
		description: z.string().min(1),
		address: supplierAddressSchema,
		contactInfo: supplierContactInfoSchema,
	}),
	products: z.array(quintalProductSchema).min(1),
	notes: z.array(quintalNoteSchema),
});

/** The data-file shape (the supplier JSON schemas trim and drop empty text). */
export type QuintalCatalog = z.input<typeof quintalCatalogSchema>;
export type QuintalProduct = z.input<typeof quintalProductSchema>;
export type QuintalPack = z.input<typeof quintalPackSchema>;
export type QuintalNote = z.input<typeof quintalNoteSchema>;
export type PriceSource = z.infer<typeof priceSourceSchema>;

export type QuintalSplitVariants = {
	/** Shared prefix every variant name keeps (e.g. the brand). */
	base: string;
	variants: string[];
};

export type QuintalOverrides = {
	/** Validity start of the list; the sheet carries no date of its own. */
	listDate: string;
	/** Client price = ceil(((ref + freight) × (1+vat) × (1+margin)) / roundUpTo) × roundUpTo. */
	pricing: {
		marginPercent: number;
		vatPercent: number;
		freightPerKg: number;
		freightPerPiece: number;
		/** null: no rounding beyond cents. */
		roundUpTo: number | null;
	};
	clientTerms: { moq: string; step: string; max: string | null };
	/** Per product key, replaces the default client quantities. */
	clientTermsOverrides: Record<
		string,
		Partial<{ moq: string; step: string; max: string | null }>
	>;
	/** Category headings (as written in the sheet) left out of the catalog. */
	excludedCategories: string[];
	/**
	 * Per category heading: the display prefix of its product names, and the stem
	 * that, when already present in a label, makes the prefix redundant.
	 */
	categoryLabels: Record<string, { prefix: string; stem?: string }>;
	/** Per subheading (as written): the sentence the description gets. */
	subcategoryLabels: Record<string, string>;
	/** Lowercase source word → display spelling (accents, proper nouns, codes). */
	wordSpelling: Record<string, string>;
	/** Product key → final display name. */
	nameOverrides: Record<string, string>;
	/** Generated key → stable key, for a supplier relabel that is the same product. */
	keyAliases: Record<string, string>;
	/** Source row → the products one listed row expands to. */
	splitVariants: Record<number, QuintalSplitVariants>;
	/** Side-table heading (as written) → product key its volume tiers belong to. */
	sideTableTargets: Record<string, string>;
	/** Surcharge row → product keys it applies to. */
	surchargeTargets: Record<number, string[]>;
	/** Rows whose unit and pack prices disagree: which column wins, and why. */
	priceResolutions: Record<number, { use: "pack" | "unit"; reason: string }>;
	supplier: {
		description: string;
		contactName: string;
		address: {
			line1: string;
			city: string;
			state: string;
			postalCode: string;
			country: string;
		};
	};
};
