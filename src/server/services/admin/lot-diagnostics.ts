import {
	lotStatusLineCompatibility,
	unresolvedDemandFulfillmentStatuses,
} from "~/shared/common/fulfillment-transitions";
import type { LotSummaryRecord } from "./lot.data";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { decimal, sumDecimals } from "./operational-diagnostics.types";

export function calculateLotDiagnostics(
	lot: LotSummaryRecord,
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

	// Cancelled lines are excluded throughout: a partially cancelled lot is a
	// correct outcome of a supplier refusal, not an inconsistency.
	const liveLotItems = lot.lotItems.filter(
		(item) => item.status !== "cancelled",
	);

	const compatibleStatuses = lotStatusLineCompatibility[lot.status];
	if (compatibleStatuses) {
		const incompatible = liveLotItems.filter(
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

	for (const lotItem of liveLotItems) {
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

	// A lot cancelled by an **operation compensation** is exempt, the same way §14
	// exempts the compensated operation itself: compensation is status-only and
	// returns its cart items to `awaitingAggregation` — unresolved demand by this
	// rule's definition, and the correct outcome. A lot cancelled through the
	// supplier loop keeps the rule, because that path mints roll overs instead.
	const compensated = lot.operation.status === "cancelled";

	if (lot.status === "cancelled" && !compensated) {
		// `unresolvedDemand…`, not `activeDemand…`: the latter counts `rolledOver`,
		// which is exactly what a correct cancellation produces.
		const hasUnresolvedDemand = lot.lotItems.some((lotItem) =>
			lotItem.cartItemLotItems.some((allocation) =>
				unresolvedDemandFulfillmentStatuses.has(
					allocation.cartItem.fulfillmentStatus,
				),
			),
		);

		if (hasUnresolvedDemand) {
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
