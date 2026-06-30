import type { z } from "zod";

import type {
	packageDetailSchema,
	packageGetByIdInputSchema,
	packageListInputSchema,
	packageListItemSchema,
	packageListOutputSchema,
	packageLotItemStatusSchema,
	packageStatsSchema,
	packageStatusSchema,
} from "~/schemas/admin/package.schemas";

export type PackageStatus = z.output<typeof packageStatusSchema>;
export type PackageLotItemStatus = z.output<typeof packageLotItemStatusSchema>;
export type PackageListInput = z.output<typeof packageListInputSchema>;
export type PackageListItem = z.output<typeof packageListItemSchema>;
export type PackageListOutput = z.output<typeof packageListOutputSchema>;
export type PackageDetail = z.output<typeof packageDetailSchema>;
export type PackageStats = z.output<typeof packageStatsSchema>;
export type PackageGetByIdInput = z.output<typeof packageGetByIdInputSchema>;
