import type { OperationSummaryRecord } from "./operation.data";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { decimal, sumDecimals } from "./operational-diagnostics.types";

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
export function calculateOperationDiagnostics(
	operation: OperationSummaryRecord,
): OperationalDiagnostic[] {
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

	const lotItemQuantity = sumDecimals(
		operation.lots.flatMap((lot) => lot.lotItems.map((item) => item.quantity)),
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
	}

	return diagnostics;
}
