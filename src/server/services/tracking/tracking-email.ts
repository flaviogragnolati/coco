import { z } from "zod";
import { type CustomerEmailStatus, Prisma } from "~/prisma/client";
import { appLogger } from "~/server/services/logging/app-logger.service";
import { getEmailEnvironment } from "~/server/services/notifications/email-config";
import { logisticsNoticeSchema } from "~/server/services/notifications/logistics-content";
import type { AdminTrackingTimelineItem } from "~/shared/common/tracking.types";

type Indicator = NonNullable<AdminTrackingTimelineItem["email"]>;
type Event = {
	id: number;
	eventType: AdminTrackingTimelineItem["eventType"];
	cartItemId: number;
	shipmentId: number | null;
	rollOverId: number | null;
	metadata: unknown;
};
type Occurrence = { key: string | null; orderId?: number };
type DeliveryRow = {
	orderId: number;
	status: CustomerEmailStatus;
	notice: unknown;
	quantityKey: string | null;
};
type Rollover = { id: number; cartItemId: number; quantity: Prisma.Decimal };

const referenceId = z
	.union([
		z.number(),
		z
			.string()
			.regex(/^[1-9]\d*$/)
			.transform(Number),
	])
	.pipe(z.int().positive());
const metadataSchema = z.object({
	domainEventKey: z.string().optional(),
	refs: z.object({
		orderId: referenceId,
		transactionId: referenceId.optional(),
	}),
});
const noticeSchema = z.intersection(
	z.object({ version: z.literal(1) }),
	z.union([
		z.object({
			kind: z.literal("confirmed"),
			attemptId: z.number().int().positive(),
		}),
		logisticsNoticeSchema,
	]),
);

function occurrence(event: Event): Occurrence | undefined {
	switch (event.eventType) {
		case "submittedToOrder":
		case "deliveryPreferenceChanged": {
			const parsed = metadataSchema.safeParse(event.metadata);
			if (!parsed.success) return { key: null };
			const { refs, domainEventKey } = parsed.data;
			const key =
				event.eventType === "submittedToOrder"
					? refs.transactionId &&
						`confirm/${refs.orderId}/${refs.transactionId}`
					: domainEventKey && `change/${domainEventKey}`;
			return { orderId: refs.orderId, key: key || null };
		}
		case "arrivedAtPickupPoint":
			return {
				key: event.shipmentId
					? `pickup/${event.shipmentId}/${event.cartItemId}`
					: null,
			};
		case "rolledOverPreAllocation":
		case "rolledOverPostAllocation":
			return {
				key: event.rollOverId
					? `rollover/${event.rollOverId}/${event.cartItemId}`
					: null,
			};
	}
}

function sentQuantities(key: string | null) {
	const quantities = new Map<number, Prisma.Decimal>();
	for (const part of key?.split(",") ?? []) {
		const match = /^(\d+):(\d+(?:\.\d+)?)$/.exec(part);
		if (!match?.[2]) continue;
		const quantity = new Prisma.Decimal(match[2]);
		if (quantity.isPositive()) quantities.set(Number(match[1]), quantity);
	}
	return quantities;
}

type ParsedDelivery = Omit<DeliveryRow, "notice"> & {
	notice: z.output<typeof noticeSchema>;
};
type Evidence = {
	orderId: number;
	status: Indicator["status"];
	partialQuantity?: boolean;
};

function totalQuantities(
	rows: Array<{ cartItemId: number; quantity: string | Prisma.Decimal }>,
) {
	const totals = new Map<number, Prisma.Decimal>();
	for (const row of rows) {
		const prior = totals.get(row.cartItemId) ?? new Prisma.Decimal(0);
		totals.set(row.cartItemId, prior.add(row.quantity));
	}
	return totals;
}

function indexDeliveries(
	deliveries: ParsedDelivery[],
	rollovers: Map<number, Rollover>,
) {
	const byKey = new Map<string, Evidence[]>();
	for (const { orderId, notice, status, quantityKey } of deliveries) {
		const put = (key: string, covered = true, partialQuantity = false) => {
			const existing = byKey.get(key) ?? [];
			existing.push({
				orderId,
				status: covered ? status : "missing",
				...(partialQuantity && { partialQuantity }),
			});
			byKey.set(key, existing);
		};
		switch (notice.kind) {
			case "confirmed":
				put(`confirm/${orderId}/${notice.attemptId}`);
				break;
			case "change":
				put(
					`change/admin:userOrder:${orderId}:deliveryPreferenceChanged:${notice.capturedAt}`,
				);
				break;
			case "pickup": {
				const sent = sentQuantities(quantityKey);
				for (const [itemId, total] of totalQuantities(notice.allocations)) {
					const amount = sent.get(itemId);
					const covered = status !== "accepted" || amount?.lte(total) === true;
					const partial = status === "accepted" && amount?.lt(total) === true;
					put(`pickup/${notice.shipmentId}/${itemId}`, covered, partial);
				}
				break;
			}
			case "rollover": {
				const members = notice.ids.flatMap((id) => rollovers.get(id) ?? []);
				const sent = sentQuantities(quantityKey);
				const totals = totalQuantities(members);
				// The frozen mail records one total per item, so a partial total cannot identify individual rollovers.
				const allKnown = members.length === notice.ids.length;
				for (const member of members) {
					const sentQuantity = sent.get(member.cartItemId);
					const expected = totals.get(member.cartItemId);
					const covered =
						allKnown && expected && sentQuantity?.equals(expected);
					put(
						`rollover/${member.id}/${member.cartItemId}`,
						status !== "accepted" || covered === true,
					);
				}
				break;
			}
		}
	}
	return byKey;
}

type ReadDb = Pick<
	Prisma.TransactionClient,
	"userOrderItem" | "$queryRaw" | "rollOver"
>;
type ApplicableEvent = { event: Event; ref: Occurrence };

export async function trackingEmailIndicators(db: ReadDb, events: Event[]) {
	const applicable = events.flatMap((event) => {
		const ref = occurrence(event);
		return ref ? [{ event, ref }] : [];
	});
	if (!applicable.length) return new Map<number, Indicator>();
	try {
		return await readTrackingEmailIndicators(db, applicable);
	} catch {
		appLogger.warn("trackingEmailIndicatorsUnavailable");
		return new Map<number, Indicator>(
			applicable.map(({ event }) => [
				event.id,
				{ orderId: null, status: "unavailable", test: false },
			]),
		);
	}
}

async function readTrackingEmailIndicators(
	db: ReadDb,
	applicable: ApplicableEvent[],
) {
	const indicators = new Map<number, Indicator>();
	const environment = getEmailEnvironment();
	const test = environment?.startsWith("test/") ?? false;
	for (const { event } of applicable) {
		indicators.set(event.id, {
			orderId: null,
			status: environment ? "missing" : "off",
			test,
		});
	}
	if (!environment) return indicators;

	const items = await db.userOrderItem.findMany({
		where: {
			sourceCartItemId: {
				in: [...new Set(applicable.map(({ event }) => event.cartItemId))],
			},
		},
		select: { userOrderId: true, sourceCartItemId: true },
	});
	if (!items.length) return indicators;
	const owners = new Map<number, number[]>();
	for (const item of items) {
		const orders = owners.get(item.sourceCartItemId) ?? [];
		orders.push(item.userOrderId);
		owners.set(item.sourceCartItemId, orders);
	}

	const orderIds = [...new Set(items.map((item) => item.userOrderId))];
	const rows = await db.$queryRaw<DeliveryRow[]>`
		SELECT "orderId", status::text AS status, notice, request->>'quantityKey' AS "quantityKey"
		FROM customer_email_delivery
		WHERE environment = ${environment} AND "orderId" IN (${Prisma.join(orderIds)})
		AND notice->>'kind' IN ('confirmed', 'change', 'pickup', 'rollover')`;
	const deliveries = rows.flatMap((row) => {
		const parsed = noticeSchema.safeParse(row.notice);
		return parsed.success ? [{ ...row, notice: parsed.data }] : [];
	});
	const rolloverIds = [
		...new Set(
			deliveries.flatMap(({ notice }) =>
				notice.kind === "rollover" ? notice.ids : [],
			),
		),
	];
	const rollovers = rolloverIds.length
		? await db.rollOver.findMany({
				where: { id: { in: rolloverIds } },
				select: { id: true, cartItemId: true, quantity: true },
			})
		: [];
	const byKey = indexDeliveries(
		deliveries,
		new Map(rollovers.map((r) => [r.id, r])),
	);
	for (const { event, ref } of applicable) {
		const orders = owners.get(event.cartItemId) ?? [];
		const candidates = ref.orderId
			? orders.filter((id) => id === ref.orderId)
			: orders;
		const evidence = ref.key ? byKey.get(ref.key) : undefined;
		const matches =
			evidence?.filter((row) => candidates.includes(row.orderId)) ?? [];
		const match = matches.length === 1 ? matches[0] : undefined;
		indicators.set(event.id, {
			orderId:
				match?.orderId ??
				(candidates.length === 1 ? candidates[0] : null) ??
				null,
			status: match?.status ?? "missing",
			...(match?.partialQuantity && { partialQuantity: true }),
			test,
		});
	}
	return indicators;
}
