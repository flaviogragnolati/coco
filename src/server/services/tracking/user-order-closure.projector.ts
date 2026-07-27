import "server-only";

import type { Prisma } from "~/prisma/client";
import { deriveUserOrderClosure } from "~/shared/common/user-order-closure";
import { loadUserOrderClosureSnapshot } from "./user-order-closure.data";

/**
 * Closes a `UserOrder` once every item it carries has reached a terminal
 * fulfillment status. Runs after `TrackingStatusProjector`, on the lineage the
 * batch left behind — the same load → derive → guarded write shape.
 *
 * `UserOrder.status` is owned by the payment domain; this only ever writes *from*
 * `processing`. The `status: "processing"` clause in the `where` is not
 * belt-and-braces: the read and the write are separated by the derivation, so it
 * is what stops a concurrent payment-domain write from being clobbered.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: This class is a logical grouping of related functionality and is not expected to be instantiated or extended.
export class UserOrderClosureProjector {
	static async project(
		tx: Prisma.TransactionClient,
		input: { userOrderId: number },
	): Promise<void> {
		const snapshot = await loadUserOrderClosureSnapshot(tx, input.userOrderId);
		if (!snapshot) return;

		const closure = deriveUserOrderClosure({
			currentStatus: snapshot.status,
			itemStatuses: snapshot.itemStatuses,
		});
		if (closure === null) return;

		await tx.userOrder.updateMany({
			where: { id: input.userOrderId, status: "processing" },
			data: { status: closure },
		});
	}
}
