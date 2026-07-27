import { Prisma } from "~/prisma/client";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	type AbsorptionOverride,
	orderCandidatesLifo,
	planCutAbsorption,
} from "./supplier-order-absorption";

/**
 * How inbound packaged quantity is matched to the demand behind a lot line, in
 * both directions:
 *
 * - **Coverage** (dispatch): a dispatched quantity is spread over the line's
 *   uncovered demand **FIFO by payment date** — the earliest payer is served
 *   first. That is the mirror image of cut absorption, where the *latest* payer
 *   loses first, so the two policies together never punish the same customer
 *   twice.
 * - **Shortfall** (receipt discrepancy, write-off): missing quantity is taken
 *   back out of the packaged allocations, which is the same arithmetic
 *   `planCutAbsorption` already performs — it is delegated to, not re-derived.
 *
 * Pure: no `db`, no `tx`, no clock.
 */

export type CoverageCandidate = {
	/** `CartItemLotItem.id` */
	allocationId: number;
	cartItemId: number;
	/** Allocation quantity not yet covered by a live inbound packaged allocation. */
	uncoveredQuantity: Prisma.Decimal;
	paidAt: Date | null;
	orderItemCreatedAt: Date | null;
};

export type CoverageAssignment = {
	allocationId: number;
	cartItemId: number;
	quantity: Prisma.Decimal;
};

export type ShortfallCandidate = {
	/** `PackageAllocation.id` */
	packagedAllocationId: number;
	/** `CartItemLotItem.id` behind it. */
	allocationId: number;
	cartItemId: number;
	packagedQuantity: Prisma.Decimal;
	paidAt: Date | null;
	orderItemCreatedAt: Date | null;
};

export type ShortfallReduction = {
	packagedAllocationId: number;
	allocationId: number;
	cartItemId: number;
	removedQuantity: Prisma.Decimal;
	remainingPackagedQuantity: Prisma.Decimal;
};

const zero = () => new Prisma.Decimal(0);

function sumDecimals(values: Prisma.Decimal[]) {
	return values.reduce((total, value) => total.plus(value), zero());
}

/**
 * FIFO by payment date. The array `orderCandidatesLifo` returns is reversed
 * rather than sorted with the inverse comparator: reversing keeps a
 * deterministic order for candidates whose keys tie, instead of letting the
 * tie-breaks flip arbitrarily.
 */
function orderCandidatesFifo(
	candidates: CoverageCandidate[],
): CoverageCandidate[] {
	const byId = new Map(
		candidates.map((candidate) => [candidate.allocationId, candidate]),
	);

	return orderCandidatesLifo(
		candidates.map((candidate) => ({
			allocationId: candidate.allocationId,
			cartItemId: candidate.cartItemId,
			quantity: candidate.uncoveredQuantity,
			paidAt: candidate.paidAt,
			orderItemCreatedAt: candidate.orderItemCreatedAt,
		})),
	)
		.reverse()
		.flatMap((ordered) => {
			const candidate = byId.get(ordered.allocationId);
			return candidate ? [candidate] : [];
		});
}

/**
 * Distribute a dispatched `quantity` across the line's uncovered demand,
 * conserving quantity exactly: the sum of the returned assignments always
 * equals `quantity` (ADR 0005).
 */
export function planPackagedCoverage(input: {
	candidates: CoverageCandidate[];
	quantity: Prisma.Decimal;
}): CoverageAssignment[] {
	if (input.quantity.lte(zero())) return [];

	const available = sumDecimals(
		input.candidates.map((candidate) => candidate.uncoveredQuantity),
	);
	if (input.quantity.gt(available)) {
		throw new AdminCrudError(
			"CONFLICT",
			`El despacho de ${input.quantity.toString()} supera la demanda sin cubrir de ${available.toString()}`,
		);
	}

	let remaining = input.quantity;
	const assignments: CoverageAssignment[] = [];

	for (const candidate of orderCandidatesFifo(input.candidates)) {
		if (remaining.lte(zero())) break;
		if (candidate.uncoveredQuantity.lte(zero())) continue;

		const quantity = remaining.gt(candidate.uncoveredQuantity)
			? candidate.uncoveredQuantity
			: remaining;

		assignments.push({
			allocationId: candidate.allocationId,
			cartItemId: candidate.cartItemId,
			quantity,
		});
		remaining = remaining.minus(quantity);
	}

	return assignments;
}

/**
 * Take `shortfall` back out of the line's packaged allocations. Delegates the
 * split to `planCutAbsorption` — LIFO by payment date, with the same override
 * semantics — and re-attaches the `PackageAllocation` id each reduction belongs
 * to, which the caller needs to write the reduction back.
 */
export function planPackagedShortfall(input: {
	candidates: ShortfallCandidate[];
	shortfall: Prisma.Decimal;
	overrides?: AbsorptionOverride[];
}): ShortfallReduction[] {
	const byAllocationId = new Map(
		input.candidates.map((candidate) => [candidate.allocationId, candidate]),
	);

	const reductions = planCutAbsorption({
		candidates: input.candidates.map((candidate) => ({
			allocationId: candidate.allocationId,
			cartItemId: candidate.cartItemId,
			quantity: candidate.packagedQuantity,
			paidAt: candidate.paidAt,
			orderItemCreatedAt: candidate.orderItemCreatedAt,
		})),
		cut: input.shortfall,
		overrides: input.overrides,
	});

	return reductions.flatMap((reduction) => {
		const candidate = byAllocationId.get(reduction.allocationId);
		if (!candidate) return [];

		return [
			{
				packagedAllocationId: candidate.packagedAllocationId,
				allocationId: reduction.allocationId,
				cartItemId: reduction.cartItemId,
				removedQuantity: reduction.removedQuantity,
				remainingPackagedQuantity: reduction.remainingQuantity,
			},
		];
	});
}

/**
 * Split a package line: decide which of its packaged allocations `movedQuantity`
 * leaves with. `removedQuantity` is what has to be **created** on the destination
 * line; `remainingPackagedQuantity` is what stays on the source. Nothing is lost
 * — unlike a shortfall, which also reduces the demand allocation and the lot
 * line (see `applyPackagedShortfall`).
 *
 * The arithmetic is `planPackagedShortfall`'s, so the underlying policy is LIFO
 * by payment date. For a split that policy carries **no fairness meaning**: which
 * customer's units land in which physical box is arbitrary, and the only
 * properties that matter are that it is deterministic and that it conserves. Do
 * not "correct" it to FIFO — there is nothing to correct.
 */
export function planPackagedSplit(input: {
	candidates: ShortfallCandidate[];
	movedQuantity: Prisma.Decimal;
	overrides?: AbsorptionOverride[];
}): ShortfallReduction[] {
	return planPackagedShortfall({
		candidates: input.candidates,
		shortfall: input.movedQuantity,
		overrides: input.overrides,
	});
}
