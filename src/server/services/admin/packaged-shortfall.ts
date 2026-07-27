import { Prisma } from "~/prisma/client";
import type { AdminPackagedLineChange } from "./operations-effects/operations-effects.types";
import {
	updatePackagedAllocationQuantity,
	updatePackageLineState,
} from "./package.data";
import {
	planPackagedShortfall,
	type ShortfallCandidate,
} from "./package-allocation-planner";
import type { PostAllocationRollOverInput } from "./roll-over.data";
import {
	updateAllocationQuantity,
	updateLotItemState,
} from "./supplier-order.data";
import type { AbsorptionOverride } from "./supplier-order-absorption";

/**
 * Applying a shortfall to one inbound package line. A receipt discrepancy and a
 * write-off are the same arithmetic on different triggers (architecture §21.2),
 * so both go through here rather than each re-deriving it.
 *
 * Four reductions per affected demand allocation, in this order so a mid-loop
 * throw leaves a consistent set behind (the transaction guarantees that anyway —
 * this is for readability):
 *
 * 1. `PackageAllocation.quantity` — the packaged coverage shrinks
 * 2. `CartItemLotItem.quantity`   — the demand allocation shrinks
 * 3. `PackageLotItem.quantity`    — the line records what actually arrived
 * 4. `LotItem.quantity`           — the supplier line records what actually arrived
 *
 * Then one post-allocation roll over per reduction, so the customer's unit is
 * conserved rather than lost (ADR 0005).
 */
export type PackagedShortfallLine = {
	packageId: number;
	packageLotItemId: number;
	/** Current `PackageLotItem.quantity`. */
	lineQuantity: Prisma.Decimal;
	shortfall: Prisma.Decimal;
	/**
	 * Nothing survives on this line. Its status becomes `cancelled` and its
	 * quantity stays as history — Phase 1's rule that a cancelled record keeps its
	 * quantity, since the status filter is what removes it from the counters.
	 */
	cancelLine: boolean;
	lotItemId: number;
	/** Current `LotItem.quantity`. */
	lotItemQuantity: Prisma.Decimal;
	/** The lot's own operation — never a "current" one. */
	operationId: number;
	reason: string;
	candidates: ShortfallCandidate[];
	overrides?: AbsorptionOverride[];
	/** Per demand allocation: its current quantity and its cart, both needed to write back. */
	allocations: Map<number, { quantity: Prisma.Decimal; cartId: number }>;
};

export type PackagedShortfallResult = {
	rollOverRows: Array<PostAllocationRollOverInput & { cartId: number }>;
	/** What the effects handler publishes: the demand this line no longer covers. */
	removedLine: AdminPackagedLineChange | null;
};

const zero = () => new Prisma.Decimal(0);

export async function applyPackagedShortfall(
	tx: Prisma.TransactionClient,
	line: PackagedShortfallLine,
): Promise<PackagedShortfallResult> {
	const reductions = line.shortfall.gt(zero())
		? planPackagedShortfall({
				candidates: line.candidates,
				shortfall: line.shortfall,
				overrides: line.overrides,
			})
		: [];

	const rollOverRows: PackagedShortfallResult["rollOverRows"] = [];
	const removedAllocations: AdminPackagedLineChange["allocations"] = [];

	for (const reduction of reductions) {
		const allocation = line.allocations.get(reduction.allocationId);
		if (!allocation) continue;

		await updatePackagedAllocationQuantity(
			tx,
			reduction.packagedAllocationId,
			reduction.remainingPackagedQuantity,
		);
		await updateAllocationQuantity(
			tx,
			reduction.allocationId,
			allocation.quantity.minus(reduction.removedQuantity),
		);

		rollOverRows.push({
			cartItemId: reduction.cartItemId,
			cartId: allocation.cartId,
			operationId: line.operationId,
			quantity: reduction.removedQuantity,
			reason: line.reason,
		});
		removedAllocations.push({
			cartItemId: reduction.cartItemId,
			cartId: allocation.cartId,
			quantity: reduction.removedQuantity.toString(),
		});
	}

	await updatePackageLineState(
		tx,
		line.packageLotItemId,
		line.cancelLine
			? { status: "cancelled" }
			: { quantity: line.lineQuantity.minus(line.shortfall) },
	);

	if (line.shortfall.gt(zero())) {
		await updateLotItemState(tx, line.lotItemId, {
			quantity: line.lotItemQuantity.minus(line.shortfall),
		});
	}

	return {
		rollOverRows,
		removedLine:
			removedAllocations.length === 0
				? null
				: {
						packageId: line.packageId,
						packageLotItemId: line.packageLotItemId,
						lotItemId: line.lotItemId,
						allocations: removedAllocations,
					},
	};
}
