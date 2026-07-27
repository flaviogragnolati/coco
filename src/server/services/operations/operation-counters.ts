import type { LotItemStatus, LotStatus, RollOverStatus } from "~/prisma/client";
import { Prisma } from "~/prisma/client";

/**
 * Live operation counters, recomputed from records rather than adjusted by
 * deltas: a recompute cannot drift, so `operation.quantity.balanceMismatch` and
 * `operation.quantity.assignedMismatch` hold by construction after every
 * quantity move.
 *
 * `eligibleQuantity` and `eligibleItemCount` are deliberately absent — they stay
 * the execution-time snapshot (architecture §11). A cut moves quantity from
 * `assigned` to `rollOver`, so their sum is invariant and the balance rule holds.
 */

export type OperationCounterInputs = {
	lots: Array<{
		status: LotStatus;
		supplierOrderId: number | null;
		lotItems: Array<{
			status: LotItemStatus;
			quantity: Prisma.Decimal;
			cartItemLotItems: Array<{
				cartItemId: number;
				quantity: Prisma.Decimal;
			}>;
		}>;
	}>;
	rollOvers: Array<{
		cartItemId: number;
		status: RollOverStatus;
		quantity: Prisma.Decimal;
	}>;
};

export type OperationCounters = {
	assignedQuantity: Prisma.Decimal;
	rollOverQuantity: Prisma.Decimal;
	assignedItemCount: number;
	rollOverItemCount: number;
	lotCount: number;
	supplierOrderCount: number;
};

const zero = () => new Prisma.Decimal(0);

function sumDecimals(values: Prisma.Decimal[]) {
	return values.reduce((total, value) => total.plus(value), zero());
}

/**
 * Which lot items count toward the assigned quantity. `calculateOperationDiagnostics`
 * applies the same predicate — if the two ever disagree, `assignedMismatch`
 * fires on every cancellation.
 */
export function isLiveLotItem(
	lot: { status: LotStatus },
	lotItem: { status: LotItemStatus },
) {
	return lot.status !== "cancelled" && lotItem.status !== "cancelled";
}

export function computeOperationCounters(
	input: OperationCounterInputs,
): OperationCounters {
	const liveLotItems = input.lots.flatMap((lot) =>
		lot.lotItems
			.filter((lotItem) => isLiveLotItem(lot, lotItem))
			.map((lotItem) => lotItem),
	);

	const assignedCartItemIds = new Set(
		liveLotItems.flatMap((lotItem) =>
			lotItem.cartItemLotItems
				.filter((allocation) => allocation.quantity.gt(zero()))
				.map((allocation) => allocation.cartItemId),
		),
	);

	const liveRollOvers = input.rollOvers.filter(
		(rollOver) => rollOver.status !== "cancelled",
	);

	return {
		assignedQuantity: sumDecimals(
			liveLotItems.map((lotItem) => lotItem.quantity),
		),
		// Open, rebatched and resolved all count: the quantity did roll over, and
		// resolving records a decision without putting the quantity back.
		rollOverQuantity: sumDecimals(
			liveRollOvers.map((rollOver) => rollOver.quantity),
		),
		assignedItemCount: assignedCartItemIds.size,
		rollOverItemCount: new Set(
			liveRollOvers.map((rollOver) => rollOver.cartItemId),
		).size,
		lotCount: input.lots.length,
		supplierOrderCount: new Set(
			input.lots
				.map((lot) => lot.supplierOrderId)
				.filter((id): id is number => id !== null),
		).size,
	};
}

const operationCounterSelect = {
	lots: {
		select: {
			status: true,
			supplierOrderId: true,
			lotItems: {
				select: {
					status: true,
					quantity: true,
					cartItemLotItems: { select: { cartItemId: true, quantity: true } },
				},
			},
		},
	},
	rollOvers: {
		select: { cartItemId: true, status: true, quantity: true },
	},
} satisfies Prisma.OperationSelect;

/**
 * Must run inside the command's transaction, after the mutations and before the
 * events are published — a recompute after commit reintroduces exactly the drift
 * it exists to eliminate.
 */
export async function recomputeOperationCounters(
	tx: Prisma.TransactionClient,
	operationId: number,
): Promise<void> {
	const record = await tx.operation.findUnique({
		where: { id: operationId },
		select: operationCounterSelect,
	});
	if (!record) return;

	const counters = computeOperationCounters(record);

	await tx.operation.update({
		where: { id: operationId },
		data: {
			assignedQuantity: counters.assignedQuantity.toString(),
			rollOverQuantity: counters.rollOverQuantity.toString(),
			assignedItemCount: counters.assignedItemCount,
			rollOverItemCount: counters.rollOverItemCount,
			lotCount: counters.lotCount,
			supplierOrderCount: counters.supplierOrderCount,
		},
	});
}
