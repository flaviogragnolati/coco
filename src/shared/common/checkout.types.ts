import type { z } from "zod";

import type {
	checkoutAddressCreateInputSchema,
	checkoutAddressSchema,
	checkoutAddressUpdateInputSchema,
	checkoutConfirmInputSchema,
	checkoutPaymentMethodCreateInputSchema,
	checkoutPaymentMethodSchema,
	checkoutPaymentMethodUpdateInputSchema,
	checkoutPaymentResultSchema,
	checkoutPaymentStatusSchema,
	checkoutStateSchema,
	orderDetailSchema,
	orderGetInputSchema,
	orderListItemSchema,
	orderListOutputSchema,
} from "~/schemas/checkout.schemas";

export type CheckoutAddress = z.output<typeof checkoutAddressSchema>;
export type CheckoutAddressCreateInput = z.output<
	typeof checkoutAddressCreateInputSchema
>;
export type CheckoutAddressUpdateInput = z.output<
	typeof checkoutAddressUpdateInputSchema
>;
export type CheckoutPaymentMethod = z.output<
	typeof checkoutPaymentMethodSchema
>;
export type CheckoutPaymentMethodCreateInput = z.output<
	typeof checkoutPaymentMethodCreateInputSchema
>;
export type CheckoutPaymentMethodUpdateInput = z.output<
	typeof checkoutPaymentMethodUpdateInputSchema
>;
export type CheckoutState = z.output<typeof checkoutStateSchema>;
export type CheckoutConfirmInput = z.output<typeof checkoutConfirmInputSchema>;
export type CheckoutPaymentStatus = z.output<
	typeof checkoutPaymentStatusSchema
>;
export type CheckoutPaymentResult = z.output<
	typeof checkoutPaymentResultSchema
>;
export type OrderGetInput = z.output<typeof orderGetInputSchema>;
export type OrderListItem = z.output<typeof orderListItemSchema>;
export type OrderListOutput = z.output<typeof orderListOutputSchema>;
export type OrderDetail = z.output<typeof orderDetailSchema>;
