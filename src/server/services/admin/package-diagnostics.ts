import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { decimal, sumDecimals } from "./operational-diagnostics.types";
import type { PackageDetailRecord } from "./package.data";

const compatiblePackageLineStatuses: Partial<
	Record<PackageDetailRecord["status"], Set<string>>
> = {
	readyForShipment: new Set(["packed", "shipped", "received"]),
	inTransit: new Set(["shipped", "received"]),
	received: new Set(["received"]),
};

export function calculatePackageDiagnostics(
	pkg: PackageDetailRecord,
): OperationalDiagnostic[] {
	const diagnostics: OperationalDiagnostic[] = [];

	if (
		(pkg.status === "inTransit" || pkg.status === "received") &&
		!pkg.shipment
	) {
		diagnostics.push({
			code: "package.shipment.missing",
			severity: "warning",
			message: "El paquete esta en transito o recibido pero no tiene envio.",
			refs: { packageId: pkg.id },
		});
	}

	const compatibleStatuses = compatiblePackageLineStatuses[pkg.status];
	if (compatibleStatuses) {
		const incompatible = pkg.packageLotItems.filter(
			(line) => !compatibleStatuses.has(line.status),
		);
		if (incompatible.length > 0) {
			diagnostics.push({
				code: "package.status.aggregateAheadOfLines",
				severity: "warning",
				message:
					"El estado agregado del paquete esta por delante de sus lineas.",
				refs: { packageId: pkg.id, packageLineCount: incompatible.length },
			});
		}
	}

	for (const line of pkg.packageLotItems) {
		const allocationQuantity = sumDecimals(
			line.packageAllocations.map((allocation) => allocation.quantity),
		);

		if (line.packageAllocations.length === 0) {
			diagnostics.push({
				code: "package.line.noPackagedAllocations",
				severity: "warning",
				message: `La linea de paquete #${line.id} no tiene asignaciones.`,
				refs: { packageId: pkg.id, packageLotItemId: line.id },
			});
		}

		if (!decimal(line.quantity).equals(allocationQuantity)) {
			diagnostics.push({
				code: "package.line.quantityMismatch",
				severity: "critical",
				message: `La cantidad de la linea #${line.id} no coincide con sus asignaciones.`,
				refs: { packageId: pkg.id, packageLotItemId: line.id },
			});
		}

		for (const allocation of line.packageAllocations) {
			if (
				decimal(allocation.quantity).greaterThan(
					allocation.cartItemLotItem.quantity,
				)
			) {
				diagnostics.push({
					code: "package.allocation.exceedsDemandAllocation",
					severity: "critical",
					message: `La asignacion empaquetada #${allocation.id} excede su demanda origen.`,
					refs: {
						packageId: pkg.id,
						packageAllocationId: allocation.id,
						cartItemLotItemId: allocation.cartItemLotItem.id,
					},
				});
			}
		}
	}

	return diagnostics;
}
