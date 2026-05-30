import type { z } from "zod";

import type {
	catalogBrandSummarySchema,
	catalogClientTermsSchema,
	catalogCurrencySchema,
	catalogProductDetailInputSchema,
	catalogProductDetailSchema,
	catalogProductListItemSchema,
	catalogProductUnitSchema,
} from "~/schemas/catalog.schemas";

export type CatalogCurrency = z.output<typeof catalogCurrencySchema>;
export type CatalogProductUnit = z.output<typeof catalogProductUnitSchema>;
export type CatalogBrandSummary = z.output<typeof catalogBrandSummarySchema>;
export type CatalogClientTerms = z.output<typeof catalogClientTermsSchema>;
export type CatalogProductListItem = z.output<
	typeof catalogProductListItemSchema
>;
export type CatalogProductDetailInput = z.output<
	typeof catalogProductDetailInputSchema
>;
export type CatalogProductDetail = z.output<typeof catalogProductDetailSchema>;
