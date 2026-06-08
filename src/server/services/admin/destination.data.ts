import type { Prisma } from "~/prisma/client";
import type {
	DestinationCreateInput,
	DestinationListInput,
	DestinationUpdateInput,
} from "~/shared/common/admin-crud/destination.types";

type AdminDbClient = Prisma.TransactionClient;

export const destinationListSelect = {
	id: true,
	name: true,
	description: true,
	googleMapsUrl: true,
	active: true,
	deleted: true,
	updatedAt: true,
} satisfies Prisma.DestinationSelect;

export const destinationDetailSelect = {
	id: true,
	name: true,
	description: true,
	googleMapsUrl: true,
	active: true,
	deleted: true,
} satisfies Prisma.DestinationSelect;

const destinationRelationCountSelect = {
	id: true,
	name: true,
	description: true,
	googleMapsUrl: true,
	active: true,
	deleted: true,
	_count: {
		select: {
			lotItems: true,
		},
	},
} satisfies Prisma.DestinationSelect;

export type DestinationDetailRecord = Prisma.DestinationGetPayload<{
	select: typeof destinationDetailSelect;
}>;

export type DestinationRelationCountRecord = Prisma.DestinationGetPayload<{
	select: typeof destinationRelationCountSelect;
}>;

export async function listDestinations(
	db: AdminDbClient,
	input: DestinationListInput,
) {
	return db.destination.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: destinationListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { name: "asc" }],
	});
}

export async function findDestinationById(db: AdminDbClient, id: number) {
	return db.destination.findUnique({
		where: { id },
		select: destinationDetailSelect,
	});
}

export async function getDestinationStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.destination.count(),
		db.destination.count({ where: { active: true, deleted: false } }),
		db.destination.count({ where: { active: false, deleted: false } }),
		db.destination.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createDestination(
	db: AdminDbClient,
	input: DestinationCreateInput,
) {
	return db.destination.create({
		data: {
			name: input.name,
			description: input.description ?? null,
			googleMapsUrl: input.googleMapsUrl ?? null,
			active: input.active,
			deleted: false,
		},
		select: destinationDetailSelect,
	});
}

export async function updateDestination(
	db: AdminDbClient,
	input: DestinationUpdateInput,
) {
	return db.destination.update({
		where: { id: input.id },
		data: {
			name: input.name,
			description: input.description ?? null,
			googleMapsUrl: input.googleMapsUrl ?? null,
			active: input.active,
		},
		select: destinationDetailSelect,
	});
}

export async function softDeleteDestination(db: AdminDbClient, id: number) {
	return db.destination.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: destinationDetailSelect,
	});
}

export async function hardDeleteDestination(db: AdminDbClient, id: number) {
	return db.destination.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getDestinationRelationCounts(
	db: AdminDbClient,
	id: number,
) {
	return db.destination.findUnique({
		where: { id },
		select: destinationRelationCountSelect,
	});
}
