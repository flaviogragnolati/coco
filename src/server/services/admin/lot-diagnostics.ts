import type { LotDetailRecord } from "./lot.data";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { decimal, sumDecimals } from "./operational-diagnostics.types";

const activeDemandStatuses = new Set([
	"awaitingAggregation",
	"includedInOperation",
	"allocatedToSupplierItem",
	"requestedFromSupplier",
	"supplierConfirmed",
	"packaged",
	"inInternalShipment",
	"atWarehouse",
	"inEndUserShipment",
	"delivered",
	"partiallyRolledOver",
	"rolledOver",
	"exception",
]);

const compatibleLotItemStatuses: Partial<
	Record<LotDetailRecord["status"], Set<string>>
> = {
	requested: new Set([
		"requested",
		"confirmed",
		"readyForPackaging",
		"completed",
	]),
	confirmed: new Set(["confirmed", "readyForPackaging", "completed"]),
	readyForPackaging: new Set(["readyForPackaging", "completed"]),
	completed: new Set(["completed"]),
};

export function calculateLotDiagnostics(
	lot: LotDetailRecord,
): OperationalDiagnostic[] {
	const diagnostics: OperationalDiagnostic[] = [];

	if (!lot.supplierOrder) {
		diagnostics.push({
			code: "lot.supplierOrder.missing",
			severity: "warning",
			message: "El lote no tiene orden de proveedor asociada.",
			refs: { lotId: lot.id },
		});
	}

	const compatibleStatuses = compatibleLotItemStatuses[lot.status];
	if (compatibleStatuses) {
		const incompatible = lot.lotItems.filter(
			(item) => !compatibleStatuses.has(item.status),
		);
		if (incompatible.length > 0) {
			diagnostics.push({
				code: "lot.status.aggregateAheadOfLines",
				severity: "warning",
				message: "El estado agregado del lote esta por delante de sus lineas.",
				refs: { lotId: lot.id, lotItemCount: incompatible.length },
			});
		}
	}

	for (const lotItem of lot.lotItems) {
		const demandQuantity = sumDecimals(
			lotItem.cartItemLotItems.map((allocation) => allocation.quantity),
		);

		if (lotItem.cartItemLotItems.length === 0) {
			diagnostics.push({
				code: "lot.item.noDemandAllocations",
				severity: "warning",
				message: `La linea ${lotItem.code} no tiene demanda asignada.`,
				refs: { lotId: lot.id, lotItemId: lotItem.id },
			});
		}

		if (!decimal(lotItem.quantity).equals(demandQuantity)) {
			diagnostics.push({
				code: "lot.item.quantityMismatch",
				severity: "critical",
				message: `La cantidad de ${lotItem.code} no coincide con la demanda asignada.`,
				refs: { lotId: lot.id, lotItemId: lotItem.id },
			});
		}
	}

	if (lot.status === "cancelled") {
		const hasActiveDemand = lot.lotItems.some((lotItem) =>
			lotItem.cartItemLotItems.some((allocation) =>
				activeDemandStatuses.has(allocation.cartItem.fulfillmentStatus),
			),
		);

		if (hasActiveDemand) {
			diagnostics.push({
				code: "lot.cancelledWithActiveDemand",
				severity: "critical",
				message: "El lote esta cancelado pero conserva demanda activa.",
				refs: { lotId: lot.id },
			});
		}
	}

	return diagnostics;
}
