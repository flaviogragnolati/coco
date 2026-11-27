import { z } from "zod";

import { Prisma } from "~/prisma/client";
import { formatQuantity } from "~/shared/common/commerce.helpers";
import {
	formatAddressLine,
	readPickupPointSnapshot,
} from "~/shared/common/delivery-display";
import {
	readSnapshotProduct,
	readSnapshotQuantityUnit,
} from "~/shared/common/product-snapshot";
import { customerNoticeReason } from "~/shared/common/tracking-display";

const id = z.number().int().positive();

export const logisticsNoticeSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("pickup"),
		shipmentId: id,
		allocations: z
			.array(
				z.object({
					packageId: id,
					cartItemId: id,
					quantity: z.string().regex(/^\d+(?:\.\d+)?$/),
				}),
			)
			.min(1),
	}),
	z.object({
		kind: z.literal("change"),
		capturedAt: z.string(),
		change: z.string(),
		reason: z.string(),
	}),
	z.object({
		kind: z.literal("rollover"),
		ids: z.array(id).min(1),
		cause: z.enum(["operation", "supplierOrder", "package", "shipment"]),
	}),
]);

export type LogisticsNotice = z.infer<typeof logisticsNoticeSchema>;

type OrderLine = {
	sourceCartItemId: number;
	productSnapshot: unknown;
	quantity: Prisma.Decimal;
};

function summarize(
	lines: OrderLine[],
	affected: Array<{ cartItemId: number; quantity: string }>,
) {
	const quantities = new Map<number, Prisma.Decimal>();
	for (const row of affected) {
		const total = quantities.get(row.cartItemId) ?? new Prisma.Decimal(0);
		quantities.set(row.cartItemId, total.add(row.quantity));
	}
	const parts: string[] = [];
	const amounts: string[] = [];
	let partial = false;
	for (const line of lines) {
		const qty = quantities.get(line.sourceCartItemId);
		if (!qty?.equals(line.quantity)) partial = true;
		if (!qty?.isPositive()) continue;
		amounts.push(`${line.sourceCartItemId}:${qty.toString()}`);
		const { unit, presentation } = readSnapshotQuantityUnit(
			line.productSnapshot,
		);
		const product = readSnapshotProduct(line.productSnapshot);
		parts.push(
			`${product.name} · ${formatQuantity(qty.toString(), unit, presentation)}`,
		);
	}
	return { parts, partial, quantityKey: amounts.join(",") };
}

function pickupLocation(shipmentSnapshot: unknown, orderSnapshot: unknown) {
	const point = readPickupPointSnapshot(shipmentSnapshot);
	if (point)
		return [point.name, formatAddressLine(point), point.hours].filter(Boolean);
	const legacy = z
		.object({
			label: z.string().optional(),
			line1: z.string(),
			city: z.string(),
			state: z.string(),
		})
		.safeParse(shipmentSnapshot);
	if (legacy.success) {
		const { label, line1 } = legacy.data;
		return [
			label === line1 ? undefined : label,
			formatAddressLine(legacy.data),
		].filter((line): line is string => Boolean(line));
	}
	const selectedPoint = readPickupPointSnapshot(orderSnapshot);
	return selectedPoint
		? [
				selectedPoint.name,
				formatAddressLine(selectedPoint),
				selectedPoint.hours,
			].filter(Boolean)
		: [];
}

export async function renderLogisticsNotice(
	tx: Prisma.TransactionClient,
	orderId: number,
	notice: LogisticsNotice,
): Promise<{ title: string; lines: string[]; quantityKey?: string } | null> {
	const order = await tx.userOrder.findFirst({
		where: { id: orderId, status: "processing" },
		select: {
			code: true,
			shippingAddressSnapshot: true,
			pickupPointSnapshot: true,
			items: {
				select: {
					sourceCartItemId: true,
					quantity: true,
					productSnapshot: true,
				},
				orderBy: { id: "asc" },
			},
		},
	});
	if (!order) return null;
	if (notice.kind === "change") {
		const snapshot = order.pickupPointSnapshot ?? order.shippingAddressSnapshot;
		const current = z.object({ capturedAt: z.string() }).safeParse(snapshot);
		if (!current.success || current.data.capturedAt !== notice.capturedAt)
			return null;
		return {
			title: `Cambió la entrega de tu pedido ${order.code}`,
			lines: [notice.change, notice.reason],
		};
	}

	if (notice.kind === "rollover") {
		const active = await tx.rollOver.findMany({
			where: {
				id: { in: notice.ids },
				status: "open",
				cartItemId: { in: order.items.map((i) => i.sourceCartItemId) },
			},
			select: { cartItemId: true, quantity: true },
		});
		const { parts, quantityKey } = summarize(
			order.items,
			active.map((row) => ({ ...row, quantity: row.quantity.toString() })),
		);
		if (!parts.length) return null;
		const reason = customerNoticeReason("rolledOverPostAllocation", {
			[`${notice.cause}Id`]: true,
		});
		return {
			quantityKey,
			title: `Productos reprogramados de tu pedido ${order.code}`,
			lines: [
				"Estas cantidades pasan a una próxima compra agrupada.",
				...parts,
				...(reason ? [reason] : []),
			],
		};
	}

	const shipment = await tx.shipment.findFirst({
		where: {
			id: notice.shipmentId,
			type: "endUserDelivery",
			deliveryMode: "pickupPoint",
			status: "received",
		},
		select: {
			destinationAddressSnapshot: true,
			packages: {
				where: {
					leg: "outbound",
					status: "inTransit",
					id: { in: notice.allocations.map((a) => a.packageId) },
				},
				select: { id: true },
			},
		},
	});
	if (!shipment) return null;
	const available = new Set(shipment.packages.map((p) => p.id));
	const { parts, partial, quantityKey } = summarize(
		order.items,
		notice.allocations.filter((a) => available.has(a.packageId)),
	);
	if (!parts.length) return null;
	const location = pickupLocation(
		shipment.destinationAddressSnapshot,
		order.pickupPointSnapshot,
	);
	return {
		quantityKey,
		title: `Ya podés retirar ${partial ? "parte de tu pedido" : "tu pedido"} ${order.code}`,
		lines: [...location, ...parts],
	};
}
