import type {
	CartTraceabilityAllocation,
	CartTraceabilityDetail,
	CartTraceabilityItem,
	CartTraceabilityOrder,
	CartTraceabilityPackaging,
	CartTraceabilityPayment,
	CartTraceabilityRollOver,
} from "~/shared/common/cart-traceability.types";
import type { AdminTrackingTimelineItem } from "~/shared/common/tracking.types";
import type {
	CartTraceabilityItemRecord,
	CartTraceabilityRecord,
} from "./cart-traceability.data";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { highestSeverity } from "./operational-diagnostics.types";

type AllocationRecord = CartTraceabilityItemRecord["cartItemLotItems"][number];
type PackagingRecord = AllocationRecord["packageAllocations"][number];
type RollOverRecord = CartTraceabilityItemRecord["rollOvers"][number];
type OrderRecord = CartTraceabilityRecord["userOrders"][number];
type TransactionRecord = OrderRecord["transactions"][number];

/**
 * Diagnostics computed for the entities touched by a cart, keyed by entity id.
 * Built once per request so they can be attributed to every item whose lineage
 * passes through the diagnosed lot / package / shipment.
 */
export type CartTraceabilityDiagnosticsMaps = {
	lot: Map<number, OperationalDiagnostic[]>;
	package: Map<number, OperationalDiagnostic[]>;
	shipment: Map<number, OperationalDiagnostic[]>;
};

export type CartTraceabilityTimelines = {
	cart: AdminTrackingTimelineItem[];
	byItemId: Map<number, AdminTrackingTimelineItem[]>;
};

function diagnosticKey(diagnostic: OperationalDiagnostic) {
	return `${diagnostic.code}::${JSON.stringify(diagnostic.refs ?? {})}`;
}

function dedupeDiagnostics(diagnostics: OperationalDiagnostic[]) {
	const seen = new Set<string>();
	const result: OperationalDiagnostic[] = [];

	for (const diagnostic of diagnostics) {
		const key = diagnosticKey(diagnostic);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(diagnostic);
	}

	return result;
}

function attributeItemDiagnostics(
	item: CartTraceabilityItemRecord,
	diagnostics: CartTraceabilityDiagnosticsMaps,
) {
	const collected: OperationalDiagnostic[] = [];

	for (const allocation of item.cartItemLotItems) {
		collected.push(...(diagnostics.lot.get(allocation.lotItem.lot.id) ?? []));

		for (const packaging of allocation.packageAllocations) {
			const pkg = packaging.packageLotItem.package;
			collected.push(...(diagnostics.package.get(pkg.id) ?? []));
			if (pkg.shipment) {
				collected.push(...(diagnostics.shipment.get(pkg.shipment.id) ?? []));
			}
		}
	}

	return dedupeDiagnostics(collected);
}

function toPackaging(packaging: PackagingRecord): CartTraceabilityPackaging {
	const line = packaging.packageLotItem;
	const pkg = line.package;

	return {
		id: packaging.id,
		quantity: packaging.quantity.toString(),
		packageLine: {
			id: line.id,
			quantity: line.quantity.toString(),
			status: line.status,
		},
		package: {
			id: pkg.id,
			name: pkg.name,
			status: pkg.status,
			trackingCode: pkg.trackingCode,
		},
		shipment: pkg.shipment
			? {
					id: pkg.shipment.id,
					name: pkg.shipment.name,
					internalCode: pkg.shipment.internalCode,
					status: pkg.shipment.status,
					type: pkg.shipment.type,
					trackingCode: pkg.shipment.trackingCode,
				}
			: null,
	};
}

function toAllocation(
	allocation: AllocationRecord,
): CartTraceabilityAllocation {
	const { lotItem } = allocation;
	const { lot } = lotItem;

	return {
		id: allocation.id,
		quantity: allocation.quantity.toString(),
		lotItem: {
			id: lotItem.id,
			code: lotItem.code,
			status: lotItem.status,
			quantity: lotItem.quantity.toString(),
			product: { name: lotItem.productSupplierTerms.product.name },
			lot: {
				id: lot.id,
				code: lot.code,
				status: lot.status,
				supplierName: lot.supplier.name,
				operation: {
					id: lot.operation.id,
					code: lot.operation.code,
					status: lot.operation.status,
					strategy: lot.operation.strategy,
				},
			},
		},
		packaging: allocation.packageAllocations.map(toPackaging),
	};
}

function toRollOver(rollOver: RollOverRecord): CartTraceabilityRollOver {
	return {
		id: rollOver.id,
		stage: rollOver.stage,
		status: rollOver.status,
		quantity: rollOver.quantity.toString(),
		reason: rollOver.reason,
		operation: {
			id: rollOver.operation.id,
			code: rollOver.operation.code,
			status: rollOver.operation.status,
		},
	};
}

function toPayment(transaction: TransactionRecord): CartTraceabilityPayment {
	return {
		id: transaction.id,
		amount: transaction.amount.toString(),
		currency: transaction.currency,
		status: transaction.status,
		provider: transaction.provider,
		paymentMethodType: transaction.paymentMethod.type,
		createdAt: transaction.createdAt,
		updatedAt: transaction.updatedAt,
	};
}

function toOrder(order: OrderRecord): CartTraceabilityOrder {
	return {
		id: order.id,
		code: order.code,
		status: order.status,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
		payments: order.transactions.map(toPayment),
	};
}

function toItem(
	item: CartTraceabilityItemRecord,
	diagnostics: CartTraceabilityDiagnosticsMaps,
	timeline: AdminTrackingTimelineItem[],
): CartTraceabilityItem {
	const itemDiagnostics = attributeItemDiagnostics(item, diagnostics);

	return {
		id: item.id,
		code: item.code,
		quantity: item.quantity.toString(),
		status: item.status,
		fulfillmentStatus: item.fulfillmentStatus,
		deleted: item.deleted,
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
		product: item.productClientTerms.product,
		allocations: item.cartItemLotItems.map(toAllocation),
		rollOvers: item.rollOvers.map(toRollOver),
		diagnostics: itemDiagnostics,
		highestDiagnosticSeverity: highestSeverity(itemDiagnostics),
		timeline,
	};
}

function buildAggregate(record: CartTraceabilityRecord) {
	const counts = new Map<
		CartTraceabilityItemRecord["fulfillmentStatus"],
		number
	>();

	for (const item of record.cartItems) {
		counts.set(
			item.fulfillmentStatus,
			(counts.get(item.fulfillmentStatus) ?? 0) + 1,
		);
	}

	return {
		itemCount: record.cartItems.length,
		fulfillmentSummary: Array.from(counts.entries()).map(([status, count]) => ({
			status,
			count,
		})),
	};
}

function buildCartDiagnostics(diagnostics: CartTraceabilityDiagnosticsMaps) {
	return dedupeDiagnostics([
		...Array.from(diagnostics.lot.values()).flat(),
		...Array.from(diagnostics.package.values()).flat(),
		...Array.from(diagnostics.shipment.values()).flat(),
	]);
}

/**
 * Pure shaping of the loaded cart graph + precomputed diagnostics + timelines
 * into the read-model the traceability screen consumes. Kept free of IO so the
 * lineage and diagnostics-attribution logic can be unit tested in isolation.
 */
export function assembleCartTraceability(
	record: CartTraceabilityRecord,
	diagnostics: CartTraceabilityDiagnosticsMaps,
	timelines: CartTraceabilityTimelines,
): CartTraceabilityDetail {
	const cartDiagnostics = buildCartDiagnostics(diagnostics);

	return {
		cart: {
			id: record.id,
			code: record.code,
			status: record.status,
			deleted: record.deleted,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
			user: record.user,
		},
		aggregate: buildAggregate(record),
		orders: record.userOrders.map(toOrder),
		items: record.cartItems.map((item) =>
			toItem(item, diagnostics, timelines.byItemId.get(item.id) ?? []),
		),
		cartTimeline: timelines.cart,
		diagnostics: cartDiagnostics,
		highestDiagnosticSeverity: highestSeverity(cartDiagnostics),
	};
}
