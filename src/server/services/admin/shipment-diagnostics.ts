import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import type { ShipmentDetailRecord } from "./shipment.data";

const shipmentPackageCompatibility: Partial<
	Record<ShipmentDetailRecord["status"], Set<string>>
> = {
	inTransit: new Set(["inTransit", "received"]),
	received: new Set(["received"]),
};

const shipmentLineCompatibility: Partial<
	Record<ShipmentDetailRecord["status"], Set<string>>
> = {
	inTransit: new Set(["shipped", "received"]),
	received: new Set(["received"]),
};

export function calculateShipmentDiagnostics(
	shipment: ShipmentDetailRecord,
	hasTrackingEvents: boolean,
): OperationalDiagnostic[] {
	const diagnostics: OperationalDiagnostic[] = [];

	if (shipment.packages.length === 0) {
		diagnostics.push({
			code: "shipment.package.missing",
			severity: "warning",
			message: "El envio no tiene paquetes asociados.",
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

	const compatiblePackages = shipmentPackageCompatibility[shipment.status];
	if (compatiblePackages) {
		const incompatible = shipment.packages.filter(
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

	const compatibleLines = shipmentLineCompatibility[shipment.status];
	if (compatibleLines) {
		const incompatibleLineCount = shipment.packages.reduce(
			(count, pkg) =>
				count +
				pkg.packageLotItems.filter((line) => !compatibleLines.has(line.status))
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
