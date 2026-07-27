import {
	supplierOrderStatusLineCompatibility,
	unresolvedDemandFulfillmentStatuses,
} from "~/shared/common/fulfillment-transitions";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import {
	remainingQuantity,
	type SupplierOrderSummaryRecord,
} from "./supplier-order.data";

function allLotItems(order: SupplierOrderSummaryRecord) {
	return order.lots.flatMap((lot) => lot.lotItems);
}

export function calculateSupplierOrderDiagnostics(
	order: SupplierOrderSummaryRecord,
): OperationalDiagnostic[] {
	const diagnostics: OperationalDiagnostic[] = [];
	const lotItems = allLotItems(order);
	const liveLotItems = lotItems.filter((item) => item.status !== "cancelled");

	if (order.lots.length === 0) {
		diagnostics.push({
			code: "supplierOrder.noLots",
			severity: "warning",
			message: "La orden de proveedor no tiene lotes asociados.",
			refs: { supplierOrderId: order.id },
		});
	}

	const compatibleStatuses = supplierOrderStatusLineCompatibility[order.status];
	if (compatibleStatuses) {
		// Cancelled lines are filtered first: a partially cancelled order is a
		// correct outcome of `cancelLine`, not an aggregate running ahead.
		const incompatible = liveLotItems.filter(
			(item) => !compatibleStatuses.has(item.status),
		);

		if (incompatible.length > 0) {
			diagnostics.push({
				code: "supplierOrder.status.aggregateAheadOfLines",
				severity: "warning",
				message:
					"El estado de la orden de proveedor esta por delante de sus lineas.",
				refs: { supplierOrderId: order.id, lotItemCount: incompatible.length },
			});
		}
	}

	// Exempt when the cancellation came from an **operation compensation**, the same
	// exemption `calculateLotDiagnostics` applies for the same reason: compensation
	// is status-only and returns its cart items to `awaitingAggregation`, which this
	// rule reads as unresolved. `every`, not `some` — compensation refuses an order
	// holding lots of another operation (§8), so a mixed order was cancelled through
	// the supplier loop and keeps the rule.
	const compensated =
		order.lots.length > 0 &&
		order.lots.every((lot) => lot.operation.status === "cancelled");

	if (order.status === "cancelled" && !compensated) {
		const hasUnresolvedDemand = lotItems.some((lotItem) =>
			lotItem.cartItemLotItems.some((allocation) =>
				unresolvedDemandFulfillmentStatuses.has(
					allocation.cartItem.fulfillmentStatus,
				),
			),
		);

		if (hasUnresolvedDemand) {
			diagnostics.push({
				code: "supplierOrder.cancelledWithActiveDemand",
				severity: "critical",
				message:
					"La orden de proveedor esta cancelada pero conserva demanda sin resolver.",
				refs: { supplierOrderId: order.id },
			});
		}
	}

	if (
		order.status !== "cancelled" &&
		lotItems.length > 0 &&
		liveLotItems.length === 0
	) {
		diagnostics.push({
			code: "supplierOrder.allLinesCancelled",
			severity: "critical",
			message:
				"Todas las lineas de la orden estan canceladas pero la orden sigue activa.",
			refs: { supplierOrderId: order.id, lotItemCount: lotItems.length },
		});
	}

	// The invariant behind the `final` closing path: a completed order has nothing
	// left to dispatch, either because it all arrived or because the remainder
	// rolled over. If this fires, the closing rule leaked quantity outside both
	// `assigned` and `rollOver`.
	if (order.status === "completed") {
		const undispatched = liveLotItems.filter((lotItem) =>
			remainingQuantity(lotItem).greaterThan(0),
		);

		if (undispatched.length > 0) {
			diagnostics.push({
				code: "supplierOrder.completedWithUndispatchedQuantity",
				severity: "critical",
				message:
					"La orden esta completada pero conserva cantidad sin despachar.",
				refs: { supplierOrderId: order.id, lotItemCount: undispatched.length },
			});
		}
	}

	// Reachable only by hand-editing — `registerDispatch` is the sole producer of
	// `readyForReceipt` and it always creates a package line — and cheap to detect.
	if (order.status === "readyForReceipt") {
		const hasLivePackageLine = liveLotItems.some((lotItem) =>
			lotItem.packageLotItems.some(
				(line) =>
					line.package.leg === "inbound" &&
					line.package.status !== "cancelled" &&
					line.status !== "cancelled",
			),
		);

		if (!hasLivePackageLine) {
			diagnostics.push({
				code: "supplierOrder.readyForReceipt.noPackages",
				severity: "warning",
				message:
					"La orden esta lista para recibir pero no tiene paquetes de entrada activos.",
				refs: { supplierOrderId: order.id },
			});
		}
	}

	return diagnostics;
}
