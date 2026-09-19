import { Prisma } from "~/prisma/client";
import { AdminCrudError } from "./_base/admin-crud.errors";

/**
 * Fractionation: turning a selection of **received inbound** packages into one
 * **outbound** package per customer. The planner decides only the shape of the
 * outbound records — which cart gets which lot lines, at which quantities — and
 * never touches the source: the inbound package stays `received` as the arrival
 * history (architecture §11, ADR 0004 per-leg conservation).
 *
 * Pure: no `db`, no `tx`, no clock. Mirrors `supplier-order-absorption.ts`.
 */

export type FractionationCandidate = {
	sourcePackageId: number;
	sourcePackageLotItemId: number;
	/** `PackageAllocation.id` on the inbound line. */
	packagedAllocationId: number;
	/** `CartItemLotItem.id` behind it. */
	allocationId: number;
	cartItemId: number;
	cartId: number;
	lotItemId: number;
	/** Received inbound quantity of this allocation minus what was already fractionated out. */
	availableQuantity: Prisma.Decimal;
};

export type FractionationGroup = {
	cartId: number;
	lines: Array<{
		lotItemId: number;
		quantity: Prisma.Decimal;
		allocations: Array<{
			allocationId: number;
			cartItemId: number;
			quantity: Prisma.Decimal;
			/** Null when the row merges quantity taken from several sources. */
			sourcePackageId: number | null;
		}>;
	}>;
};

export type FractionationRequest = {
	packagedAllocationId: number;
	quantity: Prisma.Decimal;
};

const zero = () => new Prisma.Decimal(0);

function sumDecimals(values: Prisma.Decimal[]) {
	return values.reduce((total, value) => total.plus(value), zero());
}

/**
 * Resolve how much of each candidate is actually taken. Without `requested` the
 * whole available quantity of every candidate goes out — the "fraccionar todo"
 * default the dialog binds to.
 */
function resolveTaken(input: {
	candidates: FractionationCandidate[];
	requested?: FractionationRequest[];
}): Array<{ candidate: FractionationCandidate; quantity: Prisma.Decimal }> {
	if (input.requested === undefined) {
		return input.candidates.map((candidate) => ({
			candidate,
			quantity: candidate.availableQuantity,
		}));
	}

	const byPackagedAllocationId = new Map(
		input.candidates.map((candidate) => [
			candidate.packagedAllocationId,
			candidate,
		]),
	);
	const seen = new Set<number>();
	const taken: Array<{
		candidate: FractionationCandidate;
		quantity: Prisma.Decimal;
	}> = [];

	for (const request of input.requested) {
		const candidate = byPackagedAllocationId.get(request.packagedAllocationId);
		if (!candidate) {
			throw new AdminCrudError(
				"CONFLICT",
				`El fraccionamiento referencia una asignación que no pertenece a la selección (#${request.packagedAllocationId})`,
			);
		}
		if (seen.has(request.packagedAllocationId)) {
			throw new AdminCrudError(
				"CONFLICT",
				`El fraccionamiento repite la asignación #${request.packagedAllocationId}`,
			);
		}
		seen.add(request.packagedAllocationId);

		if (request.quantity.lt(zero())) {
			throw new AdminCrudError(
				"CONFLICT",
				"El fraccionamiento no puede tener cantidades negativas",
			);
		}
		if (request.quantity.gt(candidate.availableQuantity)) {
			throw new AdminCrudError(
				"CONFLICT",
				`El fraccionamiento de ${request.quantity.toString()} supera la cantidad disponible de ${candidate.availableQuantity.toString()} en la asignación #${request.packagedAllocationId}`,
			);
		}

		taken.push({ candidate, quantity: request.quantity });
	}

	return taken;
}

/**
 * Group the taken candidates into one outbound package per customer, conserving
 * quantity exactly: Σ of every planned allocation quantity equals Σ of what was
 * taken (ADR 0005).
 *
 * Groups come back in ascending `cartId` and their lines in ascending
 * `lotItemId`, so a fractionation of the same selection always writes the same
 * rows in the same order.
 */
export function planFractionation(input: {
	candidates: FractionationCandidate[];
	requested?: FractionationRequest[];
}): FractionationGroup[] {
	const taken = resolveTaken(input).filter((entry) =>
		entry.quantity.gt(zero()),
	);

	// The same customer can appear twice for one lot item — two `CartItemLotItem`
	// rows through different operations — so the merge keys on (cart, lot item)
	// and keeps both allocations rather than letting one overwrite the other.
	// One demand allocation taken from two sources is the opposite case: the
	// outbound line holds one row per demand allocation, so the two merge and the
	// row loses its single source.
	type PlannedAllocations = FractionationGroup["lines"][number]["allocations"];
	const byCart = new Map<number, Map<number, PlannedAllocations>>();

	for (const entry of taken) {
		const lines =
			byCart.get(entry.candidate.cartId) ??
			new Map<number, PlannedAllocations>();
		byCart.set(entry.candidate.cartId, lines);

		const allocations = lines.get(entry.candidate.lotItemId) ?? [];
		lines.set(entry.candidate.lotItemId, allocations);

		const existing = allocations.find(
			(allocation) => allocation.allocationId === entry.candidate.allocationId,
		);
		if (existing) {
			existing.quantity = existing.quantity.plus(entry.quantity);
			if (existing.sourcePackageId !== entry.candidate.sourcePackageId) {
				existing.sourcePackageId = null;
			}
			continue;
		}

		allocations.push({
			allocationId: entry.candidate.allocationId,
			cartItemId: entry.candidate.cartItemId,
			quantity: entry.quantity,
			sourcePackageId: entry.candidate.sourcePackageId,
		});
	}

	return Array.from(byCart.entries())
		.sort(([left], [right]) => left - right)
		.map(([cartId, lines]) => ({
			cartId,
			lines: Array.from(lines.entries())
				.sort(([left], [right]) => left - right)
				.map(([lotItemId, allocations]) => ({
					lotItemId,
					quantity: sumDecimals(
						allocations.map((allocation) => allocation.quantity),
					),
					allocations,
				})),
		}))
		.filter((group) => group.lines.length > 0);
}
