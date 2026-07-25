import type { z } from "zod";

import type {
	operationCreateInputSchema,
	operationDetailSchema,
	operationGetByIdInputSchema,
	operationIdSchema,
	operationListInputSchema,
	operationListItemSchema,
	operationListOutputSchema,
	operationRollOverStageSchema,
	operationRollOverStatusSchema,
	operationStatsSchema,
	operationStatusSchema,
	operationStrategySchema,
	operationSupplierOrderStatusSchema,
} from "~/schemas/admin/operation.schemas";

export type OperationId = z.output<typeof operationIdSchema>;
export type OperationStatus = z.output<typeof operationStatusSchema>;
export type OperationStrategy = z.output<typeof operationStrategySchema>;
export type OperationSupplierOrderStatus = z.output<
	typeof operationSupplierOrderStatusSchema
>;
export type OperationRollOverStage = z.output<
	typeof operationRollOverStageSchema
>;
export type OperationRollOverStatus = z.output<
	typeof operationRollOverStatusSchema
>;
export type OperationListInput = z.output<typeof operationListInputSchema>;
export type OperationListItem = z.output<typeof operationListItemSchema>;
export type OperationListOutput = z.output<typeof operationListOutputSchema>;
export type OperationDetail = z.output<typeof operationDetailSchema>;
export type OperationStats = z.output<typeof operationStatsSchema>;
export type OperationGetByIdInput = z.output<
	typeof operationGetByIdInputSchema
>;
export type OperationCreateInput = z.output<typeof operationCreateInputSchema>;
export type OperationCreateFormInput = z.input<
	typeof operationCreateInputSchema
>;
export type OperationCreateFormValues = z.output<
	typeof operationCreateInputSchema
>;
