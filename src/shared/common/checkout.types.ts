import type { z } from "zod";

import type {
	checkoutAddressCreateInputSchema,
	checkoutAddressSchema,
	checkoutAddressUpdateInputSchema,
	checkoutConfirmInputSchema,
	checkoutDeliveryInputSchema,
	checkoutLiveOrderSchema,
	checkoutPaymentMethodSchema,
	checkoutPaymentResultSchema,
	checkoutPaymentStatusSchema,
	checkoutStateSchema,
	orderDeclareReceiptInputSchema,
	orderDetailSchema,
	orderExternalPaymentSchema,
	orderGetInputSchema,
	orderListItemSchema,
	orderListOutputSchema,
	orderPaymentReturnInputSchema,
	orderPaymentReturnSchema,
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
export type CheckoutState = z.output<typeof checkoutStateSchema>;
export type CheckoutLiveOrder = z.output<typeof checkoutLiveOrderSchema>;
export type CheckoutConfirmInput = z.output<typeof checkoutConfirmInputSchema>;
export type CheckoutDeliveryInput = z.output<
	typeof checkoutDeliveryInputSchema
>;
export type CheckoutPaymentStatus = z.output<
	typeof checkoutPaymentStatusSchema
>;
export type CheckoutPaymentResult = z.output<
	typeof checkoutPaymentResultSchema
>;
export type OrderGetInput = z.output<typeof orderGetInputSchema>;
export type OrderDeclareReceiptInput = z.output<
	typeof orderDeclareReceiptInputSchema
>;
export type OrderExternalPayment = z.output<typeof orderExternalPaymentSchema>;
export type OrderListItem = z.output<typeof orderListItemSchema>;
export type OrderListOutput = z.output<typeof orderListOutputSchema>;
export type OrderDetail = z.output<typeof orderDetailSchema>;
export type OrderPaymentReturnInput = z.output<
	typeof orderPaymentReturnInputSchema
>;
export type OrderPaymentReturn = z.output<typeof orderPaymentReturnSchema>;
