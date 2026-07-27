import { Prisma } from "~/prisma/client";
import type { CarrierOrderListInput } from "~/shared/common/admin-crud/carrier-order.types";
import { fromDateTimeLocalValue } from "~/shared/common/date.helpers";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

const carrierOrderScalarSelect = {
	id: true,
	code: true,
	externalReference: true,
	status: true,
	deleted: true,
	requestedAt: true,
	confirmedAt: true,
	cancelledAt: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.CarrierOrderSelect;

/**
 * Every shipment the booking holds, cancelled ones included: the action matrix
 * needs the total for `hardDelete`'s childless guard and the live count for
 * `softDelete`'s, and the diagnostics compare against both. Filtering here would
 * make `shipmentCount` a lie.
 */
const carrierOrderSummarySelect = {
	...carrierOrderScalarSelect,
	carrier: { select: { id: true, name: true } },
	shipments: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			internalCode: true,
			name: true,
			type: true,
			deliveryMode: true,
			status: true,
			trackingCode: true,
			_count: { select: { packages: true } },
		},
	},
} satisfies Prisma.CarrierOrderSelect;

export type CarrierOrderSummaryRecord = Prisma.CarrierOrderGetPayload<{
	select: typeof carrierOrderSummarySelect;
}>;

const carrierOrderDetailSelect = {
	...carrierOrderSummarySelect,
	metadata: true,
} satisfies Prisma.CarrierOrderSelect;

export type CarrierOrderDetailRecord = Prisma.CarrierOrderGetPayload<{
	select: typeof carrierOrderDetailSelect;
}>;

export function buildCarrierOrderWhere(
	input: CarrierOrderListInput,
): Prisma.CarrierOrderWhereInput {
	const and: Prisma.CarrierOrderWhereInput[] = [];

	if (!input.includeDeleted) and.push({ deleted: false });
	if (input.status !== undefined) and.push({ status: input.status });
	if (input.carrierId !== undefined) and.push({ carrierId: input.carrierId });
	if (input.shipmentId !== undefined) {
		and.push({ shipments: { some: { id: input.shipmentId } } });
	}
	if (input.createdFrom !== undefined) {
		and.push({ createdAt: { gte: fromDateTimeLocalValue(input.createdFrom) } });
	}
	if (input.createdTo !== undefined) {
		and.push({ createdAt: { lte: fromDateTimeLocalValue(input.createdTo) } });
	}
	if (input.search !== undefined) {
		and.push({
			OR: [
				{ code: { contains: input.search } },
				{ externalReference: { contains: input.search } },
				{ carrier: { name: { contains: input.search } } },
				{ shipments: { some: { internalCode: { contains: input.search } } } },
				{ shipments: { some: { trackingCode: { contains: input.search } } } },
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

export async function listCarrierOrderCandidates(
	db: AdminDbClient,
	input: CarrierOrderListInput,
	options?: { skip?: number; take?: number },
) {
	const direction = input.sortDirection;

	return db.carrierOrder.findMany({
		where: buildCarrierOrderWhere(input),
		select: carrierOrderSummarySelect,
		orderBy: [{ createdAt: direction }, { id: direction }],
		skip: options?.skip,
		take: options?.take,
	});
}

export async function countCarrierOrderCandidates(
	db: AdminDbClient,
	input: CarrierOrderListInput,
) {
	return db.carrierOrder.count({ where: buildCarrierOrderWhere(input) });
}

export async function getCarrierOrderStats(db: AdminDbClient) {
	const [total, byStatus, shipmentCount] = await Promise.all([
		db.carrierOrder.count({ where: { deleted: false } }),
		db.carrierOrder.groupBy({
			by: ["status"],
			where: { deleted: false },
			_count: { _all: true },
		}),
		db.shipment.count({ where: { carrierOrderId: { not: null } } }),
	]);

	return { total, byStatus, shipmentCount };
}

export async function findCarrierOrderById(db: AdminDbClient, id: number) {
	return db.carrierOrder.findUnique({
		where: { id },
		select: carrierOrderDetailSelect,
	});
}

/**
 * The command shape is the detail shape: a booking carries no relation a command
 * needs beyond what the operator already saw. Kept as its own name so a future
 * command-only field has an obvious home.
 */
export async function findCarrierOrderForCommand(
	db: AdminDbClient,
	id: number,
) {
	return findCarrierOrderById(db, id);
}

export async function createCarrierOrder(
	db: AdminDbClient,
	data: {
		carrierId: number;
		code: string;
		externalReference?: string;
		metadata?: unknown;
	},
) {
	return db.carrierOrder.create({
		data: {
			carrierId: data.carrierId,
			code: data.code,
			externalReference: data.externalReference ?? null,
			metadata:
				data.metadata === undefined
					? undefined
					: toPrismaInputJson(data.metadata),
		},
		select: { id: true, code: true },
	});
}

export async function updateCarrierOrderFields(
	db: AdminDbClient,
	id: number,
	data: {
		carrierId: number;
		code: string;
		externalReference?: string;
		metadata?: unknown;
	},
) {
	await db.carrierOrder.update({
		where: { id },
		data: {
			carrierId: data.carrierId,
			code: data.code,
			externalReference: data.externalReference ?? null,
			metadata:
				data.metadata === undefined
					? Prisma.DbNull
					: toPrismaInputJson(data.metadata),
		},
	});
}

/**
 * The timestamps arrive as fields rather than being derived here: which command
 * owns which column is policy, and policy lives in the service next to the
 * ladder guard. Mirrors `updateShipmentState`.
 */
export async function updateCarrierOrderState(
	db: AdminDbClient,
	id: number,
	data: {
		status?: Prisma.CarrierOrderUpdateInput["status"];
		requestedAt?: Date;
		confirmedAt?: Date;
		cancelledAt?: Date;
	},
) {
	await db.carrierOrder.update({
		where: { id },
		data: {
			status: data.status,
			requestedAt: data.requestedAt,
			confirmedAt: data.confirmedAt,
			cancelledAt: data.cancelledAt,
		},
	});
}

export async function setCarrierOrderDeleted(
	db: AdminDbClient,
	id: number,
	deleted: boolean,
) {
	await db.carrierOrder.update({ where: { id }, data: { deleted } });
}

export async function hardDeleteCarrierOrder(db: AdminDbClient, id: number) {
	return db.carrierOrder.delete({ where: { id }, select: { id: true } });
}

/**
 * How long a requested booking may go unconfirmed. Shorter than the logistics
 * thresholds on purpose: a carrier should answer faster than goods move.
 */
const STALE_CARRIER_REQUEST_DAYS = 3;

export function staleCarrierRequestThreshold(now = new Date()): Date {
	return new Date(now.getTime() - STALE_CARRIER_REQUEST_DAYS * 86_400_000);
}
