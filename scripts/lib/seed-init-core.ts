import type { Prisma } from "~/prisma/client";
import { resolveQuintalCategory } from "../quintal-catalog.categories";
import type { quintalCatalogSchema } from "../quintal-catalog.schema";
import type { SeedInitPlan } from "../seed-init.plan";
export type Catalog = ReturnType<typeof quintalCatalogSchema.parse>;
type CatalogProduct = Catalog["products"][number];

const flags = { active: true, deleted: true } as const;

export async function loadSeedInitState(
	tx: Prisma.TransactionClient,
	catalog: Catalog,
) {
	const suppliers = await tx.supplier.findMany({
		where: { name: catalog.supplier.name },
		select: { id: true, name: true, ...flags },
	});
	const products = await tx.product.findMany({
		where: {
			OR: [
				{ name: { in: catalog.products.map((product) => product.name) } },
				{ defaultSupplierId: { in: suppliers.map((supplier) => supplier.id) } },
			],
		},
		select: { id: true, name: true, defaultSupplierId: true, ...flags },
	});
	const productIds = products.map((product) => product.id);
	const window = { productId: true, fromDate: true, toDate: true, ...flags };
	const supplierTerms = await tx.productSupplierTerms.findMany({
		where: {
			productId: { in: productIds },
			supplierId: { in: suppliers.map((supplier) => supplier.id) },
		},
		select: { ...window, supplierId: true },
	});
	const clientTerms = await tx.productClientTerms.findMany({
		where: { productId: { in: productIds } },
		select: window,
	});
	const categories = await tx.category.findMany({
		select: { id: true, name: true, deleted: true },
	});
	return { suppliers, products, supplierTerms, clientTerms, categories };
}

export async function applySeedInitPlan(
	tx: Prisma.TransactionClient,
	plan: SeedInitPlan,
	catalog: Catalog,
	listDate: Date,
) {
	const byKey = new Map(
		catalog.products.map((product) => [product.key, product]),
	);
	const productOf = (key: string) => {
		const product = byKey.get(key);
		if (!product) throw new Error(`Producto ${key} fuera del catálogo`);
		return product;
	};

	const supplierId =
		plan.supplier.action === "keep"
			? plan.supplier.id
			: (
					await tx.supplier.create({
						data: {
							name: catalog.supplier.name,
							description: catalog.supplier.description,
							active: true,
							address: catalog.supplier.address,
							contactInfo: catalog.supplier.contactInfo,
						},
						select: { id: true },
					})
				).id;

	const toCreate = plan.products.flatMap((decision) =>
		decision.action === "create"
			? [{ product: productOf(decision.key), categoryId: decision.categoryId }]
			: [],
	);
	const created = toCreate.length
		? await tx.product.createManyAndReturn({
				data: toCreate.map(({ product, categoryId }) => ({
					name: product.name,
					description: product.description,
					unit: product.unit,
					presentationContainer:
						product.presentation?.presentationContainer ?? null,
					presentationSize: product.presentation?.presentationSize ?? null,
					active: true,
					brandId: null,
					categoryId,
					defaultSupplierId: supplierId,
				})),
				select: { id: true, name: true },
			})
		: [];
	const createdIds = new Map(
		created.map((product) => [product.name, product.id]),
	);

	const supplierTermsFor: Array<[number, CatalogProduct]> = [];
	const clientTermsFor: Array<[number, CatalogProduct]> = [];
	for (const decision of plan.products) {
		if (decision.action === "create") {
			const productId = createdIds.get(decision.name);
			if (productId === undefined) {
				throw new Error(`No volvió el id de "${decision.name}"`);
			}
			supplierTermsFor.push([productId, productOf(decision.key)]);
			clientTermsFor.push([productId, productOf(decision.key)]);
		} else if (decision.action === "keep") {
			if (decision.supplierTerms.action === "create") {
				supplierTermsFor.push([decision.productId, productOf(decision.key)]);
			}
			if (decision.clientTerms.action === "create") {
				clientTermsFor.push([decision.productId, productOf(decision.key)]);
			}
		}
	}

	if (supplierTermsFor.length > 0) {
		await tx.productSupplierTerms.createMany({
			data: supplierTermsFor.map(([productId, { supplierTerms }]) => ({
				productId,
				supplierId,
				moq: supplierTerms.moq,
				moqPrice: supplierTerms.moqPrice,
				step: supplierTerms.step,
				stepPrice: supplierTerms.stepPrice,
				max: null,
				refPrice: supplierTerms.refPrice,
				supplierPresentation: supplierTerms.supplierPresentation,
				currency: catalog.source.currency,
				active: true,
				fromDate: listDate,
				toDate: null,
			})),
		});
	}
	if (clientTermsFor.length > 0) {
		await tx.productClientTerms.createMany({
			data: clientTermsFor.map(([productId, { clientTerms }]) => ({
				productId,
				moq: clientTerms.moq,
				moqPrice: clientTerms.moqPrice,
				step: clientTerms.step,
				stepPrice: clientTerms.stepPrice,
				max: clientTerms.max,
				unitPrice: clientTerms.unitPrice,
				marketPrice: null,
				discountPercent: null,
				currency: catalog.source.currency,
				active: true,
				fromDate: listDate,
				toDate: null,
			})),
		});
	}

	return {
		supplierId,
		productsCreated: created.length,
		supplierTermsCreated: supplierTermsFor.length,
		clientTermsCreated: clientTermsFor.length,
	};
}

function withCategoryNames(catalog: Catalog) {
	const unmapped: string[] = [];
	const products = catalog.products.map((product) => {
		const categoryName = resolveQuintalCategory(product);
		if (!categoryName) unmapped.push(`${product.key} (${product.category})`);
		return {
			key: product.key,
			name: product.name,
			categoryName: categoryName ?? "",
		};
	});
	if (unmapped.length > 0) {
		throw new Error(
			`Productos sin categoría en quintalCategoryOverrides: ${unmapped.join(", ")}`,
		);
	}
	return products;
}

export function toSeedInitCatalog(catalog: Catalog) {
	return {
		supplierName: catalog.supplier.name,
		listDate: new Date(catalog.source.listDate),
		products: withCategoryNames(catalog),
	};
}
