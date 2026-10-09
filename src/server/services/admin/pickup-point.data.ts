import type { Prisma } from "~/prisma/client";
import type {
	PickupPointCreateInput,
	PickupPointListInput,
	PickupPointUpdateInput,
} from "~/shared/common/admin-crud/pickup-point.types";

type AdminDbClient = Prisma.TransactionClient;

export const pickupPointDetailSelect = {
	id: true,
	name: true,
	line1: true,
	line2: true,
	city: true,
	state: true,
	postalCode: true,
	country: true,
	googleMapsUrl: true,
	hours: true,
	instructions: true,
	active: true,
	deleted: true,
} satisfies Prisma.PickupPointSelect;

const pickupPointListSelect = {
	...pickupPointDetailSelect,
	updatedAt: true,
	_count: {
		select: { userOrders: { where: { status: "processing" } } },
	},
} satisfies Prisma.PickupPointSelect;

const pickupPointRelationCountSelect = {
	...pickupPointDetailSelect,
	_count: { select: { userOrders: true, shipments: true } },
} satisfies Prisma.PickupPointSelect;

export type PickupPointDetailRecord = Prisma.PickupPointGetPayload<{
	select: typeof pickupPointDetailSelect;
}>;

export type PickupPointListRecord = Prisma.PickupPointGetPayload<{
	select: typeof pickupPointListSelect;
}>;

export type PickupPointRelationCountRecord = Prisma.PickupPointGetPayload<{
	select: typeof pickupPointRelationCountSelect;
}>;

function toData(input: PickupPointCreateInput) {
	return {
		name: input.name,
		line1: input.line1,
		line2: input.line2 ?? null,
		city: input.city,
		state: input.state,
		postalCode: input.postalCode ?? null,
		country: input.country,
		googleMapsUrl: input.googleMapsUrl ?? null,
		hours: input.hours,
		instructions: input.instructions ?? null,
		active: input.active,
	};
}

export async function listPickupPoints(
	db: AdminDbClient,
	input: PickupPointListInput,
) {
	return db.pickupPoint.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: pickupPointListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { name: "asc" }],
	});
}

export async function findPickupPointById(db: AdminDbClient, id: number) {
	return db.pickupPoint.findUnique({
		where: { id },
		select: pickupPointDetailSelect,
	});
}

export async function getPickupPointStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.pickupPoint.count(),
		db.pickupPoint.count({ where: { active: true, deleted: false } }),
		db.pickupPoint.count({ where: { active: false, deleted: false } }),
		db.pickupPoint.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createPickupPoint(
	db: AdminDbClient,
	input: PickupPointCreateInput,
) {
	return db.pickupPoint.create({
		data: { ...toData(input), deleted: false },
		select: pickupPointDetailSelect,
	});
}

export async function updatePickupPoint(
	db: AdminDbClient,
	input: PickupPointUpdateInput,
) {
	return db.pickupPoint.update({
		where: { id: input.id },
		data: toData(input),
		select: pickupPointDetailSelect,
	});
}

export async function setPickupPointActive(
	db: AdminDbClient,
	id: number,
	active: boolean,
) {
	return db.pickupPoint.update({
		where: { id },
		data: { active },
		select: pickupPointDetailSelect,
	});
}

export async function softDeletePickupPoint(db: AdminDbClient, id: number) {
	return db.pickupPoint.update({
		where: { id },
		data: { active: false, deleted: true },
		select: pickupPointDetailSelect,
	});
}

export async function hardDeletePickupPoint(db: AdminDbClient, id: number) {
	return db.pickupPoint.delete({ where: { id }, select: { id: true } });
}

export async function getPickupPointRelationCounts(
	db: AdminDbClient,
	id: number,
) {
	return db.pickupPoint.findUnique({
		where: { id },
		select: pickupPointRelationCountSelect,
	});
}

/** What checkout and the override may offer: live, active points only. */
export async function listActivePickupPoints(db: AdminDbClient) {
	return db.pickupPoint.findMany({
		where: { active: true, deleted: false },
		select: pickupPointDetailSelect,
		orderBy: [{ name: "asc" }, { id: "asc" }],
	});
}
