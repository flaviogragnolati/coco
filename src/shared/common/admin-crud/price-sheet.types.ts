import type { z } from "zod";

import type {
	priceSheetApplyResultSchema,
	priceSheetChangeSchema,
	priceSheetPreviewRowSchema,
	priceSheetPreviewSchema,
} from "~/schemas/admin/price-sheet.schemas";

export type PriceSheetChange = z.output<typeof priceSheetChangeSchema>;
export type PriceSheetPreviewRow = z.output<typeof priceSheetPreviewRowSchema>;
export type PriceSheetPreview = z.output<typeof priceSheetPreviewSchema>;
export type PriceSheetApplyResult = z.output<
	typeof priceSheetApplyResultSchema
>;
