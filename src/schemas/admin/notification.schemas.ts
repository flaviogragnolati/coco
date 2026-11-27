import { z } from "zod";

export const notificationStatusSchema = z.enum([
	"pending",
	"processing",
	"accepted",
	"skipped",
	"review",
]);
export const notificationIndicatorStatusSchema = z.enum([
	...notificationStatusSchema.options,
	"missing",
	"unavailable",
	"off",
]);
export const notificationModeSchema = z.enum(["test", "live", "off"]);
const orderIdSchema = z.int().positive().max(2147483647);

export const notificationListInput = z.object({
	page: z.int().positive().max(2147483647).default(1),
	pageSize: z.int().min(1).max(100).default(25),
	status: z
		.enum([...notificationStatusSchema.options, "all"])
		.default("accepted"),
	orderId: orderIdSchema.optional(),
	orderCode: z.string().trim().min(1).max(100).optional(),
});
export const notificationRowSchema = z.object({
	id: z.string(),
	orderId: orderIdSchema,
	orderCode: z.string(),
	kind: z.string().nullable(),
	status: notificationStatusSchema,
	updatedAt: z.date(),
	to: z.string().nullable(),
	subject: z.string().nullable(),
});
export const notificationListOutput = z.object({
	items: z.array(notificationRowSchema),
	total: z.int().nonnegative(),
	pageCount: z.int().nonnegative(),
	mode: notificationModeSchema,
});
export const notificationDetailOutput = notificationRowSchema.extend({
	mode: notificationModeSchema,
	attempts: z.int().nonnegative(),
	from: z.string().nullable(),
	html: z.string().nullable(),
	text: z.string().nullable(),
	lastError: z.string().nullable(),
	providerId: z.string().nullable(),
});
export const notificationSummaryBatchSize = 100;
export const notificationSummaryInput = z.object({
	orderIds: z.array(orderIdSchema).min(1).max(notificationSummaryBatchSize),
});
export const notificationSummaryOutput = z.object({
	mode: notificationModeSchema,
	orders: z.array(
		z.object({
			orderId: orderIdSchema,
			accepted: z.int().nonnegative(),
			total: z.int().nonnegative(),
		}),
	),
});
