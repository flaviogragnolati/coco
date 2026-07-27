import type { z } from "zod";

import type {
	packageAvailableActionSchema,
	packageCommandKeySchema,
	packageConfirmDeliveryInputSchema,
	packageDetailSchema,
	packageExceptionInputSchema,
	packageFractionateInputSchema,
	packageFractionateOutputSchema,
	packageGetByIdInputSchema,
	packageLegSchema,
	packageListInputSchema,
	packageListItemSchema,
	packageListOutputSchema,
	packageLotItemStatusSchema,
	packagePromoteInputSchema,
	packageRecoverInputSchema,
	packageSplitInputSchema,
	packageSplitOutputSchema,
	packageStatsSchema,
	packageStatusSchema,
	packageWriteOffInputSchema,
} from "~/schemas/admin/package.schemas";

export type PackageStatus = z.output<typeof packageStatusSchema>;
export type PackageLotItemStatus = z.output<typeof packageLotItemStatusSchema>;
export type PackageLeg = z.output<typeof packageLegSchema>;
export type PackageCommandKey = z.output<typeof packageCommandKeySchema>;
export type PackageAvailableAction = z.output<
	typeof packageAvailableActionSchema
>;
export type PackageListInput = z.output<typeof packageListInputSchema>;
export type PackageListItem = z.output<typeof packageListItemSchema>;
export type PackageListOutput = z.output<typeof packageListOutputSchema>;
export type PackageDetail = z.output<typeof packageDetailSchema>;
export type PackageStats = z.output<typeof packageStatsSchema>;
export type PackageGetByIdInput = z.output<typeof packageGetByIdInputSchema>;
export type PackageWriteOffInput = z.output<typeof packageWriteOffInputSchema>;
/** Pre-transform shape the write-off form binds to. */
export type PackageWriteOffFormInput = z.input<
	typeof packageWriteOffInputSchema
>;
export type PackageFractionateInput = z.output<
	typeof packageFractionateInputSchema
>;
export type PackageFractionateFormInput = z.input<
	typeof packageFractionateInputSchema
>;
export type PackageFractionateOutput = z.output<
	typeof packageFractionateOutputSchema
>;
export type PackagePromoteInput = z.output<typeof packagePromoteInputSchema>;
export type PackagePromoteFormInput = z.input<typeof packagePromoteInputSchema>;
export type PackageSplitInput = z.output<typeof packageSplitInputSchema>;
export type PackageSplitFormInput = z.input<typeof packageSplitInputSchema>;
export type PackageSplitOutput = z.output<typeof packageSplitOutputSchema>;
export type PackageExceptionInput = z.output<
	typeof packageExceptionInputSchema
>;
export type PackageConfirmDeliveryInput = z.output<
	typeof packageConfirmDeliveryInputSchema
>;
export type PackageRecoverInput = z.output<typeof packageRecoverInputSchema>;
