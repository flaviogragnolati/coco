import { createHash } from "node:crypto";

import type { Prisma } from "~/prisma/client";
import type { AdminPackagedLineChange } from "~/server/services/admin/operations-effects/operations-effects.types";
import {
	enqueueCustomerEmail,
	isCustomerEmailEnabled,
} from "./customer-email.data";
import type { LogisticsNotice } from "./logistics-content";

async function groupByOrder<Row extends { cartItemId: number }>(
	tx: Prisma.TransactionClient,
	rows: Row[],
) {
	const grouped = new Map<number, Row[]>();
	const items = await tx.userOrderItem.findMany({
		where: {
			sourceCartItemId: { in: [...new Set(rows.map((r) => r.cartItemId))] },
			userOrder: { status: "processing" },
		},
		select: { sourceCartItemId: true, userOrderId: true },
	});
	const owners = new Map(items.map((i) => [i.sourceCartItemId, i.userOrderId]));
	for (const row of rows) {
		const orderId = owners.get(row.cartItemId);
		if (orderId === undefined) continue;
		const existing = grouped.get(orderId);
		if (existing) existing.push(row);
		else grouped.set(orderId, [row]);
	}
	return grouped;
}

export async function notifyPickupArrival(
	tx: Prisma.TransactionClient,
	shipmentId: number,
	lines: AdminPackagedLineChange[],
) {
	if (!isCustomerEmailEnabled() || !lines.length) return;
	const rows = lines.flatMap((line) =>
		line.allocations.map(({ cartItemId, quantity }) => ({
			packageId: line.packageId,
			cartItemId,
			quantity,
		})),
	);
	for (const [orderId, allocations] of await groupByOrder(tx, rows)) {
		await enqueueCustomerEmail(tx, orderId, `pickup/${shipmentId}/${orderId}`, {
			kind: "pickup",
			shipmentId,
			allocations,
		});
	}
}

export async function notifyRollOvers(
	tx: Prisma.TransactionClient,
	cause: Extract<LogisticsNotice, { kind: "rollover" }>["cause"],
	rows: { cartItemId: number; rollOverId: number }[],
) {
	if (!isCustomerEmailEnabled() || !rows.length) return;
	for (const [orderId, rollovers] of await groupByOrder(tx, rows)) {
		const ids = [...new Set(rollovers.map((r) => r.rollOverId))].sort(
			(a, b) => a - b,
		);
		const occurrence = createHash("sha256").update(ids.join(",")).digest("hex");
		await enqueueCustomerEmail(
			tx,
			orderId,
			`rollover/${orderId}/${occurrence}`,
			{ kind: "rollover", ids, cause },
		);
	}
}
