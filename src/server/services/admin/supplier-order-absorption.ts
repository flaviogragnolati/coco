import { Prisma } from "~/prisma/client";
import { AdminCrudError } from "./_base/admin-crud.errors";

/**
 * Cut absorption: how a supplier's shortfall on one lot line is taken out of the
 * specific demand allocations behind it. The default is LIFO by payment date —
 * the most recent payer loses quantity first — and an operator may override the
 * split per allocation. Pure: no `db`, no `tx`, no clock.
 */

export type AbsorptionCandidate = {
	/** `CartItemLotItem.id` */
	allocationId: number;
	cartItemId: number;
	/** Current live allocation quantity. */
	quantity: Prisma.Decimal;
	paidAt: Date | null;
	orderItemCreatedAt: Date | null;
};

export type AbsorptionOverride = {
	allocationId: number;
	removedQuantity: Prisma.Decimal;
};

export type AbsorptionReduction = {
	allocationId: number;
	cartItemId: number;
	removedQuantity: Prisma.Decimal;
	remainingQuantity: Prisma.Decimal;
};

const zero = () => new Prisma.Decimal(0);

function sumDecimals(values: Prisma.Decimal[]) {
	return values.reduce((total, value) => total.plus(value), zero());
}

/**
 * Descending by payment date, then by order-item creation, then by cart item id
 * — the architecture's demand ordering read backwards. A `null` `paidAt` sorts
 * first: an allocation with no resolvable payment is treated as the most recent,
 * so it absorbs before anything that is demonstrably paid.
 */
export function orderCandidatesLifo(
	candidates: AbsorptionCandidate[],
): AbsorptionCandidate[] {
	return [...candidates].sort((left, right) => {
		if (left.paidAt === null && right.paidAt !== null) return -1;
		if (left.paidAt !== null && right.paidAt === null) return 1;
		if (left.paidAt !== null && right.paidAt !== null) {
			const paidDiff = right.paidAt.getTime() - left.paidAt.getTime();
			if (paidDiff !== 0) return paidDiff;
		}

		const leftCreated = left.orderItemCreatedAt?.getTime() ?? null;
		const rightCreated = right.orderItemCreatedAt?.getTime() ?? null;
		if (leftCreated === null && rightCreated !== null) return -1;
		if (leftCreated !== null && rightCreated === null) return 1;
		if (leftCreated !== null && rightCreated !== null) {
			const createdDiff = rightCreated - leftCreated;
			if (createdDiff !== 0) return createdDiff;
		}

		return right.cartItemId - left.cartItemId;
	});
}

function planFromOverrides(input: {
	candidates: AbsorptionCandidate[];
	cut: Prisma.Decimal;
	overrides: AbsorptionOverride[];
}): AbsorptionReduction[] {
	const byId = new Map(
		input.candidates.map((candidate) => [candidate.allocationId, candidate]),
	);
	const seen = new Set<number>();
	const reductions: AbsorptionReduction[] = [];

	for (const override of input.overrides) {
		const candidate = byId.get(override.allocationId);
		if (!candidate) {
			throw new AdminCrudError(
				"CONFLICT",
				`El reparto manual referencia una asignación que no pertenece a la línea (#${override.allocationId})`,
			);
		}
		if (seen.has(override.allocationId)) {
			throw new AdminCrudError(
				"CONFLICT",
				`El reparto manual repite la asignación #${override.allocationId}`,
			);
		}
		seen.add(override.allocationId);

		if (override.removedQuantity.lt(zero())) {
			throw new AdminCrudError(
				"CONFLICT",
				"El reparto manual no puede tener cantidades negativas",
			);
		}
		if (override.removedQuantity.gt(candidate.quantity)) {
			throw new AdminCrudError(
				"CONFLICT",
				`El reparto manual supera la cantidad asignada de #${override.allocationId}`,
			);
		}

		if (override.removedQuantity.equals(zero())) continue;

		reductions.push({
			allocationId: candidate.allocationId,
			cartItemId: candidate.cartItemId,
			removedQuantity: override.removedQuantity,
			remainingQuantity: candidate.quantity.minus(override.removedQuantity),
		});
	}

	const total = sumDecimals(
		input.overrides.map((override) => override.removedQuantity),
	);
	if (!total.equals(input.cut)) {
		throw new AdminCrudError(
			"CONFLICT",
			`El reparto manual suma ${total.toString()} y el recorte es ${input.cut.toString()}`,
		);
	}

	return reductions;
}

/**
 * Distribute `cut` across `candidates`, conserving quantity exactly: the sum of
 * the returned `removedQuantity` always equals `cut` (ADR 0005). Overrides
 * replace LIFO entirely rather than seeding it — a partially specified split
 * would silently reintroduce the ordering the operator was overriding.
 */
export function planCutAbsorption(input: {
	candidates: AbsorptionCandidate[];
	cut: Prisma.Decimal;
	overrides?: AbsorptionOverride[];
}): AbsorptionReduction[] {
	if (input.cut.lte(zero())) return [];

	const available = sumDecimals(
		input.candidates.map((candidate) => candidate.quantity),
	);
	if (input.cut.gt(available)) {
		throw new AdminCrudError(
			"CONFLICT",
			`El recorte de ${input.cut.toString()} supera la demanda asignada de ${available.toString()}`,
		);
	}

	if (input.overrides !== undefined) {
		return planFromOverrides({
			candidates: input.candidates,
			cut: input.cut,
			overrides: input.overrides,
		});
	}

	let remainingCut = input.cut;
	const reductions: AbsorptionReduction[] = [];

	for (const candidate of orderCandidatesLifo(input.candidates)) {
		if (remainingCut.lte(zero())) break;
		if (candidate.quantity.lte(zero())) continue;

		const removedQuantity = remainingCut.gt(candidate.quantity)
			? candidate.quantity
			: remainingCut;

		reductions.push({
			allocationId: candidate.allocationId,
			cartItemId: candidate.cartItemId,
			removedQuantity,
			remainingQuantity: candidate.quantity.minus(removedQuantity),
		});
		remainingCut = remainingCut.minus(removedQuantity);
	}

	return reductions;
}
