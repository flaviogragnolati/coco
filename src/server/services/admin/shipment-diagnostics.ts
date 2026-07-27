import {
	shipmentStatusLineCompatibility,
	shipmentStatusPackageCompatibility,
} from "~/shared/common/fulfillment-transitions";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import type { ShipmentSummaryRecord } from "./shipment.data";

const disruptedPackageStatuses: ReadonlySet<string> = new Set([
	"delayed",
	"failed",
]);

export type ShipmentDiagnosticsOptions = {
	/**
	 * Shipments whose `updatedAt` predates this instant have been travelling long
	 * enough to chase. Null or omitted disables the rule that reads it.
	 */
	staleBefore?: Date | null;
};

export function calculateShipmentDiagnostics(
	shipment: ShipmentSummaryRecord,
	hasTrackingEvents: boolean,
	options?: ShipmentDiagnosticsOptions,
): OperationalDiagnostic[] {
	const diagnostics: OperationalDiagnostic[] = [];
	const livePackages = shipment.packages.filter(
		(pkg) => pkg.status !== "cancelled",
	);
	const liveLines = (pkg: ShipmentSummaryRecord["packages"][number]) =>
		pkg.packageLotItems.filter((line) => line.status !== "cancelled");

	// `retry` deliberately empties the source shipment — the packages move to a new
	// one and this row stays `failed` as history (architecture §8). A cancelled
	// shipment is emptied for the same reason.
	if (
		shipment.packages.length === 0 &&
		shipment.status !== "failed" &&
		shipment.status !== "cancelled"
	) {
		diagnostics.push({
			code: "shipment.package.missing",
			severity: "warning",
			message: "El envio no tiene paquetes asociados.",
			refs: { shipmentId: shipment.id },
		});
	}

	// §15 #12's "a failed shipment requires retry-or-write-off", enforced as a
	// worklist signal rather than a hard block: diagnostics never mutate (§14).
	if (
		shipment.status === "failed" &&
		livePackages.some((pkg) => liveLines(pkg).length > 0)
	) {
		diagnostics.push({
			code: "shipment.failedWithoutFollowUp",
			severity: "warning",
			message:
				"El envio fallido conserva paquetes activos; falta reintentar o dar de baja.",
			refs: { shipmentId: shipment.id, packageCount: livePackages.length },
		});
	}

	// A `received` pickup-point shipment legitimately holds packages that are still
	// `inTransit`: reaching the collection point is not the handover, and each
	// customer confirms their own collection with `package.confirmDelivery`. Every
	// `received`-row rule below would read that correct state as a contradiction,
	// so the mode is exempted from all three — and `pendingCollection` replaces the
	// signal rather than removing it.
	//
	// Scoped to `pickupPoint` **only**: on a home delivery `received` genuinely does
	// mean every package arrived, and exempting that would blind the rule that says so.
	const awaitingCollection =
		shipment.status === "received" &&
		shipment.type === "endUserDelivery" &&
		shipment.deliveryMode === "pickupPoint";

	if (shipment.status === "received" && !awaitingCollection) {
		const notReceived = livePackages.reduce(
			(count, pkg) =>
				count +
				liveLines(pkg).filter((line) => line.status !== "received").length,
			0,
		);

		if (notReceived > 0) {
			diagnostics.push({
				code: "shipment.received.linesNotReceived",
				severity: "critical",
				message: "El envio recibido conserva lineas activas sin recibir.",
				refs: { shipmentId: shipment.id, packageLineCount: notReceived },
			});
		}
	}

	if (awaitingCollection) {
		const pendingPackages = livePackages.filter(
			(pkg) => pkg.status !== "received",
		);

		if (pendingPackages.length > 0) {
			diagnostics.push({
				code: "shipment.pickupPoint.pendingCollection",
				severity: "warning",
				message:
					"El envio llego al punto de retiro y espera que los clientes retiren.",
				refs: { shipmentId: shipment.id, packageCount: pendingPackages.length },
			});
		}
	}

	// Prisma cannot express a conditional NOT NULL, so this is the enforcement of
	// "an end-user delivery always carries a mode" — the field `deliver` branches on.
	if (
		shipment.type === "endUserDelivery" &&
		shipment.deliveryMode === null &&
		shipment.status !== "cancelled"
	) {
		diagnostics.push({
			code: "shipment.endUser.noDeliveryMode",
			severity: "critical",
			message: "El envio al cliente no tiene modo de entrega.",
			refs: { shipmentId: shipment.id },
		});
	}

	// Anchored on `updatedAt` rather than a departure column, which does not exist
	// (§15.3). Sound here for a specific reason: once a shipment is `inTransit` the
	// only writes left are terminal (`receive`, `deliver`, `markDelayed`,
	// `markFailed`) and `addPackages` is guarded to not-yet-departed shipments — so
	// nothing moves the timestamp between departure and arrival.
	if (
		shipment.type === "internalTransfer" &&
		shipment.status === "inTransit" &&
		options?.staleBefore &&
		shipment.updatedAt < options.staleBefore
	) {
		diagnostics.push({
			code: "shipment.dispatch.notReceived",
			severity: "warning",
			message:
				"El envio interno lleva varios dias en transito y todavia no se recibio.",
			refs: { shipmentId: shipment.id },
		});
	}

	if (shipment.trackingCode && !shipment.carrierOrder) {
		diagnostics.push({
			code: "shipment.carrierOrder.missing",
			severity: "warning",
			message: "El envio tiene tracking code pero no tiene orden de carrier.",
			refs: { shipmentId: shipment.id },
		});
	}

	// A package can be `delayed` or `failed` on its own now (Phase 4a): a single
	// lost box inside an otherwise-fine shipment. That is a real signal but not a
	// contradiction, so it is exempted from the two compatibility rules — the way
	// cancelled packages already are — and reported under its own name and
	// severity. Do **not** widen `shipmentStatusPackageCompatibility` instead: the
	// same table feeds the `received` case, where a disrupted package genuinely is
	// a contradiction.
	const disruptedPackages = livePackages.filter((pkg) =>
		disruptedPackageStatuses.has(pkg.status),
	);
	const undisruptedPackages = livePackages.filter(
		(pkg) => !disruptedPackageStatuses.has(pkg.status),
	);

	// A disrupted shipment cascades its status to every package, so the rule would
	// be pure noise there — `shipment.failedWithoutFollowUp` already covers it. It
	// only means something when the shipment itself is fine.
	const shipmentItselfDisrupted = disruptedPackageStatuses.has(shipment.status);

	if (
		disruptedPackages.length > 0 &&
		!shipmentItselfDisrupted &&
		shipment.status !== "received"
	) {
		diagnostics.push({
			code: "shipment.package.disrupted",
			severity: "warning",
			message: "El envio tiene paquetes demorados o fallidos.",
			refs: { shipmentId: shipment.id, packageCount: disruptedPackages.length },
		});
	}

	const compatiblePackages = awaitingCollection
		? undefined
		: shipmentStatusPackageCompatibility[shipment.status];
	if (compatiblePackages) {
		const incompatible = undisruptedPackages.filter(
			(pkg) => !compatiblePackages.has(pkg.status),
		);
		if (incompatible.length > 0) {
			diagnostics.push({
				code: "shipment.status.aggregateAheadOfPackages",
				severity: "critical",
				message: "El estado del envio esta por delante de sus paquetes.",
				refs: { shipmentId: shipment.id, packageCount: incompatible.length },
			});
		}
	}

	const compatibleLines = awaitingCollection
		? undefined
		: shipmentStatusLineCompatibility[shipment.status];
	if (compatibleLines) {
		const incompatibleLineCount = undisruptedPackages.reduce(
			(count, pkg) =>
				count +
				liveLines(pkg).filter((line) => !compatibleLines.has(line.status))
					.length,
			0,
		);

		if (incompatibleLineCount > 0) {
			diagnostics.push({
				code: "shipment.packageLine.statusMismatch",
				severity: "critical",
				message: "El envio esta avanzado pero conserva lineas incompatibles.",
				refs: {
					shipmentId: shipment.id,
					packageLineCount: incompatibleLineCount,
				},
			});
		}
	}

	if (
		(shipment.status === "inTransit" || shipment.status === "received") &&
		!hasTrackingEvents
	) {
		diagnostics.push({
			code: "shipment.trackingEvents.missing",
			severity: "warning",
			message: "El envio avanzado no tiene eventos de tracking asociados.",
			refs: { shipmentId: shipment.id },
		});
	}

	return diagnostics;
}
