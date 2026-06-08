import type { z } from "zod";

import type {
	operationCreateInputSchema,
	operationDetailSchema,
	operationGetByIdInputSchema,
	operationIdSchema,
	operationListInputSchema,
	operationListItemSchema,
	operationStatsSchema,
	operationStatusSchema,
	operationStrategySchema,
} from "~/schemas/admin/operation.schemas";

export type OperationId = z.output<typeof operationIdSchema>;
export type OperationStatus = z.output<typeof operationStatusSchema>;
export type OperationStrategy = z.output<typeof operationStrategySchema>;
export type OperationListInput = z.output<typeof operationListInputSchema>;
export type OperationListItem = z.output<typeof operationListItemSchema>;
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
