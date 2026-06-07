import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required to run prisma/seed.ts");
}

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	log: ["error", "warn"],
});

const SEED_ACTOR_REFERENCE = "seed:script";
const SEED_DATE = new Date("2026-05-30T12:00:00.000Z");
const CURRENT_FROM_DATE = new Date("2026-01-01T00:00:00.000Z");
const EXPIRED_FROM_DATE = new Date("2025-10-01T00:00:00.000Z");
const EXPIRED_TO_DATE = new Date("2026-01-31T23:59:59.000Z");
const FUTURE_FROM_DATE = new Date("2026-12-01T00:00:00.000Z");

const requiredTables = [
	"user",
	"address",
	"payment_method",
	"brand",
	"product",
	"supplier",
	"carrier",
	"destination",
	"product_client_terms",
	"product_supplier_terms",
	"product_local_constraints",
	"cart",
	"cart_item",
	"user_order",
	"user_order_item",
	"user_transaction",
	"operation",
	"lot",
	"lot_item",
	"cart_item_lot_item",
	"package",
	"package_lot_item",
	"package_allocation",
	"shipment",
	"supplier_order",
	"supplier_transaction",
	"carrier_order",
	"roll_over",
	"cart_item_tracking_event",
	"domain_event_outbox",
	"audit_log",
] as const;

const seedProductSelect = {
	id: true,
	name: true,
	description: true,
	unit: true,
	cardImageUrl: true,
	cartImageUrl: true,
	active: true,
	deleted: true,
	brand: {
		select: {
			name: true,
		},
	},
} satisfies Prisma.ProductSelect;

const seedClientTermsSelect = {
	id: true,
	productId: true,
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	refPrice: true,
	currency: true,
	active: true,
	deleted: true,
	fromDate: true,
	toDate: true,
} satisfies Prisma.ProductClientTermsSelect;

const seedSupplierTermsSelect = {
	id: true,
	productId: true,
	supplierId: true,
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	refPrice: true,
	currency: true,
	active: true,
	deleted: true,
	fromDate: true,
	toDate: true,
} satisfies Prisma.ProductSupplierTermsSelect;

type SeedProduct = Prisma.ProductGetPayload<{
	select: typeof seedProductSelect;
}>;
type SeedClientTerms = Prisma.ProductClientTermsGetPayload<{
	select: typeof seedClientTermsSelect;
}>;
type SeedSupplierTerms = Prisma.ProductSupplierTermsGetPayload<{
	select: typeof seedSupplierTermsSelect;
}>;

function json(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

function decimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
	return new Prisma.Decimal(value);
}

function decimalString(value: Prisma.Decimal | string | number | null) {
	if (value === null) return null;
	return new Prisma.Decimal(value).toString();
}

function assertPositiveQuantity(value: string, label: string) {
	if (decimal(value).lte(0)) {
		throw new Error(`${label} must be greater than zero`);
	}
}

function assertQuantityAtMost(input: {
	actual: string;
	limit: string;
	label: string;
}) {
	if (decimal(input.actual).gt(decimal(input.limit))) {
		throw new Error(`${input.label} exceeds ${input.limit}`);
	}
}

function calculateLineTotal(terms: SeedClientTerms, quantity: string) {
	const requested = decimal(quantity);

	if (requested.lte(terms.moq)) return terms.moqPrice.toFixed(2);
	if (!terms.step || !terms.stepPrice) return terms.moqPrice.toFixed(2);

	const extraQuantity = requested.minus(terms.moq);
	const steps = extraQuantity.div(terms.step).ceil();
	return terms.moqPrice.plus(steps.mul(terms.stepPrice)).toFixed(2);
}

function selectProductImage(product: SeedProduct) {
	return product.cartImageUrl ?? product.cardImageUrl;
}

function buildProductSnapshot(product: SeedProduct, terms: SeedClientTerms) {
	return json({
		source: "seed",
		capturedAt: SEED_DATE.toISOString(),
		productClientTerms: {
			id: terms.id,
			moq: decimalString(terms.moq),
			moqPrice: decimalString(terms.moqPrice),
			step: decimalString(terms.step),
			stepPrice: decimalString(terms.stepPrice),
			max: decimalString(terms.max),
			refPrice: decimalString(terms.refPrice),
			currency: terms.currency,
			fromDate: terms.fromDate.toISOString(),
			toDate: terms.toDate?.toISOString() ?? null,
		},
		product: {
			id: product.id,
			name: product.name,
			description: product.description,
			unit: product.unit,
			brandName: product.brand?.name ?? null,
			imageUrl: selectProductImage(product),
		},
	});
}

function buildPriceSnapshot(terms: SeedClientTerms, quantity: string) {
	assertPositiveQuantity(quantity, "Order item quantity");

	return json({
		source: "seed",
		capturedAt: SEED_DATE.toISOString(),
		productClientTermsId: terms.id,
		quantity,
		lineTotal: calculateLineTotal(terms, quantity),
		currency: terms.currency,
		terms: {
			moq: decimalString(terms.moq),
			moqPrice: decimalString(terms.moqPrice),
			step: decimalString(terms.step),
			stepPrice: decimalString(terms.stepPrice),
			max: decimalString(terms.max),
			refPrice: decimalString(terms.refPrice),
		},
	});
}

function buildAddressSnapshot(address: {
	id: number;
	type: string;
	line1: string;
	line2: string | null;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	active: boolean;
}) {
	return json({
		source: "seed",
		capturedAt: SEED_DATE.toISOString(),
		address,
	});
}

function buildTermsSnapshot(acceptedAt: Date) {
	return json({
		source: "seed",
		version: "seed-v1",
		acceptedAt: acceptedAt.toISOString(),
		termsText:
			"Condiciones demo para desarrollo: precios, cantidades y envios ficticios.",
	});
}

function shipmentAddressSnapshot(label: string, city: string, state: string) {
	return json({
		source: "seed",
		label,
		line1: label,
		city,
		state,
		postalCode: "0000",
		country: "AR",
	});
}

function shipmentContactSnapshot(contactName: string, phone: string) {
	return json({
		source: "seed",
		contactName,
		phone,
		email: "operaciones@coco.dev",
	});
}

async function assertSchemaReady() {
	const rows = await db.$queryRaw<Array<{ table_name: string }>>`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name IN (${Prisma.join([...requiredTables])})
	`;
	const found = new Set(rows.map((row) => row.table_name));
	const missing = requiredTables.filter((table) => !found.has(table));

	if (missing.length > 0) {
		throw new Error(
			`Database schema is missing tables required by prisma/seed.ts: ${missing.join(
				", ",
			)}. Run pnpm db:push or apply the checkout/fulfillment migration before seeding.`,
		);
	}
}

async function resetDemoTransactionalData(tx: Tx) {
	const carts = await tx.cart.findMany({
		where: { code: { startsWith: "CART-SEED-" } },
		select: { id: true },
	});
	const cartIds = carts.map((cart) => cart.id);
	const cartItems = await tx.cartItem.findMany({
		where: {
			OR: [
				{ code: { startsWith: "CITEM-SEED-" } },
				{ cartId: { in: cartIds } },
			],
		},
		select: { id: true },
	});
	const cartItemIds = cartItems.map((item) => item.id);
	const orders = await tx.userOrder.findMany({
		where: {
			OR: [{ code: { startsWith: "ORD-SEED-" } }, { cartId: { in: cartIds } }],
		},
		select: { id: true },
	});
	const orderIds = orders.map((order) => order.id);
	const operations = await tx.operation.findMany({
		where: { code: { startsWith: "OP-SEED-" } },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);
	const lots = await tx.lot.findMany({
		where: {
			OR: [
				{ code: { startsWith: "LOT-SEED-" } },
				{ operationId: { in: operationIds } },
			],
		},
		select: { id: true },
	});
	const lotIds = lots.map((lot) => lot.id);
	const lotItems = await tx.lotItem.findMany({
		where: {
			OR: [{ code: { startsWith: "LITEM-SEED-" } }, { lotId: { in: lotIds } }],
		},
		select: { id: true },
	});
	const lotItemIds = lotItems.map((item) => item.id);
	const packages = await tx.package.findMany({
		where: {
			OR: [
				{ name: { startsWith: "PKG-SEED-" } },
				{ trackingCode: { startsWith: "PKG-SEED-" } },
			],
		},
		select: { id: true },
	});
	const packageIds = packages.map((pack) => pack.id);
	const shipments = await tx.shipment.findMany({
		where: { internalCode: { startsWith: "SHIP-SEED-" } },
		select: { id: true },
	});
	const shipmentIds = shipments.map((shipment) => shipment.id);
	const carrierOrders = await tx.carrierOrder.findMany({
		where: { code: { startsWith: "CORD-SEED-" } },
		select: { id: true },
	});
	const carrierOrderIds = carrierOrders.map((order) => order.id);
	const supplierOrders = await tx.supplierOrder.findMany({
		where: { code: { startsWith: "SORD-SEED-" } },
		select: { id: true },
	});
	const supplierOrderIds = supplierOrders.map((order) => order.id);
	const rollOvers = await tx.rollOver.findMany({
		where: {
			OR: [
				{ cartItemId: { in: cartItemIds } },
				{ operationId: { in: operationIds } },
			],
		},
		select: { id: true },
	});
	const rollOverIds = rollOvers.map((rollOver) => rollOver.id);
	const cartItemLotItems = await tx.cartItemLotItem.findMany({
		where: {
			OR: [
				{ cartItemId: { in: cartItemIds } },
				{ lotItemId: { in: lotItemIds } },
			],
		},
		select: { id: true },
	});
	const cartItemLotItemIds = cartItemLotItems.map((item) => item.id);
	const packageLotItems = await tx.packageLotItem.findMany({
		where: {
			OR: [
				{ packageId: { in: packageIds } },
				{ lotItemId: { in: lotItemIds } },
			],
		},
		select: { id: true },
	});
	const packageLotItemIds = packageLotItems.map((item) => item.id);

	await tx.auditLog.deleteMany({
		where: { actorReference: SEED_ACTOR_REFERENCE },
	});
	await tx.cartItemTrackingEvent.deleteMany({
		where: {
			OR: [
				{ cartItemId: { in: cartItemIds } },
				{ operationId: { in: operationIds } },
				{ cartItemLotItemId: { in: cartItemLotItemIds } },
				{ lotId: { in: lotIds } },
				{ lotItemId: { in: lotItemIds } },
				{ packageId: { in: packageIds } },
				{ shipmentId: { in: shipmentIds } },
				{ rollOverId: { in: rollOverIds } },
			],
		},
	});
	await tx.packageAllocation.deleteMany({
		where: {
			OR: [
				{ cartItemLotItemId: { in: cartItemLotItemIds } },
				{ packageLotItemId: { in: packageLotItemIds } },
			],
		},
	});
	await tx.packageLotItem.deleteMany({
		where: {
			OR: [
				{ id: { in: packageLotItemIds } },
				{ packageId: { in: packageIds } },
				{ lotItemId: { in: lotItemIds } },
			],
		},
	});
	await tx.package.deleteMany({
		where: {
			OR: [{ id: { in: packageIds } }, { name: { startsWith: "PKG-SEED-" } }],
		},
	});
	await tx.shipment.deleteMany({
		where: {
			OR: [
				{ id: { in: shipmentIds } },
				{ internalCode: { startsWith: "SHIP-SEED-" } },
			],
		},
	});
	await tx.carrierOrder.deleteMany({
		where: {
			OR: [
				{ id: { in: carrierOrderIds } },
				{ code: { startsWith: "CORD-SEED-" } },
			],
		},
	});
	await tx.cartItemLotItem.deleteMany({
		where: {
			OR: [
				{ id: { in: cartItemLotItemIds } },
				{ cartItemId: { in: cartItemIds } },
				{ lotItemId: { in: lotItemIds } },
			],
		},
	});
	await tx.rollOver.deleteMany({
		where: {
			OR: [
				{ id: { in: rollOverIds } },
				{ cartItemId: { in: cartItemIds } },
				{ operationId: { in: operationIds } },
			],
		},
	});
	await tx.lotItem.deleteMany({
		where: {
			OR: [{ id: { in: lotItemIds } }, { code: { startsWith: "LITEM-SEED-" } }],
		},
	});
	await tx.lot.deleteMany({
		where: {
			OR: [{ id: { in: lotIds } }, { code: { startsWith: "LOT-SEED-" } }],
		},
	});
	await tx.operation.deleteMany({
		where: {
			OR: [{ id: { in: operationIds } }, { code: { startsWith: "OP-SEED-" } }],
		},
	});
	await tx.supplierTransaction.deleteMany({
		where: { supplierOrderId: { in: supplierOrderIds } },
	});
	await tx.supplierOrder.deleteMany({
		where: {
			OR: [
				{ id: { in: supplierOrderIds } },
				{ code: { startsWith: "SORD-SEED-" } },
			],
		},
	});
	await tx.userTransaction.deleteMany({
		where: { userOrderId: { in: orderIds } },
	});
	await tx.userOrderItem.deleteMany({
		where: {
			OR: [
				{ userOrderId: { in: orderIds } },
				{ sourceCartItemId: { in: cartItemIds } },
			],
		},
	});
	await tx.userOrder.deleteMany({
		where: {
			OR: [{ id: { in: orderIds } }, { code: { startsWith: "ORD-SEED-" } }],
		},
	});
	await tx.cartItem.deleteMany({
		where: {
			OR: [
				{ id: { in: cartItemIds } },
				{ code: { startsWith: "CITEM-SEED-" } },
			],
		},
	});
	await tx.cart.deleteMany({
		where: {
			OR: [{ id: { in: cartIds } }, { code: { startsWith: "CART-SEED-" } }],
		},
	});
}

async function upsertUser(
	tx: Tx,
	input: {
		id: string;
		name: string;
		email: string;
		role: "user" | "admin" | "superadmin";
	},
) {
	const existing = await tx.user.findUnique({ where: { email: input.email } });

	if (existing) {
		return tx.user.update({
			where: { id: existing.id },
			data: {
				name: input.name,
				emailVerified: true,
				role: input.role,
				active: true,
				deleted: false,
			},
		});
	}

	return tx.user.create({
		data: {
			id: input.id,
			name: input.name,
			email: input.email,
			emailVerified: true,
			role: input.role,
			active: true,
			deleted: false,
		},
	});
}

async function upsertAddress(
	tx: Tx,
	input: {
		userId: string;
		type: "all" | "billing" | "shipping" | "other";
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
		active?: boolean;
	},
) {
	const existing = await tx.address.findFirst({
		where: { userId: input.userId, type: input.type, line1: input.line1 },
	});
	const data = {
		userId: input.userId,
		type: input.type,
		line1: input.line1,
		line2: input.line2 ?? null,
		city: input.city,
		state: input.state,
		postalCode: input.postalCode,
		country: input.country,
		active: input.active ?? true,
		deleted: false,
	};

	if (existing) {
		return tx.address.update({ where: { id: existing.id }, data });
	}

	return tx.address.create({ data });
}

async function upsertPaymentMethod(
	tx: Tx,
	input: {
		userId: string;
		type:
			| "credit_card"
			| "mercadopago"
			| "bank_transfer"
			| "google_pay"
			| "cash"
			| "other";
		label: string;
		details: string;
		externalPaymentMethodId: string;
		metadata?: Prisma.InputJsonValue;
	},
) {
	const existing = await tx.paymentMethod.findFirst({
		where: { externalPaymentMethodId: input.externalPaymentMethodId },
	});
	const data = {
		userId: input.userId,
		type: input.type,
		label: input.label,
		details: input.details,
		provider: "mock",
		externalPaymentMethodId: input.externalPaymentMethodId,
		active: true,
		deleted: false,
		metadata: input.metadata,
	};

	if (existing) {
		return tx.paymentMethod.update({ where: { id: existing.id }, data });
	}

	return tx.paymentMethod.create({ data });
}

async function upsertBrand(
	tx: Tx,
	input: {
		name: string;
		description: string;
		logoUrl?: string;
		active?: boolean;
		deleted?: boolean;
	},
) {
	const existing = await tx.brand.findFirst({ where: { name: input.name } });
	const data = {
		name: input.name,
		description: input.description,
		logoUrl: input.logoUrl ?? null,
		active: input.active ?? true,
		deleted: input.deleted ?? false,
	};

	if (existing) {
		return tx.brand.update({ where: { id: existing.id }, data });
	}

	return tx.brand.create({ data });
}

async function upsertSupplier(
	tx: Tx,
	input: {
		name: string;
		description: string;
		active?: boolean;
		address: Prisma.InputJsonValue;
		contactInfo: Prisma.InputJsonValue;
	},
) {
	const existing = await tx.supplier.findFirst({ where: { name: input.name } });
	const data = {
		name: input.name,
		description: input.description,
		active: input.active ?? true,
		deleted: false,
		address: input.address,
		contactInfo: input.contactInfo,
	};

	if (existing) {
		return tx.supplier.update({ where: { id: existing.id }, data });
	}

	return tx.supplier.create({ data });
}

async function upsertCarrier(
	tx: Tx,
	input: {
		name: string;
		description: string;
		active?: boolean;
		address: Prisma.InputJsonValue;
		contactInfo: Prisma.InputJsonValue;
	},
) {
	const existing = await tx.carrier.findFirst({ where: { name: input.name } });
	const data = {
		name: input.name,
		description: input.description,
		active: input.active ?? true,
		deleted: false,
		address: input.address,
		contactInfo: input.contactInfo,
	};

	if (existing) {
		return tx.carrier.update({ where: { id: existing.id }, data });
	}

	return tx.carrier.create({ data });
}

async function upsertDestination(
	tx: Tx,
	input: {
		name: string;
		description: string;
		googleMapsUrl?: string;
		active?: boolean;
	},
) {
	const existing = await tx.destination.findFirst({
		where: { name: input.name },
	});
	const data = {
		name: input.name,
		description: input.description,
		googleMapsUrl: input.googleMapsUrl ?? null,
		active: input.active ?? true,
		deleted: false,
	};

	if (existing) {
		return tx.destination.update({ where: { id: existing.id }, data });
	}

	return tx.destination.create({ data });
}

async function upsertProduct(
	tx: Tx,
	input: {
		name: string;
		description: string;
		unit: "kg" | "lb" | "piece" | "box" | "gr" | "other";
		brandId?: number;
		defaultSupplierId?: number;
		active?: boolean;
		deleted?: boolean;
		cardImageUrl?: string;
		cartImageUrl?: string;
		images?: string[];
	},
): Promise<SeedProduct> {
	const existing = await tx.product.findFirst({ where: { name: input.name } });
	const data = {
		name: input.name,
		description: input.description,
		unit: input.unit,
		brandId: input.brandId ?? null,
		defaultSupplierId: input.defaultSupplierId ?? null,
		active: input.active ?? true,
		deleted: input.deleted ?? false,
		cardImageUrl: input.cardImageUrl ?? null,
		cartImageUrl: input.cartImageUrl ?? null,
		images: input.images ?? [],
	};
	const record = existing
		? await tx.product.update({
				where: { id: existing.id },
				data,
				select: seedProductSelect,
			})
		: await tx.product.create({ data, select: seedProductSelect });

	return record;
}

async function upsertProductClientTerms(
	tx: Tx,
	input: {
		productId: number;
		moq: string;
		moqPrice: string;
		step?: string;
		stepPrice?: string;
		max?: string;
		refPrice?: string;
		currency?: "ARS" | "USD" | "EUR" | "BRL";
		active?: boolean;
		deleted?: boolean;
		fromDate: Date;
		toDate?: Date | null;
	},
): Promise<SeedClientTerms> {
	const existing = await tx.productClientTerms.findFirst({
		where: {
			productId: input.productId,
			currency: input.currency ?? "ARS",
			fromDate: input.fromDate,
			moq: input.moq,
		},
	});
	const data = {
		productId: input.productId,
		moq: input.moq,
		moqPrice: input.moqPrice,
		step: input.step ?? null,
		stepPrice: input.stepPrice ?? null,
		max: input.max ?? null,
		refPrice: input.refPrice ?? null,
		currency: input.currency ?? "ARS",
		active: input.active ?? true,
		deleted: input.deleted ?? false,
		fromDate: input.fromDate,
		toDate: input.toDate ?? null,
	};

	if (existing) {
		return tx.productClientTerms.update({
			where: { id: existing.id },
			data,
			select: seedClientTermsSelect,
		});
	}

	return tx.productClientTerms.create({ data, select: seedClientTermsSelect });
}

async function upsertProductSupplierTerms(
	tx: Tx,
	input: {
		productId: number;
		supplierId: number;
		moq: string;
		moqPrice: string;
		step?: string;
		stepPrice?: string;
		max?: string;
		refPrice?: string;
		currency?: "ARS" | "USD" | "EUR" | "BRL";
		active?: boolean;
		fromDate: Date;
		toDate?: Date | null;
	},
): Promise<SeedSupplierTerms> {
	const existing = await tx.productSupplierTerms.findFirst({
		where: {
			productId: input.productId,
			supplierId: input.supplierId,
			currency: input.currency ?? "ARS",
			fromDate: input.fromDate,
			moq: input.moq,
		},
	});
	const data = {
		productId: input.productId,
		supplierId: input.supplierId,
		moq: input.moq,
		moqPrice: input.moqPrice,
		step: input.step ?? null,
		stepPrice: input.stepPrice ?? null,
		max: input.max ?? null,
		refPrice: input.refPrice ?? null,
		currency: input.currency ?? "ARS",
		active: input.active ?? true,
		deleted: false,
		fromDate: input.fromDate,
		toDate: input.toDate ?? null,
	};

	if (existing) {
		return tx.productSupplierTerms.update({
			where: { id: existing.id },
			data,
			select: seedSupplierTermsSelect,
		});
	}

	return tx.productSupplierTerms.create({
		data,
		select: seedSupplierTermsSelect,
	});
}

async function upsertProductLocalConstraint(
	tx: Tx,
	input: {
		productId: number;
		constraintType:
			| "max_quantity"
			| "restricted_destination"
			| "requires_internal_delivery"
			| "minimum_stock"
			| "legal_restriction"
			| "seasonal_availability";
		value: Prisma.InputJsonValue;
		scope: Prisma.InputJsonValue;
		reason: string;
	},
) {
	const existing = await tx.productLocalConstraints.findFirst({
		where: {
			productId: input.productId,
			constraintType: input.constraintType,
			reason: input.reason,
		},
	});
	const data = {
		productId: input.productId,
		constraintType: input.constraintType,
		value: input.value,
		scope: input.scope,
		reason: input.reason,
		active: true,
		deleted: false,
		fromDate: CURRENT_FROM_DATE,
		toDate: null,
	};

	if (existing) {
		return tx.productLocalConstraints.update({
			where: { id: existing.id },
			data,
		});
	}

	return tx.productLocalConstraints.create({ data });
}

function supplierAddress(
	line1: string,
	city: string,
	state = "Buenos Aires",
): Prisma.InputJsonValue {
	return json({
		line1,
		line2: null,
		city,
		state,
		postalCode: "1000",
		country: "AR",
	});
}

function contactInfo(
	contactName: string,
	email: string,
	phone: string,
): Prisma.InputJsonValue {
	return json({
		contactName,
		email,
		phone,
		whatsapp: phone,
	});
}

async function seedMasterData(tx: Tx) {
	const users = {
		buyer: await upsertUser(tx, {
			id: "seed-user-buyer",
			name: "Compras Norte Demo",
			email: "seed.user.buyer@coco.dev",
			role: "user",
		}),
		admin: await upsertUser(tx, {
			id: "seed-user-admin",
			name: "Operador Admin Demo",
			email: "seed.admin@coco.dev",
			role: "admin",
		}),
		superadmin: await upsertUser(tx, {
			id: "seed-user-superadmin",
			name: "Superadmin Demo",
			email: "seed.superadmin@coco.dev",
			role: "superadmin",
		}),
	};

	const addresses = {
		buyerShipping: await upsertAddress(tx, {
			userId: users.buyer.id,
			type: "shipping",
			line1: "Av. Corrientes 1234",
			line2: "Piso 4",
			city: "CABA",
			state: "Buenos Aires",
			postalCode: "C1043",
			country: "AR",
		}),
		buyerBilling: await upsertAddress(tx, {
			userId: users.buyer.id,
			type: "billing",
			line1: "Av. Santa Fe 2450",
			city: "CABA",
			state: "Buenos Aires",
			postalCode: "C1123",
			country: "AR",
		}),
		adminShipping: await upsertAddress(tx, {
			userId: users.admin.id,
			type: "all",
			line1: "Bv. San Juan 455",
			city: "Cordoba",
			state: "Cordoba",
			postalCode: "X5000",
			country: "AR",
		}),
	};

	const paymentMethods = {
		buyerCard: await upsertPaymentMethod(tx, {
			userId: users.buyer.id,
			type: "credit_card",
			label: "Visa corporativa terminada en 4242",
			details: "Tarjeta corporativa aprobada para compras demo",
			externalPaymentMethodId: "pm-seed-buyer-card-ok",
			metadata: json({ seed: true, expectedStatus: "completed" }),
		}),
		buyerMercadoPago: await upsertPaymentMethod(tx, {
			userId: users.buyer.id,
			type: "mercadopago",
			label: "Mercado Pago empresa",
			details: "Cuenta empresa para pagos pendientes demo",
			externalPaymentMethodId: "pm-seed-buyer-mp-pending",
			metadata: json({ seed: true, expectedStatus: "pending" }),
		}),
		buyerRejected: await upsertPaymentMethod(tx, {
			userId: users.buyer.id,
			type: "credit_card",
			label: "Tarjeta rechazo demo",
			details: "Metodo mock para simular rechazo de pago",
			externalPaymentMethodId: "pm-seed-buyer-card-fail",
			metadata: json({ seed: true, expectedStatus: "failed" }),
		}),
		adminTransfer: await upsertPaymentMethod(tx, {
			userId: users.admin.id,
			type: "bank_transfer",
			label: "Transferencia bancaria admin",
			details: "Cuenta bancaria demo para compras internas",
			externalPaymentMethodId: "pm-seed-admin-bank",
			metadata: json({ seed: true, expectedStatus: "completed" }),
		}),
	};

	const brands = {
		andes: await upsertBrand(tx, {
			name: "Andes Fresh",
			description: "Marca demo de frescos regionales.",
		}),
		pampa: await upsertBrand(tx, {
			name: "Pampa Pack",
			description: "Marca demo de secos y packaging mayorista.",
		}),
		rio: await upsertBrand(tx, {
			name: "Rio Dulce",
			description: "Marca demo de lacteos y dulces.",
		}),
	};

	const suppliers = {
		valleVerde: await upsertSupplier(tx, {
			name: "Cooperativa Valle Verde",
			description: "Proveedor demo de frutas y verduras.",
			address: supplierAddress("Ruta 7 Km 90", "San Andres de Giles"),
			contactInfo: contactInfo(
				"Laura Benitez",
				"compras@valleverde.demo",
				"+54 9 11 3000 1001",
			),
		}),
		lacteosSur: await upsertSupplier(tx, {
			name: "Lacteos del Sur",
			description: "Proveedor demo de lacteos refrigerados.",
			address: supplierAddress("Parque Industrial Nave 4", "Tandil"),
			contactInfo: contactInfo(
				"Martin Arias",
				"ventas@lacteossur.demo",
				"+54 9 249 300 2002",
			),
		}),
		packNorte: await upsertSupplier(tx, {
			name: "Pack Norte Mayorista",
			description: "Proveedor demo de secos y descartables.",
			address: supplierAddress("Av. Circunvalacion 1800", "Cordoba", "Cordoba"),
			contactInfo: contactInfo(
				"Carla Molina",
				"operaciones@packnorte.demo",
				"+54 9 351 300 3003",
			),
		}),
		frigorifico: await upsertSupplier(tx, {
			name: "Frigorifico La Sierra",
			description: "Proveedor demo para productos con cadena fria.",
			address: supplierAddress("Camino Rural 15", "Balcarce"),
			contactInfo: contactInfo(
				"Pablo Ruiz",
				"logistica@lasierra.demo",
				"+54 9 2266 300 4004",
			),
		}),
		parana: await upsertSupplier(tx, {
			name: "Distribuidora Rio Parana",
			description: "Proveedor demo inactivo para pruebas administrativas.",
			active: false,
			address: supplierAddress("Puerto Norte 220", "Rosario", "Santa Fe"),
			contactInfo: contactInfo(
				"Natalia Costa",
				"ventas@rioparana.demo",
				"+54 9 341 300 5005",
			),
		}),
	};

	const carriers = {
		andesCargo: await upsertCarrier(tx, {
			name: "Andes Cargo",
			description: "Carrier demo para cargas secas nacionales.",
			address: supplierAddress("Av. Directorio 1800", "CABA"),
			contactInfo: contactInfo(
				"Mesa Operativa",
				"ops@andescargo.demo",
				"+54 11 4000 1000",
			),
		}),
		rapidoFederal: await upsertCarrier(tx, {
			name: "Rapido Federal",
			description: "Carrier demo para distribucion federal.",
			address: supplierAddress("Colectora Norte 900", "Tigre"),
			contactInfo: contactInfo(
				"Planificacion Federal",
				"trafico@rapidofederal.demo",
				"+54 11 4000 2000",
			),
		}),
		frioExpress: await upsertCarrier(tx, {
			name: "Frio Express",
			description: "Carrier demo para cadena fria.",
			address: supplierAddress("Calle 8 3400", "La Plata"),
			contactInfo: contactInfo(
				"Guardia Frio",
				"guardia@frioexpress.demo",
				"+54 221 400 3000",
			),
		}),
	};

	const destinations = {
		caba: await upsertDestination(tx, {
			name: "Deposito CABA",
			description: "Deposito demo para consolidacion urbana.",
			googleMapsUrl: "https://maps.google.com/?q=CABA",
		}),
		cordoba: await upsertDestination(tx, {
			name: "Hub Cordoba",
			description: "Hub demo para operaciones centro del pais.",
			googleMapsUrl: "https://maps.google.com/?q=Cordoba",
		}),
		rosarioCold: await upsertDestination(tx, {
			name: "Camara Fria Rosario",
			description: "Camara fria demo para productos refrigerados.",
			googleMapsUrl: "https://maps.google.com/?q=Rosario",
		}),
	};

	const products = {
		tomate: await upsertProduct(tx, {
			name: "Tomate perita fresco",
			description: "Cajones mayoristas de tomate perita fresco.",
			unit: "kg",
			brandId: brands.andes.id,
			defaultSupplierId: suppliers.valleVerde.id,
			cardImageUrl:
				"https://images.unsplash.com/photo-1592924357228-91a4daadcfea",
			images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea"],
		}),
		aceite: await upsertProduct(tx, {
			name: "Aceite de oliva extra virgen 5L",
			description: "Bidon de aceite de oliva para gastronomia.",
			unit: "piece",
			brandId: brands.pampa.id,
			defaultSupplierId: suppliers.packNorte.id,
			cardImageUrl:
				"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
		}),
		arroz: await upsertProduct(tx, {
			name: "Arroz largo fino bolsa 25kg",
			description: "Bolsa mayorista de arroz largo fino.",
			unit: "box",
			brandId: brands.pampa.id,
			defaultSupplierId: suppliers.packNorte.id,
		}),
		queso: await upsertProduct(tx, {
			name: "Queso cremoso horma",
			description: "Horma refrigerada para rotiserias y hoteles.",
			unit: "kg",
			brandId: brands.rio.id,
			defaultSupplierId: suppliers.lacteosSur.id,
		}),
		yerba: await upsertProduct(tx, {
			name: "Yerba mate paquete 1kg x10",
			description: "Caja de diez paquetes de yerba mate.",
			unit: "box",
			brandId: brands.pampa.id,
			defaultSupplierId: suppliers.packNorte.id,
		}),
		dulce: await upsertProduct(tx, {
			name: "Dulce de leche familiar 400g x12",
			description: "Caja de dulce de leche familiar.",
			unit: "box",
			brandId: brands.rio.id,
			defaultSupplierId: suppliers.lacteosSur.id,
		}),
		manzana: await upsertProduct(tx, {
			name: "Manzana roja premium",
			description: "Manzana roja seleccionada para consumo institucional.",
			unit: "kg",
			brandId: brands.andes.id,
			defaultSupplierId: suppliers.valleVerde.id,
		}),
		bandeja: await upsertProduct(tx, {
			name: "Bandeja compostable grande x100",
			description: "Pack de bandejas compostables para take away.",
			unit: "box",
			brandId: brands.pampa.id,
			defaultSupplierId: suppliers.packNorte.id,
		}),
		snackInactivo: await upsertProduct(tx, {
			name: "Snack estacional de verano",
			description: "Producto demo inactivo para probar filtros.",
			unit: "piece",
			brandId: brands.pampa.id,
			defaultSupplierId: suppliers.packNorte.id,
			active: false,
		}),
		mixDeleted: await upsertProduct(tx, {
			name: "Mix de frutos secos discontinuado",
			description: "Producto demo soft-deleted para administracion.",
			unit: "other",
			brandId: brands.andes.id,
			defaultSupplierId: suppliers.parana.id,
			active: false,
			deleted: true,
		}),
	};

	const clientTerms = {
		tomate: await upsertProductClientTerms(tx, {
			productId: products.tomate.id,
			moq: "20.0000",
			moqPrice: "24000.00",
			step: "10.0000",
			stepPrice: "11000.00",
			max: "500.0000",
			refPrice: "1200.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		aceite: await upsertProductClientTerms(tx, {
			productId: products.aceite.id,
			moq: "2.0000",
			moqPrice: "98.00",
			step: "1.0000",
			stepPrice: "45.00",
			max: "30.0000",
			refPrice: "49.00",
			currency: "USD",
			fromDate: CURRENT_FROM_DATE,
		}),
		arroz: await upsertProductClientTerms(tx, {
			productId: products.arroz.id,
			moq: "5.0000",
			moqPrice: "180000.00",
			step: "1.0000",
			stepPrice: "34000.00",
			max: "80.0000",
			refPrice: "36000.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		queso: await upsertProductClientTerms(tx, {
			productId: products.queso.id,
			moq: "10.0000",
			moqPrice: "95000.00",
			step: "5.0000",
			stepPrice: "44000.00",
			max: "120.0000",
			refPrice: "9500.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		yerba: await upsertProductClientTerms(tx, {
			productId: products.yerba.id,
			moq: "3.0000",
			moqPrice: "132000.00",
			step: "1.0000",
			stepPrice: "42000.00",
			max: "100.0000",
			refPrice: "44000.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		dulce: await upsertProductClientTerms(tx, {
			productId: products.dulce.id,
			moq: "6.0000",
			moqPrice: "90000.00",
			step: "6.0000",
			stepPrice: "84000.00",
			max: "72.0000",
			refPrice: "15000.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		manzana: await upsertProductClientTerms(tx, {
			productId: products.manzana.id,
			moq: "25.0000",
			moqPrice: "42500.00",
			step: "25.0000",
			stepPrice: "40000.00",
			max: "300.0000",
			refPrice: "1700.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		bandejaFuture: await upsertProductClientTerms(tx, {
			productId: products.bandeja.id,
			moq: "4.0000",
			moqPrice: "320.00",
			step: "2.0000",
			stepPrice: "150.00",
			max: "40.0000",
			refPrice: "80.00",
			currency: "BRL",
			fromDate: FUTURE_FROM_DATE,
		}),
		snackInactive: await upsertProductClientTerms(tx, {
			productId: products.snackInactivo.id,
			moq: "10.0000",
			moqPrice: "25000.00",
			step: "10.0000",
			stepPrice: "24000.00",
			refPrice: "2500.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		mixExpired: await upsertProductClientTerms(tx, {
			productId: products.mixDeleted.id,
			moq: "10.0000",
			moqPrice: "50000.00",
			step: "5.0000",
			stepPrice: "24000.00",
			refPrice: "5000.00",
			fromDate: EXPIRED_FROM_DATE,
			toDate: EXPIRED_TO_DATE,
		}),
	};

	const supplierTerms = {
		tomate: await upsertProductSupplierTerms(tx, {
			productId: products.tomate.id,
			supplierId: suppliers.valleVerde.id,
			moq: "50.0000",
			moqPrice: "45000.00",
			step: "10.0000",
			stepPrice: "8500.00",
			refPrice: "900.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		arroz: await upsertProductSupplierTerms(tx, {
			productId: products.arroz.id,
			supplierId: suppliers.packNorte.id,
			moq: "10.0000",
			moqPrice: "280000.00",
			step: "5.0000",
			stepPrice: "132000.00",
			refPrice: "28000.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		arrozValleVerde: await upsertProductSupplierTerms(tx, {
			productId: products.arroz.id,
			supplierId: suppliers.valleVerde.id,
			moq: "5.0000",
			moqPrice: "155000.00",
			step: "5.0000",
			stepPrice: "148000.00",
			refPrice: "31000.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		queso: await upsertProductSupplierTerms(tx, {
			productId: products.queso.id,
			supplierId: suppliers.lacteosSur.id,
			moq: "20.0000",
			moqPrice: "150000.00",
			step: "10.0000",
			stepPrice: "72000.00",
			refPrice: "7500.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		dulce: await upsertProductSupplierTerms(tx, {
			productId: products.dulce.id,
			supplierId: suppliers.lacteosSur.id,
			moq: "12.0000",
			moqPrice: "120000.00",
			step: "12.0000",
			stepPrice: "112000.00",
			refPrice: "10000.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		manzana: await upsertProductSupplierTerms(tx, {
			productId: products.manzana.id,
			supplierId: suppliers.valleVerde.id,
			moq: "50.0000",
			moqPrice: "60000.00",
			step: "25.0000",
			stepPrice: "29000.00",
			refPrice: "1200.00",
			fromDate: CURRENT_FROM_DATE,
		}),
		yerba: await upsertProductSupplierTerms(tx, {
			productId: products.yerba.id,
			supplierId: suppliers.packNorte.id,
			moq: "10.0000",
			moqPrice: "360000.00",
			step: "5.0000",
			stepPrice: "170000.00",
			refPrice: "36000.00",
			fromDate: CURRENT_FROM_DATE,
		}),
	};

	await Promise.all([
		upsertProductLocalConstraint(tx, {
			productId: products.tomate.id,
			constraintType: "max_quantity",
			value: json({ max: "500.0000", unit: "kg" }),
			scope: json({ channel: "b2b", country: "AR" }),
			reason: "Limite demo por disponibilidad semanal.",
		}),
		upsertProductLocalConstraint(tx, {
			productId: products.aceite.id,
			constraintType: "restricted_destination",
			value: json({ restrictedDestinationNames: ["Camara Fria Rosario"] }),
			scope: json({ reason: "no requiere cadena fria" }),
			reason: "No enviar aceite a circuito frio en datos demo.",
		}),
		upsertProductLocalConstraint(tx, {
			productId: products.queso.id,
			constraintType: "requires_internal_delivery",
			value: json({ required: true, temperature: "refrigerated" }),
			scope: json({ destinationType: "cold_chain" }),
			reason: "Producto refrigerado requiere control interno.",
		}),
		upsertProductLocalConstraint(tx, {
			productId: products.bandeja.id,
			constraintType: "seasonal_availability",
			value: json({ from: "2026-12-01", to: "2027-03-31" }),
			scope: json({ season: "verano" }),
			reason: "Producto con terminos futuros para pruebas.",
		}),
	]);

	return {
		addresses,
		brands,
		carriers,
		clientTerms,
		destinations,
		paymentMethods,
		products,
		supplierTerms,
		suppliers,
		users,
	};
}

type SeedMasterData = Awaited<ReturnType<typeof seedMasterData>>;

async function createCart(
	tx: Tx,
	input: {
		code: string;
		status:
			| "draft"
			| "pending"
			| "atCheckout"
			| "submitted"
			| "abandoned"
			| "cancelled"
			| "aborted";
		userId: string;
		items: Array<{
			code: string;
			quantity: string;
			status: "inCart" | "submitted" | "dropped" | "cancelled";
			fulfillmentStatus:
				| "awaitingAggregation"
				| "includedInOperation"
				| "allocatedToSupplierItem"
				| "requestedFromSupplier"
				| "supplierConfirmed"
				| "packaged"
				| "inInternalShipment"
				| "atWarehouse"
				| "inEndUserShipment"
				| "delivered"
				| "partiallyRolledOver"
				| "rolledOver"
				| "cancelled"
				| "exception";
			product: SeedProduct;
			terms: SeedClientTerms;
		}>;
	},
) {
	return tx.cart.create({
		data: {
			code: input.code,
			status: input.status,
			userId: input.userId,
			deleted: false,
			cartItems: {
				create: input.items.map((item) => {
					assertPositiveQuantity(item.quantity, item.code);

					return {
						code: item.code,
						quantity: item.quantity,
						status: item.status,
						fulfillmentStatus: item.fulfillmentStatus,
						deleted: false,
						productClientTermsId: item.terms.id,
						productSnapshot: buildProductSnapshot(item.product, item.terms),
					};
				}),
			},
		},
		include: { cartItems: true },
	});
}

function itemByCode<T extends { code: string }>(items: T[], code: string) {
	const item = items.find((candidate) => candidate.code === code);
	if (!item) throw new Error(`Missing seeded item ${code}`);
	return item;
}

function orderTotal(
	items: Array<{ terms: SeedClientTerms; quantity: string }>,
): Prisma.Decimal {
	return items.reduce(
		(total, item) => total.plus(calculateLineTotal(item.terms, item.quantity)),
		decimal("0"),
	);
}

async function createOrder(
	tx: Tx,
	input: {
		code: string;
		status:
			| "pending"
			| "processing"
			| "completed"
			| "cancelled"
			| "failed"
			| "refunded";
		userId: string;
		cartId: number;
		shippingAddress: SeedMasterData["addresses"]["buyerShipping"];
		billingAddress?: SeedMasterData["addresses"]["buyerBilling"];
		items: Array<{
			cartItemId: number;
			productSnapshot: unknown;
			quantity: string;
			terms: SeedClientTerms;
		}>;
		transactions: Array<{
			amount: string;
			currency: "ARS" | "USD" | "EUR" | "BRL";
			status: "pending" | "completed" | "failed" | "refunded";
			paymentMethodId: number;
			idempotencyKey: string;
			providerStatus: string;
			failureCode?: string;
			failureMessage?: string;
		}>;
	},
) {
	const acceptedAt = new Date(SEED_DATE);

	return tx.userOrder.create({
		data: {
			code: input.code,
			status: input.status,
			userId: input.userId,
			cartId: input.cartId,
			billingAddressSnapshot: input.billingAddress
				? buildAddressSnapshot(input.billingAddress)
				: Prisma.JsonNull,
			shippingAddressSnapshot: buildAddressSnapshot(input.shippingAddress),
			termsSnapshot: buildTermsSnapshot(acceptedAt),
			acceptedTermsAt: acceptedAt,
			items: {
				create: input.items.map((item) => ({
					sourceCartItemId: item.cartItemId,
					quantity: item.quantity,
					productSnapshot: json(item.productSnapshot),
					priceSnapshot: buildPriceSnapshot(item.terms, item.quantity),
				})),
			},
			transactions: {
				create: input.transactions.map((transaction) => ({
					amount: transaction.amount,
					currency: transaction.currency,
					status: transaction.status,
					provider: "mock",
					externalTransactionId: `mock-${transaction.status}-${transaction.idempotencyKey}`,
					idempotencyKey: transaction.idempotencyKey,
					providerStatus: transaction.providerStatus,
					failureCode: transaction.failureCode ?? null,
					failureMessage: transaction.failureMessage ?? null,
					paymentMethodId: transaction.paymentMethodId,
					requestSnapshot: json({
						source: "seed",
						orderCode: input.code,
						status: transaction.status,
					}),
					responseSnapshot: json({
						mock: true,
						providerStatus: transaction.providerStatus,
					}),
				})),
			},
		},
		include: { items: true, transactions: true },
	});
}

async function createCartItemLotItem(
	tx: Tx,
	input: { cartItemId: number; lotItemId: number; quantity: string },
) {
	assertPositiveQuantity(input.quantity, "CartItemLotItem quantity");

	return tx.cartItemLotItem.create({
		data: {
			cartItemId: input.cartItemId,
			lotItemId: input.lotItemId,
			quantity: input.quantity,
		},
	});
}

async function createPackageAllocation(
	tx: Tx,
	input: {
		cartItemLotItemId: number;
		cartItemLotItemQuantity: string;
		packageLotItemId: number;
		quantity: string;
	},
) {
	assertPositiveQuantity(input.quantity, "PackageAllocation quantity");
	assertQuantityAtMost({
		actual: input.quantity,
		limit: input.cartItemLotItemQuantity,
		label: "PackageAllocation quantity",
	});

	return tx.packageAllocation.create({
		data: {
			cartItemLotItemId: input.cartItemLotItemId,
			packageLotItemId: input.packageLotItemId,
			quantity: input.quantity,
		},
	});
}

async function seedTransactionalData(tx: Tx, data: SeedMasterData) {
	const cartPending = await createCart(tx, {
		code: "CART-SEED-PENDING",
		status: "pending",
		userId: data.users.buyer.id,
		items: [
			{
				code: "CITEM-SEED-PENDING-TOMATE",
				quantity: "30.0000",
				status: "inCart",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				code: "CITEM-SEED-PENDING-YERBA",
				quantity: "4.0000",
				status: "inCart",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
			},
		],
	});
	const cartCheckout = await createCart(tx, {
		code: "CART-SEED-CHECKOUT",
		status: "atCheckout",
		userId: data.users.buyer.id,
		items: [
			{
				code: "CITEM-SEED-CHECKOUT-ACEITE",
				quantity: "4.0000",
				status: "inCart",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.aceite,
				terms: data.clientTerms.aceite,
			},
		],
	});
	const cartProcessing = await createCart(tx, {
		code: "CART-SEED-PROCESSING",
		status: "submitted",
		userId: data.users.buyer.id,
		items: [
			{
				code: "CITEM-SEED-PROCESSING-TOMATE",
				quantity: "80.0000",
				status: "submitted",
				fulfillmentStatus: "requestedFromSupplier",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
		],
	});
	const cartCompleted = await createCart(tx, {
		code: "CART-SEED-COMPLETED",
		status: "submitted",
		userId: data.users.admin.id,
		items: [
			{
				code: "CITEM-SEED-COMPLETED-QUESO",
				quantity: "20.0000",
				status: "submitted",
				fulfillmentStatus: "delivered",
				product: data.products.queso,
				terms: data.clientTerms.queso,
			},
			{
				code: "CITEM-SEED-COMPLETED-DULCE",
				quantity: "12.0000",
				status: "submitted",
				fulfillmentStatus: "delivered",
				product: data.products.dulce,
				terms: data.clientTerms.dulce,
			},
		],
	});
	const cartException = await createCart(tx, {
		code: "CART-SEED-EXCEPTION",
		status: "submitted",
		userId: data.users.buyer.id,
		items: [
			{
				code: "CITEM-SEED-EXCEPTION-MANZANA",
				quantity: "50.0000",
				status: "submitted",
				fulfillmentStatus: "exception",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
			{
				code: "CITEM-SEED-EXCEPTION-ARROZ",
				quantity: "10.0000",
				status: "submitted",
				fulfillmentStatus: "partiallyRolledOver",
				product: data.products.arroz,
				terms: data.clientTerms.arroz,
			},
		],
	});

	await tx.cartItemTrackingEvent.createMany({
		data: [...cartPending.cartItems, ...cartCheckout.cartItems].map((item) => ({
			cartItemId: item.id,
			eventType: "addedToCart",
			source: "user",
			actorUserId: data.users.buyer.id,
			quantity: item.quantity,
			metadata: json({ source: "seed", cartStage: "mutable" }),
		})),
	});

	const processingItem = itemByCode(
		cartProcessing.cartItems,
		"CITEM-SEED-PROCESSING-TOMATE",
	);
	const completedQueso = itemByCode(
		cartCompleted.cartItems,
		"CITEM-SEED-COMPLETED-QUESO",
	);
	const completedDulce = itemByCode(
		cartCompleted.cartItems,
		"CITEM-SEED-COMPLETED-DULCE",
	);
	const exceptionManzana = itemByCode(
		cartException.cartItems,
		"CITEM-SEED-EXCEPTION-MANZANA",
	);
	const exceptionArroz = itemByCode(
		cartException.cartItems,
		"CITEM-SEED-EXCEPTION-ARROZ",
	);

	const processingTotal = orderTotal([
		{ terms: data.clientTerms.tomate, quantity: "80.0000" },
	]);
	const completedTotal = orderTotal([
		{ terms: data.clientTerms.queso, quantity: "20.0000" },
		{ terms: data.clientTerms.dulce, quantity: "12.0000" },
	]);
	const exceptionTotal = orderTotal([
		{ terms: data.clientTerms.manzana, quantity: "50.0000" },
		{ terms: data.clientTerms.arroz, quantity: "10.0000" },
	]);

	await createOrder(tx, {
		code: "ORD-SEED-PROCESSING",
		status: "processing",
		userId: data.users.buyer.id,
		cartId: cartProcessing.id,
		shippingAddress: data.addresses.buyerShipping,
		billingAddress: data.addresses.buyerBilling,
		items: [
			{
				cartItemId: processingItem.id,
				productSnapshot: processingItem.productSnapshot,
				quantity: "80.0000",
				terms: data.clientTerms.tomate,
			},
		],
		transactions: [
			{
				amount: processingTotal.toFixed(2),
				currency: "ARS",
				status: "failed",
				paymentMethodId: data.paymentMethods.buyerRejected.id,
				idempotencyKey: "seed-processing-failed-attempt",
				providerStatus: "rejected",
				failureCode: "mock_rejected",
				failureMessage: "Pago rechazado en intento demo previo.",
			},
			{
				amount: processingTotal.toFixed(2),
				currency: "ARS",
				status: "pending",
				paymentMethodId: data.paymentMethods.buyerMercadoPago.id,
				idempotencyKey: "seed-processing-pending-attempt",
				providerStatus: "pending_review",
			},
		],
	});
	await createOrder(tx, {
		code: "ORD-SEED-COMPLETED",
		status: "completed",
		userId: data.users.admin.id,
		cartId: cartCompleted.id,
		shippingAddress: data.addresses.adminShipping,
		items: [
			{
				cartItemId: completedQueso.id,
				productSnapshot: completedQueso.productSnapshot,
				quantity: "20.0000",
				terms: data.clientTerms.queso,
			},
			{
				cartItemId: completedDulce.id,
				productSnapshot: completedDulce.productSnapshot,
				quantity: "12.0000",
				terms: data.clientTerms.dulce,
			},
		],
		transactions: [
			{
				amount: completedTotal.toFixed(2),
				currency: "ARS",
				status: "completed",
				paymentMethodId: data.paymentMethods.adminTransfer.id,
				idempotencyKey: "seed-completed-paid",
				providerStatus: "approved",
			},
		],
	});
	await createOrder(tx, {
		code: "ORD-SEED-REFUNDED-EXCEPTION",
		status: "refunded",
		userId: data.users.buyer.id,
		cartId: cartException.id,
		shippingAddress: data.addresses.buyerShipping,
		billingAddress: data.addresses.buyerBilling,
		items: [
			{
				cartItemId: exceptionManzana.id,
				productSnapshot: exceptionManzana.productSnapshot,
				quantity: "50.0000",
				terms: data.clientTerms.manzana,
			},
			{
				cartItemId: exceptionArroz.id,
				productSnapshot: exceptionArroz.productSnapshot,
				quantity: "10.0000",
				terms: data.clientTerms.arroz,
			},
		],
		transactions: [
			{
				amount: exceptionTotal.toFixed(2),
				currency: "ARS",
				status: "refunded",
				paymentMethodId: data.paymentMethods.buyerCard.id,
				idempotencyKey: "seed-exception-refunded",
				providerStatus: "refunded",
			},
		],
	});

	const operationMain = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-05-AGG",
			from: CURRENT_FROM_DATE,
			strategy: "fifo",
		},
	});
	const operationRebatch = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-06-REBATCH",
			from: SEED_DATE,
			strategy: "fifo",
		},
	});

	const supplierOrderVeg = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.valleVerde.id,
			code: "SORD-SEED-VEG-REQ",
			externalReference: "EXT-SEED-VEG-REQ",
			status: "requested",
			requestedAt: SEED_DATE,
			metadata: json({ source: "seed", scenario: "awaiting supplier reply" }),
			supplierTransactions: {
				create: {
					amount: "72000.00",
					currency: "ARS",
					status: "pending",
				},
			},
		},
	});
	const supplierOrderDairy = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.lacteosSur.id,
			code: "SORD-SEED-DAIRY-COMP",
			externalReference: "EXT-SEED-DAIRY-COMP",
			status: "completed",
			requestedAt: SEED_DATE,
			confirmedAt: SEED_DATE,
			metadata: json({ source: "seed", scenario: "completed supplier flow" }),
			supplierTransactions: {
				create: {
					amount: "270000.00",
					currency: "ARS",
					status: "completed",
				},
			},
		},
	});
	const supplierOrderFruit = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.valleVerde.id,
			code: "SORD-SEED-FRUIT-READY",
			externalReference: "EXT-SEED-FRUIT-READY",
			status: "readyForReceipt",
			requestedAt: SEED_DATE,
			confirmedAt: SEED_DATE,
			metadata: json({ source: "seed", scenario: "partial rollover" }),
			supplierTransactions: {
				create: {
					amount: "102000.00",
					currency: "ARS",
					status: "failed",
				},
			},
		},
	});

	const lotVeg = await tx.lot.create({
		data: {
			code: "LOT-SEED-VEG-REQUESTED",
			status: "requested",
			operationId: operationMain.id,
			supplierId: data.suppliers.valleVerde.id,
			supplierOrderId: supplierOrderVeg.id,
		},
	});
	const lotDairy = await tx.lot.create({
		data: {
			code: "LOT-SEED-DAIRY-COMPLETED",
			status: "completed",
			operationId: operationMain.id,
			supplierId: data.suppliers.lacteosSur.id,
			supplierOrderId: supplierOrderDairy.id,
		},
	});
	const lotFruit = await tx.lot.create({
		data: {
			code: "LOT-SEED-FRUIT-EXCEPTION",
			status: "readyForPackaging",
			operationId: operationRebatch.id,
			supplierId: data.suppliers.valleVerde.id,
			supplierOrderId: supplierOrderFruit.id,
		},
	});

	const lotItemTomate = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-TOMATE-REQ",
			status: "requested",
			lotId: lotVeg.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.tomate.id,
			quantity: "80.0000",
		},
	});
	const lotItemQueso = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-QUESO-COMP",
			status: "completed",
			lotId: lotDairy.id,
			supplierId: data.suppliers.lacteosSur.id,
			destinationId: data.destinations.rosarioCold.id,
			productSupplierTermsId: data.supplierTerms.queso.id,
			quantity: "20.0000",
		},
	});
	const lotItemDulce = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-DULCE-COMP",
			status: "completed",
			lotId: lotDairy.id,
			supplierId: data.suppliers.lacteosSur.id,
			destinationId: data.destinations.rosarioCold.id,
			productSupplierTermsId: data.supplierTerms.dulce.id,
			quantity: "12.0000",
		},
	});
	const lotItemManzana = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-MANZANA-DELAY",
			status: "readyForPackaging",
			lotId: lotFruit.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.manzana.id,
			quantity: "50.0000",
		},
	});
	const lotItemArroz = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-ARROZ-PARTIAL",
			status: "readyForPackaging",
			lotId: lotFruit.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.cordoba.id,
			productSupplierTermsId: data.supplierTerms.arrozValleVerde.id,
			quantity: "6.0000",
		},
	});

	const cilliTomate = await createCartItemLotItem(tx, {
		cartItemId: processingItem.id,
		lotItemId: lotItemTomate.id,
		quantity: "80.0000",
	});
	const cilliQueso = await createCartItemLotItem(tx, {
		cartItemId: completedQueso.id,
		lotItemId: lotItemQueso.id,
		quantity: "20.0000",
	});
	const cilliDulce = await createCartItemLotItem(tx, {
		cartItemId: completedDulce.id,
		lotItemId: lotItemDulce.id,
		quantity: "12.0000",
	});
	const cilliManzana = await createCartItemLotItem(tx, {
		cartItemId: exceptionManzana.id,
		lotItemId: lotItemManzana.id,
		quantity: "50.0000",
	});
	const cilliArroz = await createCartItemLotItem(tx, {
		cartItemId: exceptionArroz.id,
		lotItemId: lotItemArroz.id,
		quantity: "6.0000",
	});
	const rollOverArroz = await tx.rollOver.create({
		data: {
			cartItemId: exceptionArroz.id,
			operationId: operationRebatch.id,
			stage: "preAllocation",
			status: "open",
			quantity: "4.0000",
			reason: "Cantidad parcial sin disponibilidad en el lote demo.",
		},
	});

	const carrierOrderInternal = await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.frioExpress.id,
			code: "CORD-SEED-INTERNAL-OK",
			externalReference: "CARR-INT-OK",
			status: "completed",
			requestedAt: SEED_DATE,
			confirmedAt: SEED_DATE,
			metadata: json({ source: "seed", route: "warehouse transfer" }),
		},
	});
	const carrierOrderFinal = await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.rapidoFederal.id,
			code: "CORD-SEED-ENDUSER-OK",
			externalReference: "CARR-END-OK",
			status: "completed",
			requestedAt: SEED_DATE,
			confirmedAt: SEED_DATE,
			metadata: json({ source: "seed", route: "final mile" }),
		},
	});
	const carrierOrderDelayed = await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.andesCargo.id,
			code: "CORD-SEED-ENDUSER-DELAY",
			externalReference: "CARR-END-DELAY",
			status: "inTransit",
			requestedAt: SEED_DATE,
			confirmedAt: SEED_DATE,
			metadata: json({ source: "seed", route: "delayed final mile" }),
		},
	});

	const shipmentInternal = await tx.shipment.create({
		data: {
			name: "Transferencia interna a Camara Fria Rosario",
			internalCode: "SHIP-SEED-INTERNAL-001",
			trackingCode: "TRK-SEED-INTERNAL-001",
			type: "internalTransfer",
			status: "received",
			carrierOrderId: carrierOrderInternal.id,
			destinationAddressSnapshot: shipmentAddressSnapshot(
				"Camara Fria Rosario",
				"Rosario",
				"Santa Fe",
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				"Recepcion Rosario",
				"+54 341 555 0101",
			),
		},
	});
	const shipmentFinal = await tx.shipment.create({
		data: {
			name: "Entrega final pedido completado",
			internalCode: "SHIP-SEED-ENDUSER-001",
			trackingCode: "TRK-SEED-ENDUSER-001",
			type: "endUserDelivery",
			status: "received",
			carrierOrderId: carrierOrderFinal.id,
			destinationAddressSnapshot: buildAddressSnapshot(
				data.addresses.adminShipping,
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				"Operador Admin Demo",
				"+54 351 555 0202",
			),
		},
	});
	const shipmentDelayed = await tx.shipment.create({
		data: {
			name: "Entrega final con demora operativa",
			internalCode: "SHIP-SEED-ENDUSER-002",
			trackingCode: "TRK-SEED-ENDUSER-002",
			type: "endUserDelivery",
			status: "delayed",
			carrierOrderId: carrierOrderDelayed.id,
			destinationAddressSnapshot: buildAddressSnapshot(
				data.addresses.buyerShipping,
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				"Compras Norte Demo",
				"+54 11 555 0303",
			),
		},
	});

	const packageInternal = await tx.package.create({
		data: {
			name: "PKG-SEED-WH-INTERNAL",
			trackingCode: "PKG-SEED-WH-INTERNAL",
			status: "received",
			shipmentId: shipmentInternal.id,
		},
	});
	const packageFinal = await tx.package.create({
		data: {
			name: "PKG-SEED-FINAL-OK",
			trackingCode: "PKG-SEED-FINAL-OK",
			status: "received",
			shipmentId: shipmentFinal.id,
		},
	});
	const packageDelayed = await tx.package.create({
		data: {
			name: "PKG-SEED-DELAYED",
			trackingCode: "PKG-SEED-DELAYED",
			status: "delayed",
			shipmentId: shipmentDelayed.id,
		},
	});

	const packageQueso = await tx.packageLotItem.create({
		data: {
			packageId: packageFinal.id,
			lotItemId: lotItemQueso.id,
			quantity: "20.0000",
			status: "received",
		},
	});
	const packageDulce = await tx.packageLotItem.create({
		data: {
			packageId: packageFinal.id,
			lotItemId: lotItemDulce.id,
			quantity: "12.0000",
			status: "received",
		},
	});
	const packageArroz = await tx.packageLotItem.create({
		data: {
			packageId: packageInternal.id,
			lotItemId: lotItemArroz.id,
			quantity: "6.0000",
			status: "received",
		},
	});
	const packageManzana = await tx.packageLotItem.create({
		data: {
			packageId: packageDelayed.id,
			lotItemId: lotItemManzana.id,
			quantity: "50.0000",
			status: "shipped",
		},
	});

	const allocationQueso = await createPackageAllocation(tx, {
		cartItemLotItemId: cilliQueso.id,
		cartItemLotItemQuantity: "20.0000",
		packageLotItemId: packageQueso.id,
		quantity: "20.0000",
	});
	const allocationDulce = await createPackageAllocation(tx, {
		cartItemLotItemId: cilliDulce.id,
		cartItemLotItemQuantity: "12.0000",
		packageLotItemId: packageDulce.id,
		quantity: "12.0000",
	});
	const allocationArroz = await createPackageAllocation(tx, {
		cartItemLotItemId: cilliArroz.id,
		cartItemLotItemQuantity: "6.0000",
		packageLotItemId: packageArroz.id,
		quantity: "6.0000",
	});
	const allocationManzana = await createPackageAllocation(tx, {
		cartItemLotItemId: cilliManzana.id,
		cartItemLotItemQuantity: "50.0000",
		packageLotItemId: packageManzana.id,
		quantity: "50.0000",
	});

	if (
		shipmentFinal.status !== "received" ||
		packageFinal.status !== "received"
	) {
		throw new Error("Completed seed shipment must be received");
	}
	if (
		shipmentDelayed.status !== "delayed" ||
		packageDelayed.status !== "delayed"
	) {
		throw new Error("Exception seed shipment must be delayed");
	}

	await tx.cartItemTrackingEvent.createMany({
		data: [
			{
				cartItemId: processingItem.id,
				eventType: "submittedToOrder",
				source: "user",
				actorUserId: data.users.buyer.id,
				quantity: "80.0000",
				metadata: json({ orderCode: "ORD-SEED-PROCESSING" }),
			},
			{
				cartItemId: processingItem.id,
				eventType: "includedInOperation",
				source: "system",
				operationId: operationMain.id,
				quantity: "80.0000",
				metadata: json({ operationCode: operationMain.code }),
			},
			{
				cartItemId: processingItem.id,
				eventType: "allocatedToLotItem",
				source: "system",
				operationId: operationMain.id,
				lotId: lotVeg.id,
				lotItemId: lotItemTomate.id,
				cartItemLotItemId: cilliTomate.id,
				quantity: "80.0000",
				metadata: json({ lotCode: lotVeg.code }),
			},
			{
				cartItemId: processingItem.id,
				eventType: "includedInSupplierOrder",
				source: "supplier",
				operationId: operationMain.id,
				lotId: lotVeg.id,
				lotItemId: lotItemTomate.id,
				quantity: "80.0000",
				metadata: json({ supplierOrderCode: supplierOrderVeg.code }),
			},
			...[
				{
					item: completedQueso,
					lot: lotDairy,
					lotItem: lotItemQueso,
					cilli: cilliQueso,
					packageRecord: packageFinal,
					allocation: allocationQueso,
					quantity: "20.0000",
				},
				{
					item: completedDulce,
					lot: lotDairy,
					lotItem: lotItemDulce,
					cilli: cilliDulce,
					packageRecord: packageFinal,
					allocation: allocationDulce,
					quantity: "12.0000",
				},
			].flatMap((entry) => [
				{
					cartItemId: entry.item.id,
					eventType: "submittedToOrder" as const,
					source: "user" as const,
					actorUserId: data.users.admin.id,
					quantity: entry.quantity,
					metadata: json({ orderCode: "ORD-SEED-COMPLETED" }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "supplierConfirmed" as const,
					source: "supplier" as const,
					operationId: operationMain.id,
					lotId: entry.lot.id,
					lotItemId: entry.lotItem.id,
					cartItemLotItemId: entry.cilli.id,
					quantity: entry.quantity,
					metadata: json({ supplierOrderCode: supplierOrderDairy.code }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "packaged" as const,
					source: "system" as const,
					operationId: operationMain.id,
					lotId: entry.lot.id,
					lotItemId: entry.lotItem.id,
					packageId: entry.packageRecord.id,
					packageAllocationId: entry.allocation.id,
					quantity: entry.quantity,
					metadata: json({ packageName: entry.packageRecord.name }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "movedInEndUserShipment" as const,
					source: "carrier" as const,
					packageId: entry.packageRecord.id,
					shipmentId: shipmentFinal.id,
					quantity: entry.quantity,
					metadata: json({ shipmentCode: shipmentFinal.internalCode }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "delivered" as const,
					source: "carrier" as const,
					packageId: entry.packageRecord.id,
					shipmentId: shipmentFinal.id,
					quantity: entry.quantity,
					metadata: json({ deliveredAt: SEED_DATE.toISOString() }),
				},
			]),
			{
				cartItemId: exceptionManzana.id,
				eventType: "submittedToOrder",
				source: "user",
				actorUserId: data.users.buyer.id,
				quantity: "50.0000",
				metadata: json({ orderCode: "ORD-SEED-REFUNDED-EXCEPTION" }),
			},
			{
				cartItemId: exceptionManzana.id,
				eventType: "packaged",
				source: "system",
				operationId: operationRebatch.id,
				lotId: lotFruit.id,
				lotItemId: lotItemManzana.id,
				packageId: packageDelayed.id,
				packageAllocationId: allocationManzana.id,
				quantity: "50.0000",
				metadata: json({ packageName: packageDelayed.name }),
			},
			{
				cartItemId: exceptionManzana.id,
				eventType: "movedInEndUserShipment",
				source: "carrier",
				packageId: packageDelayed.id,
				shipmentId: shipmentDelayed.id,
				quantity: "50.0000",
				metadata: json({
					shipmentCode: shipmentDelayed.internalCode,
					status: "delayed",
					reason: "Demora operativa demo",
				}),
			},
			{
				cartItemId: exceptionArroz.id,
				eventType: "submittedToOrder",
				source: "user",
				actorUserId: data.users.buyer.id,
				quantity: "10.0000",
				metadata: json({ orderCode: "ORD-SEED-REFUNDED-EXCEPTION" }),
			},
			{
				cartItemId: exceptionArroz.id,
				eventType: "rolledOverPreAllocation",
				source: "system",
				operationId: operationRebatch.id,
				rollOverId: rollOverArroz.id,
				quantity: "4.0000",
				metadata: json({ reason: rollOverArroz.reason }),
			},
			{
				cartItemId: exceptionArroz.id,
				eventType: "packaged",
				source: "system",
				operationId: operationRebatch.id,
				lotId: lotFruit.id,
				lotItemId: lotItemArroz.id,
				packageId: packageInternal.id,
				packageAllocationId: allocationArroz.id,
				quantity: "6.0000",
				metadata: json({ packageName: packageInternal.name }),
			},
			{
				cartItemId: exceptionArroz.id,
				eventType: "movedInInternalShipment",
				source: "carrier",
				packageId: packageInternal.id,
				shipmentId: shipmentInternal.id,
				quantity: "6.0000",
				metadata: json({ shipmentCode: shipmentInternal.internalCode }),
			},
			{
				cartItemId: exceptionArroz.id,
				eventType: "receivedAtWarehouse",
				source: "carrier",
				packageId: packageInternal.id,
				shipmentId: shipmentInternal.id,
				quantity: "6.0000",
				metadata: json({ destination: data.destinations.rosarioCold.name }),
			},
		],
	});

	await tx.auditLog.createMany({
		data: [
			{
				action: "seed.masterData.upsert",
				source: "system",
				actorReference: SEED_ACTOR_REFERENCE,
				entityType: "seed",
				entityId: "master-data",
				metadata: json({
					brands: 3,
					suppliers: 5,
					products: 10,
				}),
			},
			{
				action: "seed.checkoutScenarios.recreated",
				source: "system",
				actorReference: SEED_ACTOR_REFERENCE,
				entityType: "seed",
				entityId: "checkout-scenarios",
				metadata: json({
					carts: 5,
					orders: 3,
					transactions: 4,
				}),
			},
			{
				action: "seed.fulfillmentScenarios.recreated",
				source: "system",
				actorReference: SEED_ACTOR_REFERENCE,
				entityType: "seed",
				entityId: "fulfillment-scenarios",
				metadata: json({
					operations: 2,
					lots: 3,
					shipments: 3,
				}),
			},
		],
	});
}

async function buildSummary(tx: Tx) {
	const [
		suppliers,
		products,
		brands,
		carriers,
		destinations,
		users,
		carts,
		operations,
		lots,
		packages,
		shipments,
		trackingEvents,
	] = await Promise.all([
		tx.supplier.count({
			where: {
				name: {
					in: [
						"Cooperativa Valle Verde",
						"Lacteos del Sur",
						"Pack Norte Mayorista",
						"Frigorifico La Sierra",
						"Distribuidora Rio Parana",
					],
				},
			},
		}),
		tx.product.count({
			where: {
				name: {
					in: [
						"Tomate perita fresco",
						"Aceite de oliva extra virgen 5L",
						"Arroz largo fino bolsa 25kg",
						"Queso cremoso horma",
						"Yerba mate paquete 1kg x10",
						"Dulce de leche familiar 400g x12",
						"Manzana roja premium",
						"Bandeja compostable grande x100",
						"Snack estacional de verano",
						"Mix de frutos secos discontinuado",
					],
				},
			},
		}),
		tx.brand.count({
			where: { name: { in: ["Andes Fresh", "Pampa Pack", "Rio Dulce"] } },
		}),
		tx.carrier.count({
			where: {
				name: { in: ["Andes Cargo", "Rapido Federal", "Frio Express"] },
			},
		}),
		tx.destination.count({
			where: {
				name: { in: ["Deposito CABA", "Hub Cordoba", "Camara Fria Rosario"] },
			},
		}),
		tx.user.count({
			where: {
				email: {
					in: [
						"seed.user.buyer@coco.dev",
						"seed.admin@coco.dev",
						"seed.superadmin@coco.dev",
					],
				},
			},
		}),
		tx.cart.count({ where: { code: { startsWith: "CART-SEED-" } } }),
		tx.operation.count({ where: { code: { startsWith: "OP-SEED-" } } }),
		tx.lot.count({ where: { code: { startsWith: "LOT-SEED-" } } }),
		tx.package.count({ where: { name: { startsWith: "PKG-SEED-" } } }),
		tx.shipment.count({
			where: { internalCode: { startsWith: "SHIP-SEED-" } },
		}),
		tx.cartItemTrackingEvent.count({
			where: {
				OR: [
					{ metadata: { path: ["source"], equals: "seed" } },
					{ actorReference: SEED_ACTOR_REFERENCE },
					{ cartItem: { code: { startsWith: "CITEM-SEED-" } } },
				],
			},
		}),
	]);

	return {
		brands,
		carriers,
		carts,
		destinations,
		lots,
		operations,
		packages,
		products,
		shipments,
		suppliers,
		trackingEvents,
		users,
	};
}

async function main() {
	await assertSchemaReady();

	const summary = await db.$transaction(
		async (tx) => {
			await resetDemoTransactionalData(tx);
			const data = await seedMasterData(tx);
			await seedTransactionalData(tx, data);
			return buildSummary(tx);
		},
		{ maxWait: 10_000, timeout: 60_000 },
	);

	console.log("Seed completed");
	console.table(summary);
}

main()
	.catch((error) => {
		console.error("Seed failed");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
