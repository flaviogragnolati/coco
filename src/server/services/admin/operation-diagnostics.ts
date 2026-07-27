import { isLiveLotItem } from "~/server/services/operations/operation-counters";
import type { OperationSummaryRecord } from "./operation.data";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { decimal, sumDecimals } from "./operational-diagnostics.types";

export type OperationDiagnosticsOptions = {
	/**
	 * Batches created before this instant have had enough later operations run
	 * that an open roll over is stale. Null or omitted disables the rule.
	 */
	staleOpenRollOverBefore?: Date | null;
};

/**
 * Read-only consistency rules for an aggregation batch. Evaluated identically
 * for the list summary and the detail view — the list query selects the same
 * thin relations these rules read, so a row's diagnostic count always matches
 * what the modal shows.
 *
 * The quantity rules need no status guard: an operation only receives its
 * quantities when it completes, so running and failed batches sit at zero and
 * balance trivially.
 */
/**
 * A compensated operation is exempt from every rule above and answers to this
 * one instead. The exemption is structural, not cosmetic: compensation
 * recomputes the live counters to zero while `eligibleQuantity` stays the frozen
 * execution snapshot (architecture §11), so `operation.quantity.balanceMismatch`
 * would fire on every cancelled operation by construction. What actually matters
 * afterwards is that nothing live survived the compensation.
 */
function calculateCancelledOperationDiagnostics(
	operation: OperationSummaryRecord,
): OperationalDiagnostic[] {
	const liveLotItems = operation.lots.flatMap((lot) =>
		lot.lotItems.filter((item) => isLiveLotItem(lot, item)),
	);
	const openRollOvers = operation.rollOvers.filter(
		(rollOver) => rollOver.status === "open",
	);

	if (liveLotItems.length === 0 && openRollOvers.length === 0) return [];

	return [
		{
			code: "operation.cancelled.notCompensated",
			severity: "critical",
			message:
				"La operación está cancelada pero conserva líneas activas o rollovers abiertos.",
			refs: {
				operationId: operation.id,
				lotItemCount: liveLotItems.length,
				rollOverCount: openRollOvers.length,
			},
		},
	];
}

export function calculateOperationDiagnostics(
	operation: OperationSummaryRecord,
	options?: OperationDiagnosticsOptions,
): OperationalDiagnostic[] {
	if (operation.status === "cancelled") {
		return calculateCancelledOperationDiagnostics(operation);
	}

	const diagnostics: OperationalDiagnostic[] = [];

	const eligible = decimal(operation.eligibleQuantity);
	const assigned = decimal(operation.assignedQuantity);
	const rolledOver = decimal(operation.rollOverQuantity);

	if (!eligible.equals(assigned.plus(rolledOver))) {
		diagnostics.push({
			code: "operation.quantity.balanceMismatch",
			severity: "critical",
			message:
				"La cantidad elegible no coincide con la suma de asignada y rollover.",
			refs: { operationId: operation.id },
		});
	}

	// Same predicate `computeOperationCounters` applies. If the two ever diverge,
	// `assignedMismatch` fires on every cancellation.
	const lotItemQuantity = sumDecimals(
		operation.lots.flatMap((lot) =>
			lot.lotItems
				.filter((item) => isLiveLotItem(lot, item))
				.map((item) => item.quantity),
		),
	);

	if (!assigned.equals(lotItemQuantity)) {
		diagnostics.push({
			code: "operation.quantity.assignedMismatch",
			severity: "critical",
			message:
				"La cantidad asignada no coincide con las líneas de lote generadas.",
			refs: { operationId: operation.id, lotCount: operation.lots.length },
		});
	}

	if (operation.status === "completed" && operation.lots.length === 0) {
		diagnostics.push({
			code: "operation.completed.noLots",
			severity: "warning",
			message: "La operación está completada pero no generó lotes.",
			refs: { operationId: operation.id },
		});
	}

	if (
		operation.status === "failed" &&
		(operation.lots.length > 0 || operation.rollOvers.length > 0)
	) {
		diagnostics.push({
			code: "operation.failed.withOutputs",
			severity: "warning",
			message: "La operación falló pero dejó lotes o rollovers registrados.",
			refs: {
				operationId: operation.id,
				lotCount: operation.lots.length,
				rollOverCount: operation.rollOvers.length,
			},
		});
	}

	// Rolled up into a single finding: one diagnostic per lot would flood the
	// list summary of any operation that sourced from several suppliers.
	const lotsWithoutSupplierOrder = operation.lots.filter(
		(lot) => lot.supplierOrder === null,
	);

	if (lotsWithoutSupplierOrder.length > 0) {
		diagnostics.push({
			code: "operation.lot.missingSupplierOrder",
			severity: "warning",
			message: `${lotsWithoutSupplierOrder.length} lote(s) de la operación no tienen orden de proveedor.`,
			refs: {
				operationId: operation.id,
				lotCount: lotsWithoutSupplierOrder.length,
			},
		});
	}

	const openRollOvers = operation.rollOvers.filter(
		(rollOver) => rollOver.status === "open",
	);

	if (openRollOvers.length > 0) {
		diagnostics.push({
			code: "operation.rollOver.open",
			severity: "warning",
			message: `La operación tiene ${openRollOvers.length} rollover(s) sin resolver.`,
			refs: {
				operationId: operation.id,
				rollOverCount: openRollOvers.length,
			},
		});

		const staleBefore = options?.staleOpenRollOverBefore;
		if (staleBefore && operation.createdAt < staleBefore) {
			diagnostics.push({
				code: "operation.rollOver.stale",
				severity: "warning",
				message: `La operación arrastra ${openRollOvers.length} rollover(s) abierto(s) desde hace varias operaciones.`,
				refs: {
					operationId: operation.id,
					rollOverCount: openRollOvers.length,
				},
			});
		}
	}

	return diagnostics;
}
