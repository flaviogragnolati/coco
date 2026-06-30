import { RotateCcw } from "lucide-react";

import type {
	OperationsCartDetail,
	OperationsCartFormValues,
	OperationsCartItemFulfillmentStatus,
	OperationsCartItemStatus,
	OperationsCartStatus,
	OperationsUserOrderStatus,
	OperationsUserTransactionStatus,
} from "~/shared/common/admin-crud/operations-cart.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

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

// Status chip configs composed from the shared convention (see status-presets).
// `submitted`/`completed`/`delivered` are the terminal-good (green); `confirmed`
// and every other mid-lifecycle state stays blue; rollovers/exceptions are amber
// follow-ups; `refunded` is an informational reversal (blue + rotate icon).
export const cartStatusConfig: Record<OperationsCartStatus, StatusConfig> = {
	draft: { ...statusPresets.inert, label: cartStatusLabelMap.draft },
	pending: { ...statusPresets.inProgress, label: cartStatusLabelMap.pending },
	atCheckout: {
		...statusPresets.inProgress,
		label: cartStatusLabelMap.atCheckout,
	},
	submitted: { ...statusPresets.success, label: cartStatusLabelMap.submitted },
	abandoned: { ...statusPresets.failed, label: cartStatusLabelMap.abandoned },
	cancelled: { ...statusPresets.failed, label: cartStatusLabelMap.cancelled },
	aborted: { ...statusPresets.failed, label: cartStatusLabelMap.aborted },
};

export const cartItemStatusConfig: Record<
	OperationsCartItemStatus,
	StatusConfig
> = {
	inCart: { ...statusPresets.inert, label: cartItemStatusLabelMap.inCart },
	submitted: {
		...statusPresets.success,
		label: cartItemStatusLabelMap.submitted,
	},
	dropped: { ...statusPresets.inert, label: cartItemStatusLabelMap.dropped },
	cancelled: {
		...statusPresets.failed,
		label: cartItemStatusLabelMap.cancelled,
	},
};

export const fulfillmentStatusConfig: Record<
	OperationsCartItemFulfillmentStatus,
	StatusConfig
> = {
	awaitingAggregation: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.awaitingAggregation,
	},
	includedInOperation: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.includedInOperation,
	},
	allocatedToSupplierItem: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.allocatedToSupplierItem,
	},
	requestedFromSupplier: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.requestedFromSupplier,
	},
	supplierConfirmed: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.supplierConfirmed,
	},
	packaged: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.packaged,
	},
	inInternalShipment: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.inInternalShipment,
	},
	atWarehouse: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.atWarehouse,
	},
	inEndUserShipment: {
		...statusPresets.inProgress,
		label: fulfillmentStatusLabelMap.inEndUserShipment,
	},
	delivered: {
		...statusPresets.success,
		label: fulfillmentStatusLabelMap.delivered,
	},
	partiallyRolledOver: {
		...statusPresets.attention,
		label: fulfillmentStatusLabelMap.partiallyRolledOver,
	},
	rolledOver: {
		...statusPresets.attention,
		label: fulfillmentStatusLabelMap.rolledOver,
	},
	cancelled: {
		...statusPresets.failed,
		label: fulfillmentStatusLabelMap.cancelled,
	},
	exception: {
		...statusPresets.attention,
		label: fulfillmentStatusLabelMap.exception,
	},
};

export const orderStatusConfig: Record<
	OperationsUserOrderStatus,
	StatusConfig
> = {
	pending: { ...statusPresets.inProgress, label: orderStatusLabelMap.pending },
	processing: {
		...statusPresets.inProgress,
		label: orderStatusLabelMap.processing,
	},
	completed: { ...statusPresets.success, label: orderStatusLabelMap.completed },
	cancelled: { ...statusPresets.failed, label: orderStatusLabelMap.cancelled },
	failed: { ...statusPresets.failed, label: orderStatusLabelMap.failed },
	refunded: {
		label: orderStatusLabelMap.refunded,
		variant: "info",
		icon: RotateCcw,
	},
	// `chargedBack` is not in `orderStatusOptions`/`orderStatusLabelMap` (the map
	// is cast), so label it inline to keep this record exhaustive.
	chargedBack: { ...statusPresets.failed, label: "Contracargo" },
};

export const transactionStatusConfig: Record<
	OperationsUserTransactionStatus,
	StatusConfig
> = {
	pending: {
		...statusPresets.inProgress,
		label: transactionStatusLabelMap.pending,
	},
	completed: {
		...statusPresets.success,
		label: transactionStatusLabelMap.completed,
	},
	failed: { ...statusPresets.failed, label: transactionStatusLabelMap.failed },
	refunded: {
		label: transactionStatusLabelMap.refunded,
		variant: "info",
		icon: RotateCcw,
	},
	// `inProcess`/`cancelled`/`chargedBack` are not in `transactionStatusOptions`
	// (the label map is cast), so label them inline to stay exhaustive.
	inProcess: { ...statusPresets.inProgress, label: "En proceso" },
	cancelled: { ...statusPresets.failed, label: "Cancelada" },
	chargedBack: { ...statusPresets.failed, label: "Contracargo" },
};

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
