import {
	CheckCircle2Icon,
	ClockIcon,
	type LucideIcon,
	RotateCcwIcon,
	XCircleIcon,
} from "lucide-react";

import type { OrderListItem } from "./checkout.types";
import {
	formatCurrency,
	formatQuantity,
	isWeightUnit,
	productUnitLabelMap,
} from "./commerce.helpers";
import {
	readSnapshotQuantityUnit,
	readSnapshotUnitPrice,
} from "./product-snapshot";

/**
 * Customer-facing display vocabulary for orders: labels, status chips and the
 * grouped status filter used by `/my-orders`. Single home of these strings so
 * the list and the detail page never drift (they used to keep private copies,
 * one of which silently mislabelled `chargedBack` as "Pendiente").
 *
 * Mirrors `tracking-display.ts` (maps keyed by literal) and the variant+icon
 * shape of `admin-crud/status-presets.ts` — without importing from `admin-crud/`,
 * which is admin-only by convention.
 */

export type OrderStatus = OrderListItem["status"];
export type OrderTransactionStatus = NonNullable<
	OrderListItem["latestTransactionStatus"]
>;

/** Badge variants used by order chips — kept local so this module stays React-free. */
type OrderChipVariant =
	| "success"
	| "warning"
	| "info"
	| "destructive"
	| "outline";

export const orderStatusLabelMap: Record<OrderStatus, string> = {
	pending: "Pendiente",
	processing: "En procesamiento",
	completed: "Completado",
	cancelled: "Cancelado",
	failed: "Fallido",
	refunded: "Reembolsado",
	chargedBack: "Contracargo",
};

export const paymentStatusLabelMap: Record<OrderTransactionStatus, string> = {
	pending: "Pendiente",
	inProcess: "En proceso",
	completed: "Aprobado",
	failed: "Rechazado",
	cancelled: "Cancelado",
	refunded: "Reembolsado",
	chargedBack: "Contracargo",
};

/** Label for the latest payment of an order, including the "no attempt yet" case. */
export function paymentStatusLabel(status: OrderTransactionStatus | null) {
	return status ? paymentStatusLabelMap[status] : "Sin pago";
}

export const orderStatusChipConfigMap: Record<
	OrderStatus,
	{ label: string; variant: OrderChipVariant; icon: LucideIcon }
> = {
	pending: {
		label: orderStatusLabelMap.pending,
		variant: "info",
		icon: ClockIcon,
	},
	processing: {
		label: orderStatusLabelMap.processing,
		variant: "info",
		icon: ClockIcon,
	},
	completed: {
		label: orderStatusLabelMap.completed,
		variant: "success",
		icon: CheckCircle2Icon,
	},
	cancelled: {
		label: orderStatusLabelMap.cancelled,
		variant: "outline",
		icon: XCircleIcon,
	},
	failed: {
		label: orderStatusLabelMap.failed,
		variant: "destructive",
		icon: XCircleIcon,
	},
	refunded: {
		label: orderStatusLabelMap.refunded,
		variant: "warning",
		icon: RotateCcwIcon,
	},
	chargedBack: {
		label: orderStatusLabelMap.chargedBack,
		variant: "warning",
		icon: RotateCcwIcon,
	},
};

export const orderStatusFilterKeys = [
	"all",
	"inProgress",
	"completed",
	"cancelled",
	"refunded",
] as const;

export type OrderStatusFilterKey = (typeof orderStatusFilterKeys)[number];

/**
 * The seven order statuses collapsed into the four buckets a customer thinks
 * in. `all` has no group: it means "no filter".
 */
export const orderStatusFilterGroups: Record<
	Exclude<OrderStatusFilterKey, "all">,
	{ label: string; statuses: OrderStatus[] }
> = {
	inProgress: { label: "En curso", statuses: ["pending", "processing"] },
	completed: { label: "Completados", statuses: ["completed"] },
	cancelled: { label: "Cancelados", statuses: ["cancelled", "failed"] },
	refunded: { label: "Reintegros", statuses: ["refunded", "chargedBack"] },
};

export const orderStatusFilterLabelMap: Record<OrderStatusFilterKey, string> = {
	all: "Todos",
	inProgress: orderStatusFilterGroups.inProgress.label,
	completed: orderStatusFilterGroups.completed.label,
	cancelled: orderStatusFilterGroups.cancelled.label,
	refunded: orderStatusFilterGroups.refunded.label,
};

/** A pending order is still waiting for its payment, so it is not repeated. */
export function canRepeatOrder(status: OrderStatus) {
	return status !== "pending";
}

/**
 * An order line's quantity followed by the unit price it was charged: "1,5 kg
 * × $ 22.600 / kg" by weight, "2 frascos 500 g × $ 6.500 c/u" otherwise. Lines
 * whose snapshot froze no client terms show the quantity alone.
 */
export function formatOrderLineQuantityPrice(item: {
	quantity: string;
	productSnapshot: unknown;
	priceSnapshot: unknown;
}) {
	const { unit, presentation } = readSnapshotQuantityUnit(item.productSnapshot);
	const quantity = formatQuantity(item.quantity, unit, presentation);
	const price = readSnapshotUnitPrice(item.priceSnapshot);
	if (!price) return quantity;

	const unitPrice = formatCurrency(price.unitPrice, price.currency);
	return isWeightUnit(unit)
		? `${quantity} × ${unitPrice} / ${productUnitLabelMap[unit]}`
		: `${quantity} × ${unitPrice} c/u`;
}

const PAID_ATTEMPT_STATUSES: readonly OrderTransactionStatus[] = [
	"completed",
	"refunded",
	"chargedBack",
];

/**
 * The attempt an order's amount and payment status come from, out of its
 * attempts newest first: the one that took the money, else one the provider
 * is holding, else the newest. After a switch of payment method, a late
 * Mercado Pago approval can pay an attempt older than the newest (ADR 0013).
 */
export function selectOrderDisplayAttempt<
	T extends { status: OrderTransactionStatus },
>(transactions: readonly T[]): T | undefined {
	return (
		transactions.find((attempt) =>
			PAID_ATTEMPT_STATUSES.includes(attempt.status),
		) ??
		transactions.find((attempt) => attempt.status === "inProcess") ??
		transactions[0]
	);
}
