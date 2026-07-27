import type { CarrierOrderStatus, ShipmentStatus } from "~/prisma/client";
import { carrierOrderStatusShipmentCompatibility } from "~/shared/common/fulfillment-transitions";
import type { CarrierOrderSummaryRecord } from "./carrier-order.data";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";

const disruptedShipmentStatuses: ReadonlySet<ShipmentStatus> = new Set([
	"delayed",
	"failed",
]);

/** A booking is closed once it can no longer move: cancelled or failed. */
const closedCarrierOrderStatuses: ReadonlySet<CarrierOrderStatus> = new Set([
	"cancelled",
	"failed",
]);

/** Where a shipment can legitimately sit under a closed booking. */
const settledShipmentStatuses: ReadonlySet<ShipmentStatus> = new Set([
	"cancelled",
	"received",
]);

export function calculateCarrierOrderDiagnostics(
	order: CarrierOrderSummaryRecord,
): OperationalDiagnostic[] {
	const diagnostics: OperationalDiagnostic[] = [];
	const liveShipments = order.shipments.filter(
		(shipment) => shipment.status !== "cancelled",
	);
	const disruptedShipments = liveShipments.filter((shipment) =>
		disruptedShipmentStatuses.has(shipment.status),
	);

	const compatibleStatuses =
		carrierOrderStatusShipmentCompatibility[order.status];
	if (compatibleStatuses) {
		// Disrupted shipments are exempted and reported below under their own code,
		// the way `shipment-diagnostics.ts` exempts disrupted packages: without it a
		// single delayed shipment makes its whole booking report a structural
		// contradiction it does not have.
		const incompatible = liveShipments.filter(
			(shipment) =>
				!disruptedShipmentStatuses.has(shipment.status) &&
				!compatibleStatuses.has(shipment.status),
		);

		if (incompatible.length > 0) {
			// `warning`, not `critical`, unlike its shipment/package counterpart: every
			// critical rule in the repo guards demand conservation or a broken command
			// precondition, and a carrier order carries no quantity while nothing
			// downstream derives from its status. An inconsistent one misleads an
			// operator without endangering data.
			diagnostics.push({
				code: "carrierOrder.status.aggregateAheadOfShipments",
				severity: "warning",
				message:
					"El estado de la orden de transporte esta por delante de sus envios.",
				refs: {
					carrierOrderId: order.id,
					shipmentCount: incompatible.length,
				},
			});
		}
	}

	if (
		(order.status === "inTransit" || order.status === "completed") &&
		liveShipments.length === 0
	) {
		diagnostics.push({
			code: "carrierOrder.noShipments",
			severity: "warning",
			message:
				"La orden de transporte esta en curso pero no tiene envios activos.",
			refs: { carrierOrderId: order.id },
		});
	}

	if (closedCarrierOrderStatuses.has(order.status)) {
		const unsettled = order.shipments.filter(
			(shipment) => !settledShipmentStatuses.has(shipment.status),
		);

		if (unsettled.length > 0) {
			diagnostics.push({
				code: "carrierOrder.closedWithLiveShipments",
				severity: "warning",
				message:
					"La orden de transporte esta cerrada pero conserva envios en curso.",
				refs: { carrierOrderId: order.id, shipmentCount: unsettled.length },
			});
		}
	}

	// Only on a booking that is itself fine: a failed order whose shipments are
	// disrupted is the same fact stated twice, the refinement `shipment.package
	// .disrupted` already carries.
	if (
		disruptedShipments.length > 0 &&
		!closedCarrierOrderStatuses.has(order.status)
	) {
		diagnostics.push({
			code: "carrierOrder.shipment.disrupted",
			severity: "warning",
			message: "La orden de transporte tiene envios demorados o fallidos.",
			refs: {
				carrierOrderId: order.id,
				shipmentCount: disruptedShipments.length,
			},
		});
	}

	return diagnostics;
}
