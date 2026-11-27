import "server-only";
import type { z } from "zod";
import { Prisma, type PrismaClient } from "~/prisma/client";
import type {
	notificationDetailOutput,
	notificationListInput,
	notificationRowSchema,
} from "~/schemas/admin/notification.schemas";
import { getEmailEnvironment } from "~/server/services/notifications/email-config";

const rowFields = Prisma.sql`d.id, d."orderId", o.code AS "orderCode",
	d.notice->>'kind' AS kind, d.status::text AS status, d."updatedAt",
	d.request->>'to' AS "to", d.request->>'subject' AS subject`;
const joinedOrders = Prisma.sql`FROM customer_email_delivery d JOIN user_order o ON o.id = d."orderId"`;

function notificationContext() {
	const environment = getEmailEnvironment();
	if (!environment) return { mode: "off", environment } as const;
	return {
		mode: environment.startsWith("test/") ? "test" : "live",
		environment,
	} as const;
}

export async function listNotifications(
	database: PrismaClient,
	input: z.infer<typeof notificationListInput>,
) {
	const { mode, environment } = notificationContext();
	if (!environment) return { items: [], total: 0, pageCount: 0, mode };
	const conditions = [Prisma.sql`d.environment = ${environment}`];
	if (input.status !== "all")
		conditions.push(
			Prisma.sql`d.status = ${input.status}::"CustomerEmailStatus"`,
		);
	if (input.orderId)
		conditions.push(Prisma.sql`d."orderId" = ${input.orderId}`);
	if (input.orderCode)
		conditions.push(Prisma.sql`upper(o.code) = upper(${input.orderCode})`);
	const filtered = Prisma.sql`${joinedOrders} WHERE ${Prisma.join(conditions, " AND ")}`;
	const [items, counts] = await database.$transaction(
		[
			database.$queryRaw<
				z.infer<typeof notificationRowSchema>[]
			>`SELECT ${rowFields}
			${filtered} ORDER BY d."updatedAt" DESC, d.id DESC
			LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`,
			database.$queryRaw<
				{ total: bigint }[]
			>`SELECT count(*) AS total ${filtered}`,
		],
		{ isolationLevel: "RepeatableRead" },
	);
	const total = Number(counts[0]?.total ?? 0);
	return { items, mode, total, pageCount: Math.ceil(total / input.pageSize) };
}

export async function findNotification(database: PrismaClient, id: string) {
	const { mode, environment } = notificationContext();
	if (!environment) return null;
	const [row] = await database.$queryRaw<
		Omit<z.infer<typeof notificationDetailOutput>, "mode">[]
	>`SELECT ${rowFields}, d.attempts, d."lastError", d."providerId",
		d.request->>'from' AS "from", d.request->>'html' AS html, d.request->>'text' AS text
		${joinedOrders} WHERE d.id = ${id} AND d.environment = ${environment}`;
	return row ? { ...row, mode } : null;
}

export async function summarizeOrderNotifications(
	database: PrismaClient,
	orderIds: number[],
) {
	const { mode, environment } = notificationContext();
	const orders = [...new Set(orderIds)].map((orderId) => ({
		orderId,
		total: 0,
		accepted: 0,
	}));
	if (environment && orders.length) {
		const grouped = await database.customerEmailDelivery.groupBy({
			by: ["orderId", "status"],
			where: {
				environment,
				orderId: { in: orders.map((order) => order.orderId) },
			},
			_count: { _all: true },
		});
		const byId = new Map(orders.map((order) => [order.orderId, order]));
		for (const group of grouped) {
			const summary = byId.get(group.orderId);
			if (!summary) continue;
			summary.total += group._count._all;
			if (group.status === "accepted") summary.accepted = group._count._all;
		}
	}
	return { mode, orders };
}
