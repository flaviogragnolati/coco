import type { z } from "zod";

import type {
	operationCancelInputSchema,
	operationCommandKeySchema,
	operationCreateFieldsSchema,
	operationCreateInputSchema,
	operationDeleteInputSchema,
	operationDetailSchema,
	operationGetByIdInputSchema,
	operationIdSchema,
	operationListInputSchema,
	operationListItemSchema,
	operationListOutputSchema,
	operationRerunInputSchema,
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
export type OperationCommandKey = z.output<typeof operationCommandKeySchema>;
export type OperationCancelInput = z.output<typeof operationCancelInputSchema>;
export type OperationRerunInput = z.output<typeof operationRerunInputSchema>;
export type OperationRerunFormValues = z.output<
	typeof operationCreateFieldsSchema
>;
export type OperationDeleteInput = z.output<typeof operationDeleteInputSchema>;
