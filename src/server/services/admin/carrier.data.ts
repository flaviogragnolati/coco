import type {
	CarrierCreateInput,
	CarrierListInput,
	CarrierUpdateInput,
} from "~/shared/common/admin-crud/carrier.types";
import type { Prisma } from "../~/prisma/client";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

export const carrierListSelect = {
	id: true,
	name: true,
	description: true,
	active: true,
	deleted: true,
	updatedAt: true,
} satisfies Prisma.CarrierSelect;

export const carrierDetailSelect = {
	id: true,
	name: true,
	description: true,
	active: true,
	deleted: true,
	address: true,
	contactInfo: true,
} satisfies Prisma.CarrierSelect;

const carrierRelationCountSelect = {
	id: true,
	name: true,
	description: true,
	active: true,
	deleted: true,
	address: true,
	contactInfo: true,
	_count: {
		select: {
			carrierOrders: true,
		},
	},
} satisfies Prisma.CarrierSelect;

export type CarrierDetailRecord = Prisma.CarrierGetPayload<{
	select: typeof carrierDetailSelect;
}>;

export type CarrierRelationCountRecord = Prisma.CarrierGetPayload<{
	select: typeof carrierRelationCountSelect;
}>;

export async function listCarriers(db: AdminDbClient, input: CarrierListInput) {
	return db.carrier.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: carrierListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { name: "asc" }],
	});
}

export async function findCarrierById(db: AdminDbClient, id: number) {
	return db.carrier.findUnique({
		where: { id },
		select: carrierDetailSelect,
	});
}

export async function getCarrierStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.carrier.count(),
		db.carrier.count({ where: { active: true, deleted: false } }),
		db.carrier.count({ where: { active: false, deleted: false } }),
		db.carrier.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createCarrier(
	db: AdminDbClient,
	input: CarrierCreateInput,
) {
	return db.carrier.create({
		data: {
			name: input.name,
			description: input.description ?? null,
			active: input.active,
			deleted: false,
			address: toPrismaInputJson(input.address),
			contactInfo: toPrismaInputJson(input.contactInfo),
		},
		select: carrierDetailSelect,
	});
}

export async function updateCarrier(
	db: AdminDbClient,
	input: CarrierUpdateInput,
) {
	return db.carrier.update({
		where: { id: input.id },
		data: {
			name: input.name,
			description: input.description ?? null,
			active: input.active,
			address: toPrismaInputJson(input.address),
			contactInfo: toPrismaInputJson(input.contactInfo),
		},
		select: carrierDetailSelect,
	});
}

export async function softDeleteCarrier(db: AdminDbClient, id: number) {
	return db.carrier.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: carrierDetailSelect,
	});
}

export async function hardDeleteCarrier(db: AdminDbClient, id: number) {
	return db.carrier.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getCarrierRelationCounts(db: AdminDbClient, id: number) {
	return db.carrier.findUnique({
		where: { id },
		select: carrierRelationCountSelect,
	});
}
