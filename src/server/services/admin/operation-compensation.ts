import type {
	LotItemStatus,
	LotStatus,
	RollOverStatus,
	SupplierOrderStatus,
} from "~/prisma/client";
import { Prisma } from "~/prisma/client";
import { isLiveLotItem } from "~/server/services/operations/operation-counters";
import { throwConflict } from "./_base/admin-crud.errors";

/**
 * Pure core of operation compensation (architecture §8, ADR 0005). It decides
 * which records change status and how much demand each cart item gets back;
 * nothing here reads or writes the database.
 *
 * Compensation deletes nothing. The excluded quantity of a cart item is its live
 * allocation quantity plus the quantity of the operation's own *open* roll overs
 * for it — together exactly what `operation.cartItem.included` carried, since a
 * supplier cut only moves quantity from the first bucket to the second. Roll
 * overs this operation *consumed* are reverted by id in the command; they need
 * no planning.
 */

export type CompensationAllocation = {
	id: number;
	quantity: Prisma.Decimal;
	cartItem: { id: number; cart: { id: number } };
};

export type CompensationLotItem = {
	id: number;
	status: LotItemStatus;
	cartItemLotItems: CompensationAllocation[];
};

export type CompensationSupplierOrder = {
	id: number;
	code: string;
	status: SupplierOrderStatus;
	lots: Array<{ id: number; operationId: number }>;
};

export type CompensationLot = {
	id: number;
	status: LotStatus;
	supplierOrder: CompensationSupplierOrder | null;
	lotItems: CompensationLotItem[];
};

export type CompensationRollOver = {
	id: number;
	status: RollOverStatus;
	quantity: Prisma.Decimal;
	cartItem: { id: number; cart: { id: number } };
};

export type OperationCompensationRecord = {
	id: number;
	code: string;
	lots: CompensationLot[];
	rollOvers: CompensationRollOver[];
};

export type CompensationPlan = {
	lotIds: number[];
	lotItemIds: number[];
	supplierOrderIds: number[];
	/** Roll overs this operation created and that are still open. */
	createdRollOverIds: number[];
	affectedCartItems: Array<{
		cartItemId: number;
		cartId: number;
		quantity: string;
	}>;
};

const zero = () => new Prisma.Decimal(0);

function liveSupplierOrders(record: OperationCompensationRecord) {
	return Array.from(
		new Map(
			record.lots
				.filter((lot) => lot.status !== "cancelled")
				.flatMap((lot) => (lot.supplierOrder ? [lot.supplierOrder] : []))
				.filter((order) => order.status !== "cancelled")
				.map((order) => [order.id, order]),
		).values(),
	);
}

/**
 * The administrative window plus the one-operation-per-order assumption
 * (architecture §19). Cancelling an order wholesale would reach lots the
 * compensation was never asked about, so an order spanning operations is
 * refused rather than partially cancelled.
 */
export function assertCompensable(record: OperationCompensationRecord) {
	const orders = liveSupplierOrders(record);

	const outsideWindow = orders.find((order) => order.status !== "pending");
	if (outsideWindow) {
		throwConflict(
			`La orden de proveedor ${outsideWindow.code} ya no está pendiente; la operación está fuera de la ventana administrativa`,
		);
	}

	const spanning = orders.find((order) =>
		order.lots.some((lot) => lot.operationId !== record.id),
	);
	if (spanning) {
		throwConflict(
			`La orden de proveedor ${spanning.code} tiene lotes de otra operación; no se puede cancelar desde acá`,
		);
	}
}

export function planOperationCompensation(
	record: OperationCompensationRecord,
): CompensationPlan {
	assertCompensable(record);

	const liveLots = record.lots.filter((lot) => lot.status !== "cancelled");
	const liveLines = record.lots.flatMap((lot) =>
		lot.lotItems
			.filter((lotItem) => isLiveLotItem(lot, lotItem))
			.map((lotItem) => lotItem),
	);
	const createdRollOvers = record.rollOvers.filter(
		(rollOver) => rollOver.status === "open",
	);

	// One cart item can hold allocations across several lot items, so the excluded
	// quantity aggregates per cart item rather than per allocation.
	const byCartItem = new Map<
		number,
		{ cartId: number; quantity: Prisma.Decimal }
	>();

	const add = (
		cartItem: { id: number; cart: { id: number } },
		quantity: Prisma.Decimal,
	) => {
		const current = byCartItem.get(cartItem.id);
		if (current) {
			current.quantity = current.quantity.plus(quantity);
			return;
		}
		byCartItem.set(cartItem.id, { cartId: cartItem.cart.id, quantity });
	};

	for (const lotItem of liveLines) {
		for (const allocation of lotItem.cartItemLotItems) {
			// A fully absorbed Phase 1 allocation survives at quantity 0; it returns
			// nothing, so it must not emit a zero-quantity notice.
			if (!allocation.quantity.gt(zero())) continue;
			add(allocation.cartItem, allocation.quantity);
		}
	}

	for (const rollOver of createdRollOvers) {
		if (!rollOver.quantity.gt(zero())) continue;
		add(rollOver.cartItem, rollOver.quantity);
	}

	return {
		lotIds: liveLots.map((lot) => lot.id),
		lotItemIds: liveLines.map((lotItem) => lotItem.id),
		supplierOrderIds: liveSupplierOrders(record).map((order) => order.id),
		createdRollOverIds: createdRollOvers.map((rollOver) => rollOver.id),
		affectedCartItems: Array.from(byCartItem.entries())
			.map(([cartItemId, entry]) => ({
				cartItemId,
				cartId: entry.cartId,
				quantity: entry.quantity.toString(),
			}))
			.sort((left, right) => left.cartItemId - right.cartItemId),
	};
}
