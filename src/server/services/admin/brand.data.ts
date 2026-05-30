import type {
	BrandCreateInput,
	BrandListInput,
	BrandUpdateInput,
} from "~/shared/common/admin-crud/brand.types";
import type { Prisma } from "../../../../generated/prisma/client";

type AdminDbClient = Prisma.TransactionClient;

export const brandListSelect = {
	id: true,
	name: true,
	description: true,
	logoUrl: true,
	active: true,
	deleted: true,
	updatedAt: true,
} satisfies Prisma.BrandSelect;

export const brandDetailSelect = {
	id: true,
	name: true,
	description: true,
	logoUrl: true,
	active: true,
	deleted: true,
} satisfies Prisma.BrandSelect;

const brandRelationCountSelect = {
	id: true,
	name: true,
	description: true,
	logoUrl: true,
	active: true,
	deleted: true,
	_count: {
		select: {
			products: true,
		},
	},
} satisfies Prisma.BrandSelect;

export type BrandDetailRecord = Prisma.BrandGetPayload<{
	select: typeof brandDetailSelect;
}>;

export type BrandRelationCountRecord = Prisma.BrandGetPayload<{
	select: typeof brandRelationCountSelect;
}>;

export async function listBrands(db: AdminDbClient, input: BrandListInput) {
	return db.brand.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: brandListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { name: "asc" }],
	});
}

export async function findBrandById(db: AdminDbClient, id: number) {
	return db.brand.findUnique({
		where: { id },
		select: brandDetailSelect,
	});
}

export async function getBrandStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.brand.count(),
		db.brand.count({ where: { active: true, deleted: false } }),
		db.brand.count({ where: { active: false, deleted: false } }),
		db.brand.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createBrand(db: AdminDbClient, input: BrandCreateInput) {
	return db.brand.create({
		data: {
			name: input.name,
			description: input.description ?? null,
			logoUrl: input.logoUrl ?? null,
			active: input.active,
			deleted: false,
		},
		select: brandDetailSelect,
	});
}

export async function updateBrand(db: AdminDbClient, input: BrandUpdateInput) {
	return db.brand.update({
		where: { id: input.id },
		data: {
			name: input.name,
			description: input.description ?? null,
			logoUrl: input.logoUrl ?? null,
			active: input.active,
		},
		select: brandDetailSelect,
	});
}

export async function softDeleteBrand(db: AdminDbClient, id: number) {
	return db.brand.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: brandDetailSelect,
	});
}

export async function hardDeleteBrand(db: AdminDbClient, id: number) {
	return db.brand.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getBrandRelationCounts(db: AdminDbClient, id: number) {
	return db.brand.findUnique({
		where: { id },
		select: brandRelationCountSelect,
	});
}
