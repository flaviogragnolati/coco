import type {
	OperationsCartDetail,
	OperationsCartFormValues,
	OperationsCartItemFulfillmentStatus,
	OperationsCartItemStatus,
	OperationsCartStatus,
	OperationsUserOrderStatus,
	OperationsUserTransactionStatus,
} from "~/shared/common/admin-crud/operations-cart.types";

export const cartStatusOptions: Array<{
	value: OperationsCartStatus;
	label: string;
}> = [
	{ value: "draft", label: "Borrador" },
	{ value: "pending", label: "Pendiente" },
	{ value: "atCheckout", label: "En checkout" },
	{ value: "submitted", label: "Enviado" },
	{ value: "abandoned", label: "Abandonado" },
	{ value: "cancelled", label: "Cancelado" },
	{ value: "aborted", label: "Abortado" },
];

export const cartStatusLabelMap: Record<OperationsCartStatus, string> =
	Object.fromEntries(
		cartStatusOptions.map((option) => [option.value, option.label]),
	) as Record<OperationsCartStatus, string>;

export const cartItemStatusOptions: Array<{
	value: OperationsCartItemStatus;
	label: string;
}> = [
	{ value: "inCart", label: "En carrito" },
	{ value: "submitted", label: "Enviado" },
	{ value: "dropped", label: "Removido" },
	{ value: "cancelled", label: "Cancelado" },
];

export const cartItemStatusLabelMap: Record<OperationsCartItemStatus, string> =
	Object.fromEntries(
		cartItemStatusOptions.map((option) => [option.value, option.label]),
	) as Record<OperationsCartItemStatus, string>;

export const fulfillmentStatusOptions: Array<{
	value: OperationsCartItemFulfillmentStatus;
	label: string;
}> = [
	{ value: "awaitingAggregation", label: "Pendiente de agregacion" },
	{ value: "includedInOperation", label: "En operacion" },
	{ value: "allocatedToSupplierItem", label: "Asignado a proveedor" },
	{ value: "requestedFromSupplier", label: "Pedido a proveedor" },
	{ value: "supplierConfirmed", label: "Confirmado por proveedor" },
	{ value: "packaged", label: "Empaquetado" },
	{ value: "inInternalShipment", label: "Envio interno" },
	{ value: "atWarehouse", label: "En deposito" },
	{ value: "inEndUserShipment", label: "Envio a usuario" },
	{ value: "delivered", label: "Entregado" },
	{ value: "partiallyRolledOver", label: "Parcialmente rebalanceado" },
	{ value: "rolledOver", label: "Rebalanceado" },
	{ value: "cancelled", label: "Cancelado" },
	{ value: "exception", label: "Excepcion" },
];

export const fulfillmentStatusLabelMap: Record<
	OperationsCartItemFulfillmentStatus,
	string
> = Object.fromEntries(
	fulfillmentStatusOptions.map((option) => [option.value, option.label]),
) as Record<OperationsCartItemFulfillmentStatus, string>;

export const orderStatusOptions: Array<{
	value: OperationsUserOrderStatus;
	label: string;
}> = [
	{ value: "pending", label: "Pendiente" },
	{ value: "processing", label: "Procesando" },
	{ value: "completed", label: "Completada" },
	{ value: "cancelled", label: "Cancelada" },
	{ value: "failed", label: "Fallida" },
	{ value: "refunded", label: "Reembolsada" },
];

export const orderStatusLabelMap: Record<OperationsUserOrderStatus, string> =
	Object.fromEntries(
		orderStatusOptions.map((option) => [option.value, option.label]),
	) as Record<OperationsUserOrderStatus, string>;

export const transactionStatusOptions: Array<{
	value: OperationsUserTransactionStatus;
	label: string;
}> = [
	{ value: "pending", label: "Pendiente" },
	{ value: "completed", label: "Completa" },
	{ value: "failed", label: "Fallida" },
	{ value: "refunded", label: "Reembolsada" },
];

export const transactionStatusLabelMap: Record<
	OperationsUserTransactionStatus,
	string
> = Object.fromEntries(
	transactionStatusOptions.map((option) => [option.value, option.label]),
) as Record<OperationsUserTransactionStatus, string>;

export const defaultOperationsCartFormValues: OperationsCartFormValues = {
	id: 0,
	status: "pending",
	items: [],
};

export function operationsCartDetailToFormValues(
	cart: OperationsCartDetail,
): OperationsCartFormValues {
	return {
		id: cart.id,
		status: cart.status,
		items: cart.cartItems
			.filter((item) => !item.deleted)
			.map((item) => ({
				id: item.id,
				productClientTermsId: item.productClientTerms.id,
				quantity: item.quantity,
			})),
	};
}
