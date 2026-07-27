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

/**
 * Payment instants for the seeded orders. `listOriginalDemand` selects demand by
 * `UserTransaction.completedAt`, and `planCutAbsorption` orders LIFO by the same
 * column, so these dates decide both what an operation can aggregate and who
 * absorbs a supplier cut.
 *
 * `AGGREGABLE_PAID_AT` is the pool the end-to-end harness aggregates from: the
 * only seeded demand that is paid, submitted, unallocated and free of open roll
 * overs. Keep at least one such cart item or the harness has nothing to execute.
 */
const AGGREGABLE_PAID_AT = new Date("2026-05-20T10:00:00.000Z");
const HISTORIC_PAID_AT = new Date("2026-04-05T10:00:00.000Z");
const COMPENSATED_PAID_AT = new Date("2026-05-08T10:00:00.000Z");
const SUPPLY_PAID_AT = new Date("2026-06-01T10:00:00.000Z");
const INBOUND_PAID_AT = new Date("2026-06-02T10:00:00.000Z");
const OUTBOUND_PAID_AT = new Date("2026-06-03T10:00:00.000Z");
const DISRUPTED_PAID_AT = new Date("2026-06-04T10:00:00.000Z");

/** Operation windows and supplier-loop timestamps for the seeded scenarios. */
const REBATCH_TO_DATE = new Date("2026-06-15T12:00:00.000Z");
const SUPPLY_REQUESTED_AT = new Date("2026-07-02T09:00:00.000Z");
const SUPPLY_CONFIRMED_AT = new Date("2026-07-04T09:00:00.000Z");
const SUPPLY_TO_DATE = new Date("2026-07-01T12:00:00.000Z");
const RUNNING_TO_DATE = new Date("2026-07-20T12:00:00.000Z");
/**
 * The draft's own window and the payment date of the pool inside it. Deliberately
 * later than every other operation's window: a draft reserves nothing, so demand
 * it shares with another fixture would be aggregated out from under it the first
 * time anyone executes that one, and the review would go empty (ADR 0006).
 */
const DRAFT_PAID_AT = new Date("2026-07-25T10:00:00.000Z");
const DRAFT_FROM_DATE = new Date("2026-07-22T00:00:00.000Z");
const DRAFT_TO_DATE = new Date("2026-07-28T12:00:00.000Z");
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
			/**
			 * When the payment settled. `listOriginalDemand` filters demand by this
			 * column, so a completed transaction without it is invisible to every
			 * operation — which is why no seeded order was aggregable before.
			 */
			completedAt?: Date;
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
					completedAt: transaction.completedAt ?? null,
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

type SeedCartItemInput = Parameters<typeof createCart>[1]["items"][number];
type SeedFulfillmentStatus = SeedCartItemInput["fulfillmentStatus"];

/**
 * A submitted cart plus the paid order behind it — the only shape that reaches
 * fulfillment. `paidAt` lands on the transaction's `completedAt`, which is what
 * makes the demand visible to `listOriginalDemand` and orderable by absorption.
 */
async function createPaidScenarioCart(
	tx: Tx,
	input: {
		cartCode: string;
		orderCode: string;
		userId: string;
		shippingAddress: SeedMasterData["addresses"]["buyerShipping"];
		paymentMethodId: number;
		paidAt: Date;
		items: Array<{
			code: string;
			quantity: string;
			fulfillmentStatus: SeedFulfillmentStatus;
			product: SeedProduct;
			terms: SeedClientTerms;
		}>;
	},
) {
	const cart = await createCart(tx, {
		code: input.cartCode,
		status: "submitted",
		userId: input.userId,
		items: input.items.map((item) => ({
			...item,
			status: "submitted" as const,
		})),
	});

	const total = orderTotal(input.items);

	const order = await createOrder(tx, {
		code: input.orderCode,
		status: "processing",
		userId: input.userId,
		cartId: cart.id,
		shippingAddress: input.shippingAddress,
		items: input.items.map((item) => {
			const cartItem = itemByCode(cart.cartItems, item.code);
			return {
				cartItemId: cartItem.id,
				productSnapshot: cartItem.productSnapshot,
				quantity: item.quantity,
				terms: item.terms,
			};
		}),
		transactions: [
			{
				amount: total.toFixed(2),
				currency: "ARS",
				status: "completed",
				paymentMethodId: input.paymentMethodId,
				idempotencyKey: `seed-${input.orderCode.toLowerCase()}-paid`,
				providerStatus: "approved",
				completedAt: input.paidAt,
			},
		],
	});

	return {
		cart,
		order,
		item: (code: string) => itemByCode(cart.cartItems, code),
		/**
		 * The demand key an operation would see this line under. `sourceKey` is
		 * `orderItem:{UserOrderItem.id}` — the same string `listOriginalDemand`
		 * builds — so a seeded omission can name a row that genuinely exists rather
		 * than a placeholder the first review would prune away (ADR 0006).
		 */
		sourceKey: (code: string) => {
			const cartItemId = itemByCode(cart.cartItems, code).id;
			const orderItem = order.items.find(
				(entry) => entry.sourceCartItemId === cartItemId,
			);
			if (!orderItem) {
				throw new Error(`No order item for cart item ${code}`);
			}
			return `orderItem:${orderItem.id}`;
		},
	};
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

type SeedDemandAllocation = {
	cartItemLotItemId: number;
	cartItemLotItemQuantity: string;
	quantity: string;
};

type SeedPackageLine = {
	lotItemId: number;
	quantity: string;
	status: "packed" | "shipped" | "received" | "cancelled";
	allocations: SeedDemandAllocation[];
};

/**
 * The write set of `supplierOrder.registerDispatch` plus whatever `shipment
 * .dispatch`/`receive` moved afterwards: one internal transfer carrying one
 * inbound package. Reproduced here rather than hand-assembled per fixture so an
 * inbound leg cannot drift from what the commands actually write.
 */
async function createInternalTransferLeg(
	tx: Tx,
	input: {
		shipmentName: string;
		internalCode: string;
		trackingCode?: string;
		shipmentStatus: "readyForDispatch" | "inTransit" | "received" | "failed";
		carrierOrderId?: number;
		destination: { label: string; city: string; state: string };
		contact: { name: string; phone: string };
		packageName: string;
		packageStatus:
			| "readyForShipment"
			| "inTransit"
			| "received"
			| "delayed"
			| "cancelled";
		lines: SeedPackageLine[];
	},
) {
	const shipment = await tx.shipment.create({
		data: {
			name: input.shipmentName,
			internalCode: input.internalCode,
			trackingCode: input.trackingCode,
			type: "internalTransfer",
			status: input.shipmentStatus,
			carrierOrderId: input.carrierOrderId,
			destinationAddressSnapshot: shipmentAddressSnapshot(
				input.destination.label,
				input.destination.city,
				input.destination.state,
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				input.contact.name,
				input.contact.phone,
			),
		},
	});

	const created = await tx.package.create({
		data: {
			name: input.packageName,
			trackingCode: input.packageName,
			leg: "inbound",
			status: input.packageStatus,
			shipmentId: shipment.id,
		},
	});

	const lines = await createPackageLines(tx, created.id, input.lines);

	return { shipment, package: created, lines };
}

/**
 * A fractionation output (`createOutboundPackage`) plus whatever a later delivery
 * command moved. `shipmentId` is null for depot pickup — the absence *is* the
 * mode (§8).
 */
async function createOutboundPackageFixture(
	tx: Tx,
	input: {
		name: string;
		status:
			| "readyForShipment"
			| "inTransit"
			| "received"
			| "delayed"
			| "failed";
		shipmentId: number | null;
		lines: SeedPackageLine[];
	},
) {
	const created = await tx.package.create({
		data: {
			name: input.name,
			trackingCode: input.name,
			leg: "outbound",
			status: input.status,
			shipmentId: input.shipmentId,
		},
	});

	const lines = await createPackageLines(tx, created.id, input.lines);

	return { package: created, lines };
}

async function createPackageLines(
	tx: Tx,
	packageId: number,
	lines: SeedPackageLine[],
) {
	const created: Array<{ id: number; lotItemId: number }> = [];

	for (const line of lines) {
		const packageLotItem = await tx.packageLotItem.create({
			data: {
				packageId,
				lotItemId: line.lotItemId,
				quantity: line.quantity,
				status: line.status,
			},
		});

		for (const allocation of line.allocations) {
			// A fully absorbed allocation survives at quantity 0 (§21.2), which the
			// positive-quantity guard in `createPackageAllocation` correctly refuses —
			// so the write-off shape goes straight to the row.
			if (decimal(allocation.quantity).isZero()) {
				await tx.packageAllocation.create({
					data: {
						cartItemLotItemId: allocation.cartItemLotItemId,
						packageLotItemId: packageLotItem.id,
						quantity: allocation.quantity,
					},
				});
				continue;
			}

			await createPackageAllocation(tx, {
				cartItemLotItemId: allocation.cartItemLotItemId,
				cartItemLotItemQuantity: allocation.cartItemLotItemQuantity,
				packageLotItemId: packageLotItem.id,
				quantity: allocation.quantity,
			});
		}

		created.push({ id: packageLotItem.id, lotItemId: line.lotItemId });
	}

	return created;
}

/**
 * Rewrites an operation's six live counters from its records, exactly as
 * `computeOperationCounters` (`src/server/services/operations/operation-counters.ts`)
 * defines them — the seed cannot import it, so `scripts/seed-verify.ts` runs the
 * real function against the result and fails if the two ever disagree.
 *
 * `eligibleQuantity`/`eligibleItemCount` stay the execution-time snapshot, so a
 * caller that seeds a cut or a compensation passes the pre-cut totals.
 */
async function alignOperationCounters(
	tx: Tx,
	operationId: number,
	options?: { eligibleQuantity?: string; eligibleItemCount?: number },
) {
	const record = await tx.operation.findUniqueOrThrow({
		where: { id: operationId },
		select: {
			lots: {
				select: {
					status: true,
					supplierOrderId: true,
					lotItems: {
						select: {
							status: true,
							quantity: true,
							cartItemLotItems: {
								select: { cartItemId: true, quantity: true },
							},
						},
					},
				},
			},
			rollOvers: { select: { cartItemId: true, status: true, quantity: true } },
		},
	});

	const liveLotItems = record.lots.flatMap((lot) =>
		lot.lotItems.filter(
			(lotItem) => lot.status !== "cancelled" && lotItem.status !== "cancelled",
		),
	);
	const liveRollOvers = record.rollOvers.filter(
		(rollOver) => rollOver.status !== "cancelled",
	);

	const assignedQuantity = liveLotItems.reduce(
		(total, lotItem) => total.plus(lotItem.quantity),
		decimal("0"),
	);
	const rollOverQuantity = liveRollOvers.reduce(
		(total, rollOver) => total.plus(rollOver.quantity),
		decimal("0"),
	);
	const assignedCartItemIds = new Set(
		liveLotItems.flatMap((lotItem) =>
			lotItem.cartItemLotItems
				.filter((allocation) => allocation.quantity.greaterThan(0))
				.map((allocation) => allocation.cartItemId),
		),
	);
	const rollOverCartItemIds = new Set(
		liveRollOvers.map((rollOver) => rollOver.cartItemId),
	);

	await tx.operation.update({
		where: { id: operationId },
		data: {
			assignedQuantity: assignedQuantity.toString(),
			rollOverQuantity: rollOverQuantity.toString(),
			assignedItemCount: assignedCartItemIds.size,
			rollOverItemCount: rollOverCartItemIds.size,
			lotCount: record.lots.length,
			supplierOrderCount: new Set(
				record.lots
					.map((lot) => lot.supplierOrderId)
					.filter((id): id is number => id !== null),
			).size,
			eligibleQuantity:
				options?.eligibleQuantity ??
				assignedQuantity.plus(rollOverQuantity).toString(),
			eligibleItemCount:
				options?.eligibleItemCount ??
				new Set([...assignedCartItemIds, ...rollOverCartItemIds]).size,
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
			// `dropped` is a cart-lifecycle status, not a fulfillment one: derivation
			// only reads `deleted` and `cancelled`, so this item stays at the
			// `awaitingAggregation` floor. It exists for the `cartItemRemoved` event.
			{
				code: "CITEM-SEED-PENDING-DROPPED",
				quantity: "5.0000",
				status: "dropped",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.arroz,
				terms: data.clientTerms.arroz,
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
			// `atWarehouse`, not `partiallyRolledOver`: its goods arrived on a received
			// inbound package, and the roll over overlay only downgrades a lineage that
			// has not reached `packaged` yet. `CITEM-SEED-SUPPLY-TOMATE` is the fixture
			// that does read `partiallyRolledOver`.
			{
				code: "CITEM-SEED-EXCEPTION-ARROZ",
				quantity: "10.0000",
				status: "submitted",
				fulfillmentStatus: "atWarehouse",
				product: data.products.arroz,
				terms: data.clientTerms.arroz,
			},
			{
				code: "CITEM-SEED-EXCEPTION-YERBA",
				quantity: "3.0000",
				status: "cancelled",
				fulfillmentStatus: "cancelled",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
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
	const exceptionYerba = itemByCode(
		cartException.cartItems,
		"CITEM-SEED-EXCEPTION-YERBA",
	);
	const pendingTomate = itemByCode(
		cartPending.cartItems,
		"CITEM-SEED-PENDING-TOMATE",
	);
	const pendingDropped = itemByCode(
		cartPending.cartItems,
		"CITEM-SEED-PENDING-DROPPED",
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
				completedAt: HISTORIC_PAID_AT,
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

	// ── Scenario carts ───────────────────────────────────────────────────────────
	// Every cart below is submitted and paid, which is the only shape fulfillment
	// reaches. The four `AGGREGABLE` ones are deliberately left unallocated: they
	// are the pool `scripts/fulfillment-e2e.ts` aggregates from. There are four
	// because fractionation groups by **cart**, and §21.7's run needs one outbound
	// package for the depot pickup, one for the home delivery and two for the
	// pickup point — the mode's whole point being several customers collecting from
	// one arrival. They order the same two products so each lot line carries four
	// demand allocations and LIFO absorption has something to order.
	//
	// **Every line clears its supplier MOQ on its own** (tomate 50 step 10, manzana
	// 50 step 25). `calculateAssignableQuantity` is applied per cart item rather
	// than to pooled demand, so a line below the MOQ rolls over pre-allocation and
	// its customer never reaches fractionation at all.
	await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-AGGREGABLE-C",
		orderCode: "ORD-SEED-AGGREGABLE-C",
		userId: data.users.superadmin.id,
		shippingAddress: data.addresses.adminShipping,
		paymentMethodId: data.paymentMethods.adminTransfer.id,
		paidAt: AGGREGABLE_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-AGG-C-TOMATE",
				quantity: "50.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				code: "CITEM-SEED-AGG-C-MANZANA",
				quantity: "100.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});
	await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-AGGREGABLE-D",
		orderCode: "ORD-SEED-AGGREGABLE-D",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: AGGREGABLE_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-AGG-D-TOMATE",
				quantity: "80.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				code: "CITEM-SEED-AGG-D-MANZANA",
				quantity: "50.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});
	await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-AGGREGABLE-B",
		orderCode: "ORD-SEED-AGGREGABLE-B",
		userId: data.users.admin.id,
		shippingAddress: data.addresses.adminShipping,
		paymentMethodId: data.paymentMethods.adminTransfer.id,
		paidAt: AGGREGABLE_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-AGG-B-TOMATE",
				quantity: "70.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				code: "CITEM-SEED-AGG-B-MANZANA",
				quantity: "50.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});
	await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-AGGREGABLE",
		orderCode: "ORD-SEED-AGGREGABLE",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: AGGREGABLE_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-AGG-TOMATE",
				quantity: "60.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				code: "CITEM-SEED-AGG-MANZANA",
				quantity: "75.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});

	// ── The draft's review pool (OP-SEED-2026-07-DRAFT) ──────────────────────────
	// Demand that exists only to be *reviewed*: paid, submitted, unallocated, and
	// sitting in a window no other operation covers. It is shaped so opening the
	// review shows every outcome `resolveAssignments` can produce rather than a
	// uniform list — two suppliers (so the plan is two lots, not one), one line
	// that clears its supplier MOQ exactly, one that overshoots the step, and one
	// that falls below MOQ and can only roll over.
	await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-REVIEW-A",
		orderCode: "ORD-SEED-REVIEW-A",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: DRAFT_PAID_AT,
		items: [
			{
				// Valle Verde moq 50 step 10 → assigned whole.
				code: "CITEM-SEED-REVIEW-A-TOMATE",
				quantity: "60.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				// Pack Norte moq 10 step 5 → 10 assigned, 2 rolled over off-step.
				code: "CITEM-SEED-REVIEW-A-YERBA",
				quantity: "12.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
			},
		],
	});

	const reviewPoolAdmin = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-REVIEW-B",
		orderCode: "ORD-SEED-REVIEW-B",
		userId: data.users.admin.id,
		shippingAddress: data.addresses.adminShipping,
		paymentMethodId: data.paymentMethods.adminTransfer.id,
		paidAt: DRAFT_PAID_AT,
		items: [
			{
				// Valle Verde moq 50 step 25 → assigned whole.
				code: "CITEM-SEED-REVIEW-B-MANZANA",
				quantity: "75.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
			{
				// Below Valle Verde's 50 MOQ: nothing assignable, rolls over whole.
				// This is the row the seeded omission names — omitting demand that
				// could only roll over is the cheapest realistic reason to omit.
				code: "CITEM-SEED-REVIEW-B-TOMATE",
				quantity: "30.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
		],
	});

	// The customer the draft omits wholesale. Their demand is perfectly assignable,
	// which is the point: a user omission is a standing decision about the customer,
	// not a consequence of what their lines resolve to.
	await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-REVIEW-C",
		orderCode: "ORD-SEED-REVIEW-C",
		userId: data.users.superadmin.id,
		shippingAddress: data.addresses.adminShipping,
		paymentMethodId: data.paymentMethods.adminTransfer.id,
		paidAt: DRAFT_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-REVIEW-C-MANZANA",
				quantity: "50.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});

	const cartSupply = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-SUPPLY",
		orderCode: "ORD-SEED-SUPPLY",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: SUPPLY_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-SUPPLY-YERBA",
				quantity: "12.0000",
				fulfillmentStatus: "allocatedToSupplierItem",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
			},
			{
				code: "CITEM-SEED-SUPPLY-TOMATE",
				quantity: "50.0000",
				fulfillmentStatus: "partiallyRolledOver",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				code: "CITEM-SEED-SUPPLY-MANZANA",
				quantity: "25.0000",
				fulfillmentStatus: "supplierConfirmed",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});

	const cartInbound = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-INBOUND",
		orderCode: "ORD-SEED-INBOUND",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: INBOUND_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-INBOUND-QUESO",
				quantity: "20.0000",
				fulfillmentStatus: "packaged",
				product: data.products.queso,
				terms: data.clientTerms.queso,
			},
			{
				code: "CITEM-SEED-INBOUND-ARROZ",
				quantity: "15.0000",
				fulfillmentStatus: "inInternalShipment",
				product: data.products.arroz,
				terms: data.clientTerms.arroz,
			},
			{
				code: "CITEM-SEED-INBOUND-MANZANA",
				quantity: "25.0000",
				fulfillmentStatus: "atWarehouse",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});

	const cartOutbound = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-OUTBOUND",
		orderCode: "ORD-SEED-OUTBOUND",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: OUTBOUND_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-OUTBOUND-TOMATE",
				quantity: "30.0000",
				fulfillmentStatus: "inEndUserShipment",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
			{
				code: "CITEM-SEED-OUTBOUND-MANZANA",
				quantity: "50.0000",
				fulfillmentStatus: "inEndUserShipment",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});

	// The pickup point's second customer: without a distinct cart the mode's whole
	// point — several customers collecting from one arrival — has no fixture.
	const cartPickup = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-PICKUP",
		orderCode: "ORD-SEED-PICKUP",
		userId: data.users.superadmin.id,
		shippingAddress: data.addresses.adminShipping,
		paymentMethodId: data.paymentMethods.adminTransfer.id,
		paidAt: OUTBOUND_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-PICKUP-MANZANA",
				quantity: "25.0000",
				fulfillmentStatus: "inEndUserShipment",
				product: data.products.manzana,
				terms: data.clientTerms.manzana,
			},
		],
	});

	const cartDisrupted = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-DISRUPTED",
		orderCode: "ORD-SEED-DISRUPTED",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: DISRUPTED_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-DISRUPTED-DULCE",
				quantity: "12.0000",
				fulfillmentStatus: "rolledOver",
				product: data.products.dulce,
				terms: data.clientTerms.dulce,
			},
			{
				code: "CITEM-SEED-DISRUPTED-YERBA",
				quantity: "10.0000",
				fulfillmentStatus: "exception",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
			},
			{
				code: "CITEM-SEED-DISRUPTED-TOMATE",
				quantity: "20.0000",
				fulfillmentStatus: "atWarehouse",
				product: data.products.tomate,
				terms: data.clientTerms.tomate,
			},
		],
	});

	const cartCompensated = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-COMPENSATED",
		orderCode: "ORD-SEED-COMPENSATED",
		userId: data.users.admin.id,
		shippingAddress: data.addresses.adminShipping,
		paymentMethodId: data.paymentMethods.adminTransfer.id,
		paidAt: COMPENSATED_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-COMPENSATED-YERBA",
				quantity: "12.0000",
				fulfillmentStatus: "awaitingAggregation",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
			},
		],
	});

	const cartRollOver = await createPaidScenarioCart(tx, {
		cartCode: "CART-SEED-ROLLOVER",
		orderCode: "ORD-SEED-ROLLOVER",
		userId: data.users.buyer.id,
		shippingAddress: data.addresses.buyerShipping,
		paymentMethodId: data.paymentMethods.buyerCard.id,
		paidAt: COMPENSATED_PAID_AT,
		items: [
			{
				code: "CITEM-SEED-ROLLOVER-YERBA",
				quantity: "6.0000",
				fulfillmentStatus: "rolledOver",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
			},
			{
				code: "CITEM-SEED-RESOLVED-ACEITE",
				quantity: "4.0000",
				fulfillmentStatus: "cancelled",
				product: data.products.aceite,
				terms: data.clientTerms.aceite,
			},
			{
				code: "CITEM-SEED-REBATCHED-YERBA",
				quantity: "5.0000",
				fulfillmentStatus: "includedInOperation",
				product: data.products.yerba,
				terms: data.clientTerms.yerba,
			},
		],
	});

	// ── Operations ───────────────────────────────────────────────────────────────
	// All completed except where the scenario is the status itself. Counters are
	// rewritten from records by `alignOperationCounters` at the end of this block.
	const operationMain = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-05-AGG",
			status: "completed",
			from: CURRENT_FROM_DATE,
			to: SEED_DATE,
			finishedAt: SEED_DATE,
			strategy: "fifo",
		},
	});
	const operationRebatch = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-06-REBATCH",
			status: "completed",
			from: SEED_DATE,
			to: REBATCH_TO_DATE,
			finishedAt: REBATCH_TO_DATE,
			strategy: "fifo",
		},
	});
	const operationSupply = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-07-SUPPLY",
			status: "completed",
			from: SUPPLY_PAID_AT,
			to: SUPPLY_TO_DATE,
			finishedAt: SUPPLY_TO_DATE,
			strategy: "fifo",
		},
	});
	const operationInbound = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-07-INBOUND",
			status: "completed",
			from: SUPPLY_PAID_AT,
			to: SUPPLY_TO_DATE,
			finishedAt: SUPPLY_TO_DATE,
			strategy: "fifo",
		},
	});
	const operationOutbound = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-07-OUTBOUND",
			status: "completed",
			from: SUPPLY_PAID_AT,
			to: SUPPLY_TO_DATE,
			finishedAt: SUPPLY_TO_DATE,
			strategy: "fifo",
		},
	});
	const operationDisrupted = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-07-DISRUPTED",
			status: "completed",
			from: SUPPLY_PAID_AT,
			to: SUPPLY_TO_DATE,
			finishedAt: SUPPLY_TO_DATE,
			strategy: "fifo",
		},
	});
	const operationCompensated = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-06-COMPENSATED",
			status: "cancelled",
			from: SEED_DATE,
			to: REBATCH_TO_DATE,
			finishedAt: REBATCH_TO_DATE,
			strategy: "fifo",
		},
	});
	const operationFailed = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-07-FAILED",
			status: "failed",
			from: SUPPLY_PAID_AT,
			to: SUPPLY_TO_DATE,
			failureReason: "Sin destino activo al momento de ejecutar la operacion.",
			strategy: "fifo",
		},
	});
	// `createAndExecute` commits the running row before it executes, so this is the
	// shape an operation genuinely has while its execution is still in flight.
	const operationRunning = await tx.operation.create({
		data: {
			code: "OP-SEED-2026-07-RUNNING",
			status: "running",
			from: SUPPLY_TO_DATE,
			to: RUNNING_TO_DATE,
			strategy: "fifo",
		},
	});
	// A draft awaiting review, over the pool created above. It owns no lots and no
	// roll overs — no command can produce a draft that does — and carries both
	// halves of the omission model pointed at rows that genuinely exist, so opening
	// the review renders the real thing instead of pruning the fixture away on
	// first sight. `createdAt` is left at `now()` so it stays inside
	// `operation.draft.stale`'s threshold (ADR 0006).
	await tx.operation.create({
		data: {
			code: "OP-SEED-2026-07-DRAFT",
			status: "draft",
			from: DRAFT_FROM_DATE,
			to: DRAFT_TO_DATE,
			// A draft needs a live destination: `review` runs the same
			// `validateOperation` the execution does, and it refuses without one.
			destinationId: data.destinations.caba.id,
			strategy: "fifo",
			notes: "Borrador pendiente de revisión",
			reviewState: json({
				omissions: {
					sourceKeys: [reviewPoolAdmin.sourceKey("CITEM-SEED-REVIEW-B-TOMATE")],
					userIds: [data.users.superadmin.id],
				},
			}),
		},
	});

	// ── Base supplier loop (OP-SEED-2026-05-AGG / OP-SEED-2026-06-REBATCH) ────────
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

	// ── S1: executed, not yet requested (the only fixture where `request` is live) ─
	const supplierOrderYerbaPending = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.packNorte.id,
			code: "SORD-SEED-YERBA-PENDING",
			status: "pending",
			metadata: json({
				source: "seed",
				scenario: "executed, not yet requested",
			}),
		},
	});
	const lotYerbaAssembling = await tx.lot.create({
		data: {
			code: "LOT-SEED-YERBA-ASSEMBLING",
			status: "assembling",
			operationId: operationSupply.id,
			supplierId: data.suppliers.packNorte.id,
			supplierOrderId: supplierOrderYerbaPending.id,
		},
	});
	const lotItemYerbaPending = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-YERBA-PENDING",
			status: "pending",
			lotId: lotYerbaAssembling.id,
			supplierId: data.suppliers.packNorte.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.yerba.id,
			quantity: "12.0000",
		},
	});
	const supplyYerba = cartSupply.item("CITEM-SEED-SUPPLY-YERBA");
	const cilliSupplyYerba = await createCartItemLotItem(tx, {
		cartItemId: supplyYerba.id,
		lotItemId: lotItemYerbaPending.id,
		quantity: "12.0000",
	});

	// ── S2: confirmed with a partial cut ─────────────────────────────────────────
	const supplierOrderVegConfirmed = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.valleVerde.id,
			code: "SORD-SEED-VEG-CONFIRMED",
			externalReference: "EXT-SEED-VEG-CONFIRMED",
			status: "confirmed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "partial supplier cut" }),
		},
	});
	const lotVegConfirmed = await tx.lot.create({
		data: {
			code: "LOT-SEED-VEG-CONFIRMED",
			status: "confirmed",
			operationId: operationSupply.id,
			supplierId: data.suppliers.valleVerde.id,
			supplierOrderId: supplierOrderVegConfirmed.id,
		},
	});
	// 50 requested, 40 confirmed: the cut is absorbed out of the demand allocation
	// and the lot line alike, and the missing 10 becomes a post-allocation roll over.
	const lotItemTomateCut = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-TOMATE-CUT",
			status: "confirmed",
			lotId: lotVegConfirmed.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.tomate.id,
			quantity: "40.0000",
		},
	});
	const lotItemManzanaConfirmed = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-MANZANA-CONFIRMED",
			status: "confirmed",
			lotId: lotVegConfirmed.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.manzana.id,
			quantity: "25.0000",
		},
	});
	const supplyTomate = cartSupply.item("CITEM-SEED-SUPPLY-TOMATE");
	const supplyManzana = cartSupply.item("CITEM-SEED-SUPPLY-MANZANA");
	const cilliSupplyTomate = await createCartItemLotItem(tx, {
		cartItemId: supplyTomate.id,
		lotItemId: lotItemTomateCut.id,
		quantity: "40.0000",
	});
	const cilliSupplyManzana = await createCartItemLotItem(tx, {
		cartItemId: supplyManzana.id,
		lotItemId: lotItemManzanaConfirmed.id,
		quantity: "25.0000",
	});

	// ── S3/S4/S5: the inbound ladder ─────────────────────────────────────────────
	const supplierOrderDairyDispatched = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.lacteosSur.id,
			code: "SORD-SEED-DAIRY-DISPATCHED",
			externalReference: "EXT-SEED-DAIRY-DISPATCHED",
			status: "readyForReceipt",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({
				source: "seed",
				scenario: "dispatched, awaiting departure",
			}),
		},
	});
	const lotDairyDispatched = await tx.lot.create({
		data: {
			code: "LOT-SEED-DAIRY-DISPATCHED",
			status: "confirmed",
			operationId: operationInbound.id,
			supplierId: data.suppliers.lacteosSur.id,
			supplierOrderId: supplierOrderDairyDispatched.id,
		},
	});
	const lotItemQuesoDispatch = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-QUESO-DISPATCH",
			status: "confirmed",
			lotId: lotDairyDispatched.id,
			supplierId: data.suppliers.lacteosSur.id,
			destinationId: data.destinations.rosarioCold.id,
			productSupplierTermsId: data.supplierTerms.queso.id,
			quantity: "20.0000",
		},
	});
	const inboundQueso = cartInbound.item("CITEM-SEED-INBOUND-QUESO");
	const cilliInboundQueso = await createCartItemLotItem(tx, {
		cartItemId: inboundQueso.id,
		lotItemId: lotItemQuesoDispatch.id,
		quantity: "20.0000",
	});

	const supplierOrderDryTransit = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.packNorte.id,
			code: "SORD-SEED-DRY-TRANSIT",
			externalReference: "EXT-SEED-DRY-TRANSIT",
			status: "readyForReceipt",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "in internal transit" }),
		},
	});
	const lotDryTransit = await tx.lot.create({
		data: {
			code: "LOT-SEED-DRY-TRANSIT",
			status: "confirmed",
			operationId: operationInbound.id,
			supplierId: data.suppliers.packNorte.id,
			supplierOrderId: supplierOrderDryTransit.id,
		},
	});
	const lotItemArrozTransit = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-ARROZ-TRANSIT",
			status: "confirmed",
			lotId: lotDryTransit.id,
			supplierId: data.suppliers.packNorte.id,
			destinationId: data.destinations.cordoba.id,
			productSupplierTermsId: data.supplierTerms.arroz.id,
			quantity: "15.0000",
		},
	});
	const inboundArroz = cartInbound.item("CITEM-SEED-INBOUND-ARROZ");
	const cilliInboundArroz = await createCartItemLotItem(tx, {
		cartItemId: inboundArroz.id,
		lotItemId: lotItemArrozTransit.id,
		quantity: "15.0000",
	});

	const supplierOrderFruitReceived = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.valleVerde.id,
			code: "SORD-SEED-FRUIT-RECEIVED",
			externalReference: "EXT-SEED-FRUIT-RECEIVED",
			status: "completed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({
				source: "seed",
				scenario: "received, awaiting fractionation",
			}),
		},
	});
	const lotFruitReceived = await tx.lot.create({
		data: {
			code: "LOT-SEED-FRUIT-RECEIVED",
			status: "readyForPackaging",
			operationId: operationInbound.id,
			supplierId: data.suppliers.valleVerde.id,
			supplierOrderId: supplierOrderFruitReceived.id,
		},
	});
	const lotItemManzanaReceived = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-MANZANA-RECEIVED",
			status: "readyForPackaging",
			lotId: lotFruitReceived.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.manzana.id,
			quantity: "25.0000",
		},
	});
	const inboundManzana = cartInbound.item("CITEM-SEED-INBOUND-MANZANA");
	const cilliInboundManzana = await createCartItemLotItem(tx, {
		cartItemId: inboundManzana.id,
		lotItemId: lotItemManzanaReceived.id,
		quantity: "25.0000",
	});

	// ── S6/S7: the outbound ladder, one lot serving both delivery modes ──────────
	const supplierOrderVegOut = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.valleVerde.id,
			code: "SORD-SEED-VEG-OUT",
			externalReference: "EXT-SEED-VEG-OUT",
			status: "completed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "delivered to customers" }),
		},
	});
	const lotVegOut = await tx.lot.create({
		data: {
			code: "LOT-SEED-VEG-OUT",
			status: "readyForPackaging",
			operationId: operationOutbound.id,
			supplierId: data.suppliers.valleVerde.id,
			supplierOrderId: supplierOrderVegOut.id,
		},
	});
	const lotItemTomateOut = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-TOMATE-OUT",
			status: "readyForPackaging",
			lotId: lotVegOut.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.tomate.id,
			quantity: "30.0000",
		},
	});
	const lotItemManzanaOut = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-MANZANA-OUT",
			status: "readyForPackaging",
			lotId: lotVegOut.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.manzana.id,
			quantity: "75.0000",
		},
	});
	const outboundTomate = cartOutbound.item("CITEM-SEED-OUTBOUND-TOMATE");
	const outboundManzana = cartOutbound.item("CITEM-SEED-OUTBOUND-MANZANA");
	const pickupManzana = cartPickup.item("CITEM-SEED-PICKUP-MANZANA");
	const cilliOutboundTomate = await createCartItemLotItem(tx, {
		cartItemId: outboundTomate.id,
		lotItemId: lotItemTomateOut.id,
		quantity: "30.0000",
	});
	const cilliOutboundManzana = await createCartItemLotItem(tx, {
		cartItemId: outboundManzana.id,
		lotItemId: lotItemManzanaOut.id,
		quantity: "50.0000",
	});
	const cilliPickupManzana = await createCartItemLotItem(tx, {
		cartItemId: pickupManzana.id,
		lotItemId: lotItemManzanaOut.id,
		quantity: "25.0000",
	});

	// ── S11/S11b/S12: disruption ─────────────────────────────────────────────────
	const supplierOrderDairyWriteOff = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.lacteosSur.id,
			code: "SORD-SEED-DAIRY-WRITEOFF",
			externalReference: "EXT-SEED-DAIRY-WRITEOFF",
			status: "completed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "package written off" }),
		},
	});
	const lotDairyWriteOff = await tx.lot.create({
		data: {
			code: "LOT-SEED-DAIRY-WRITEOFF",
			status: "readyForPackaging",
			operationId: operationDisrupted.id,
			supplierId: data.suppliers.lacteosSur.id,
			supplierOrderId: supplierOrderDairyWriteOff.id,
		},
	});
	// The write-off ran the four reductions: the lot line, the demand allocation and
	// the packaged allocation are all at 0, and the quantity lives in a roll over.
	const lotItemDulceWriteOff = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-DULCE-WRITEOFF",
			status: "readyForPackaging",
			lotId: lotDairyWriteOff.id,
			supplierId: data.suppliers.lacteosSur.id,
			destinationId: data.destinations.rosarioCold.id,
			productSupplierTermsId: data.supplierTerms.dulce.id,
			quantity: "0.0000",
		},
	});
	const disruptedDulce = cartDisrupted.item("CITEM-SEED-DISRUPTED-DULCE");
	const cilliDisruptedDulce = await tx.cartItemLotItem.create({
		data: {
			cartItemId: disruptedDulce.id,
			lotItemId: lotItemDulceWriteOff.id,
			quantity: "0.0000",
		},
	});

	const supplierOrderDryFailed = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.packNorte.id,
			code: "SORD-SEED-DRY-FAILED",
			externalReference: "EXT-SEED-DRY-FAILED",
			status: "completed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "outbound package lost" }),
		},
	});
	const lotDryFailed = await tx.lot.create({
		data: {
			code: "LOT-SEED-DRY-FAILED",
			status: "readyForPackaging",
			operationId: operationDisrupted.id,
			supplierId: data.suppliers.packNorte.id,
			supplierOrderId: supplierOrderDryFailed.id,
		},
	});
	const lotItemYerbaFailed = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-YERBA-FAILED",
			status: "readyForPackaging",
			lotId: lotDryFailed.id,
			supplierId: data.suppliers.packNorte.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.yerba.id,
			quantity: "10.0000",
		},
	});
	const disruptedYerba = cartDisrupted.item("CITEM-SEED-DISRUPTED-YERBA");
	const cilliDisruptedYerba = await createCartItemLotItem(tx, {
		cartItemId: disruptedYerba.id,
		lotItemId: lotItemYerbaFailed.id,
		quantity: "10.0000",
	});

	const supplierOrderVegRetry = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.valleVerde.id,
			code: "SORD-SEED-VEG-RETRY",
			externalReference: "EXT-SEED-VEG-RETRY",
			status: "completed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "end-user shipment retried" }),
		},
	});
	const lotVegRetry = await tx.lot.create({
		data: {
			code: "LOT-SEED-VEG-RETRY",
			status: "readyForPackaging",
			operationId: operationDisrupted.id,
			supplierId: data.suppliers.valleVerde.id,
			supplierOrderId: supplierOrderVegRetry.id,
		},
	});
	const lotItemTomateRetry = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-TOMATE-RETRY",
			status: "readyForPackaging",
			lotId: lotVegRetry.id,
			supplierId: data.suppliers.valleVerde.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.tomate.id,
			quantity: "20.0000",
		},
	});
	const disruptedTomate = cartDisrupted.item("CITEM-SEED-DISRUPTED-TOMATE");
	const cilliDisruptedTomate = await createCartItemLotItem(tx, {
		cartItemId: disruptedTomate.id,
		lotItemId: lotItemTomateRetry.id,
		quantity: "20.0000",
	});

	// ── S8: compensated operation — status-only, nothing deleted ─────────────────
	const supplierOrderYerbaCancelled = await tx.supplierOrder.create({
		data: {
			supplierId: data.suppliers.packNorte.id,
			code: "SORD-SEED-YERBA-CANCELLED",
			status: "cancelled",
			cancelledAt: REBATCH_TO_DATE,
			metadata: json({ source: "seed", scenario: "compensated operation" }),
		},
	});
	const lotYerbaCancelled = await tx.lot.create({
		data: {
			code: "LOT-SEED-YERBA-CANCELLED",
			status: "cancelled",
			operationId: operationCompensated.id,
			supplierId: data.suppliers.packNorte.id,
			supplierOrderId: supplierOrderYerbaCancelled.id,
		},
	});
	const lotItemYerbaCancelled = await tx.lotItem.create({
		data: {
			code: "LITEM-SEED-YERBA-CANCELLED",
			status: "cancelled",
			lotId: lotYerbaCancelled.id,
			supplierId: data.suppliers.packNorte.id,
			destinationId: data.destinations.caba.id,
			productSupplierTermsId: data.supplierTerms.yerba.id,
			quantity: "9.0000",
		},
	});
	const compensatedYerba = cartCompensated.item("CITEM-SEED-COMPENSATED-YERBA");
	await createCartItemLotItem(tx, {
		cartItemId: compensatedYerba.id,
		lotItemId: lotItemYerbaCancelled.id,
		quantity: "9.0000",
	});

	// ── Roll overs ───────────────────────────────────────────────────────────────
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
	const rollOverSupplyCut = await tx.rollOver.create({
		data: {
			cartItemId: supplyTomate.id,
			operationId: operationSupply.id,
			stage: "postAllocation",
			status: "open",
			quantity: "10.0000",
			reason: `Confirmacion parcial de la orden ${supplierOrderVegConfirmed.code}.`,
		},
	});
	const rollOverWriteOff = await tx.rollOver.create({
		data: {
			cartItemId: disruptedDulce.id,
			operationId: operationDisrupted.id,
			stage: "postAllocation",
			status: "open",
			quantity: "12.0000",
			reason: "Baja de paquete PKG-SEED-DISRUPTED-WRITEOFF: mercaderia dañada.",
		},
	});
	const rollOverFull = await tx.rollOver.create({
		data: {
			cartItemId: cartRollOver.item("CITEM-SEED-ROLLOVER-YERBA").id,
			operationId: operationRebatch.id,
			stage: "preAllocation",
			status: "open",
			quantity: "6.0000",
			reason: "Sin cantidad minima de proveedor en la operacion demo.",
		},
	});
	const rollOverResolved = await tx.rollOver.create({
		data: {
			cartItemId: cartRollOver.item("CITEM-SEED-RESOLVED-ACEITE").id,
			operationId: operationRebatch.id,
			stage: "preAllocation",
			status: "resolved",
			quantity: "4.0000",
			reason: "Resuelto con el cliente: no se reprograma.",
		},
	});
	// Consumed by the operation that is still executing, so no allocation exists for
	// it yet — the one shape that derives `includedInOperation`.
	const rollOverRebatched = await tx.rollOver.create({
		data: {
			cartItemId: cartRollOver.item("CITEM-SEED-REBATCHED-YERBA").id,
			operationId: operationMain.id,
			rebatchedIntoOperationId: operationRunning.id,
			stage: "preAllocation",
			status: "rebatched",
			quantity: "5.0000",
			reason: "Reprogramado hacia la operacion en curso.",
		},
	});
	await tx.rollOver.create({
		data: {
			cartItemId: compensatedYerba.id,
			operationId: operationCompensated.id,
			stage: "preAllocation",
			status: "cancelled",
			quantity: "3.0000",
			reason: "Compensacion de la operacion: la demanda vuelve al pool.",
		},
	});

	// ── Carrier orders ───────────────────────────────────────────────────────────
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
	const carrierOrderTransit = await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.andesCargo.id,
			code: "CORD-SEED-INBOUND-TRANSIT",
			externalReference: "CARR-INB-TRANSIT",
			status: "inTransit",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", route: "inbound transfer" }),
		},
	});
	const carrierOrderPickup = await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.rapidoFederal.id,
			code: "CORD-SEED-PICKUP-OK",
			externalReference: "CARR-PICKUP-OK",
			status: "completed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", route: "pickup point" }),
		},
	});
	// S14: one booking per remaining rung. They carry no shipments on purpose — a
	// closed booking holding a live shipment is exactly what
	// `carrierOrder.closedWithLiveShipments` exists to report.
	await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.andesCargo.id,
			code: "CORD-SEED-PENDING",
			status: "pending",
			metadata: json({ source: "seed", scenario: "awaiting request" }),
		},
	});
	await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.rapidoFederal.id,
			code: "CORD-SEED-REQUESTED",
			externalReference: "CARR-REQ",
			status: "requested",
			requestedAt: SUPPLY_REQUESTED_AT,
			metadata: json({ source: "seed", scenario: "awaiting carrier reply" }),
		},
	});
	await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.frioExpress.id,
			code: "CORD-SEED-CONFIRMED",
			externalReference: "CARR-CONF",
			status: "confirmed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "booked, not dispatched" }),
		},
	});
	await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.andesCargo.id,
			code: "CORD-SEED-CANCELLED",
			externalReference: "CARR-CANC",
			status: "cancelled",
			requestedAt: SUPPLY_REQUESTED_AT,
			cancelledAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "booking cancelled" }),
		},
	});
	await tx.carrierOrder.create({
		data: {
			carrierId: data.carriers.rapidoFederal.id,
			code: "CORD-SEED-FAILED",
			externalReference: "CARR-FAIL",
			status: "failed",
			requestedAt: SUPPLY_REQUESTED_AT,
			confirmedAt: SUPPLY_CONFIRMED_AT,
			metadata: json({ source: "seed", scenario: "carrier could not perform" }),
		},
	});

	// ── Base shipments and packages ──────────────────────────────────────────────
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
	const packageInternal = await tx.package.create({
		data: {
			name: "PKG-SEED-WH-INTERNAL",
			trackingCode: "PKG-SEED-WH-INTERNAL",
			leg: "inbound",
			status: "received",
			shipmentId: shipmentInternal.id,
		},
	});
	await createPackageLines(tx, packageInternal.id, [
		{
			lotItemId: lotItemArroz.id,
			quantity: "6.0000",
			status: "received",
			allocations: [
				{
					cartItemLotItemId: cilliArroz.id,
					cartItemLotItemQuantity: "6.0000",
					quantity: "6.0000",
				},
			],
		},
	]);

	// The inbound ancestors the delivered and delayed end-user packages were
	// fractionated from. Without them `package.outbound.exceedsReceived` fires on
	// every outbound allocation, which is the invariant working as designed.
	const dairyInbound = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna de lacteos a Rosario",
		internalCode: "SHIP-SEED-INTERNAL-002",
		shipmentStatus: "received",
		destination: {
			label: "Camara Fria Rosario",
			city: "Rosario",
			state: "Santa Fe",
		},
		contact: { name: "Recepcion Rosario", phone: "+54 341 555 0101" },
		packageName: "PKG-SEED-DAIRY-INBOUND",
		packageStatus: "received",
		lines: [
			{
				lotItemId: lotItemQueso.id,
				quantity: "20.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliQueso.id,
						cartItemLotItemQuantity: "20.0000",
						quantity: "20.0000",
					},
				],
			},
			{
				lotItemId: lotItemDulce.id,
				quantity: "12.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliDulce.id,
						cartItemLotItemQuantity: "12.0000",
						quantity: "12.0000",
					},
				],
			},
		],
	});

	const fruitInbound = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna de fruta a CABA",
		internalCode: "SHIP-SEED-INTERNAL-003",
		shipmentStatus: "received",
		destination: {
			label: "Deposito CABA",
			city: "CABA",
			state: "Buenos Aires",
		},
		contact: { name: "Recepcion CABA", phone: "+54 11 555 0110" },
		packageName: "PKG-SEED-FRUIT-INBOUND",
		packageStatus: "received",
		lines: [
			{
				lotItemId: lotItemManzana.id,
				quantity: "50.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliManzana.id,
						cartItemLotItemQuantity: "50.0000",
						quantity: "50.0000",
					},
				],
			},
		],
	});

	const shipmentFinal = await tx.shipment.create({
		data: {
			name: "Entrega final pedido completado",
			internalCode: "SHIP-SEED-ENDUSER-001",
			trackingCode: "TRK-SEED-ENDUSER-001",
			type: "endUserDelivery",
			deliveryMode: "homeDelivery",
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
	const packageFinal = await createOutboundPackageFixture(tx, {
		name: "PKG-SEED-FINAL-OK",
		status: "received",
		shipmentId: shipmentFinal.id,
		lines: [
			{
				lotItemId: lotItemQueso.id,
				quantity: "20.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliQueso.id,
						cartItemLotItemQuantity: "20.0000",
						quantity: "20.0000",
					},
				],
			},
			{
				lotItemId: lotItemDulce.id,
				quantity: "12.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliDulce.id,
						cartItemLotItemQuantity: "12.0000",
						quantity: "12.0000",
					},
				],
			},
		],
	});

	const shipmentDelayed = await tx.shipment.create({
		data: {
			name: "Entrega final con demora operativa",
			internalCode: "SHIP-SEED-ENDUSER-002",
			trackingCode: "TRK-SEED-ENDUSER-002",
			type: "endUserDelivery",
			deliveryMode: "pickupPoint",
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
	const packageDelayed = await createOutboundPackageFixture(tx, {
		name: "PKG-SEED-DELAYED",
		status: "delayed",
		shipmentId: shipmentDelayed.id,
		lines: [
			{
				lotItemId: lotItemManzana.id,
				quantity: "50.0000",
				status: "shipped",
				allocations: [
					{
						cartItemLotItemId: cilliManzana.id,
						cartItemLotItemQuantity: "50.0000",
						quantity: "50.0000",
					},
				],
			},
		],
	});

	// ── S3: dispatched, awaiting departure (also the unassigned-shipment fixture) ─
	// No tracking code on purpose: `shipment.carrierOrder.missing` fires on a
	// tracking code without a booking, and a shipment nobody has booked has none.
	const inboundReady = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna de lacteos lista para despacho",
		internalCode: "SHIP-SEED-INBOUND-READY",
		shipmentStatus: "readyForDispatch",
		destination: {
			label: "Camara Fria Rosario",
			city: "Rosario",
			state: "Santa Fe",
		},
		contact: { name: "Recepcion Rosario", phone: "+54 341 555 0101" },
		packageName: "PKG-SEED-INBOUND-READY",
		packageStatus: "readyForShipment",
		lines: [
			{
				lotItemId: lotItemQuesoDispatch.id,
				quantity: "20.0000",
				status: "packed",
				allocations: [
					{
						cartItemLotItemId: cilliInboundQueso.id,
						cartItemLotItemQuantity: "20.0000",
						quantity: "20.0000",
					},
				],
			},
		],
	});

	// ── S4: in internal transit ──────────────────────────────────────────────────
	const inboundTransit = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna de secos a Cordoba",
		internalCode: "SHIP-SEED-INBOUND-TRANSIT",
		trackingCode: "TRK-SEED-INBOUND-TRANSIT",
		shipmentStatus: "inTransit",
		carrierOrderId: carrierOrderTransit.id,
		destination: { label: "Hub Cordoba", city: "Cordoba", state: "Cordoba" },
		contact: { name: "Recepcion Cordoba", phone: "+54 351 555 0120" },
		packageName: "PKG-SEED-INBOUND-TRANSIT",
		packageStatus: "inTransit",
		lines: [
			{
				lotItemId: lotItemArrozTransit.id,
				quantity: "15.0000",
				status: "shipped",
				allocations: [
					{
						cartItemLotItemId: cilliInboundArroz.id,
						cartItemLotItemQuantity: "15.0000",
						quantity: "15.0000",
					},
				],
			},
		],
	});

	// ── S5: received, nothing fractionated yet — the fractionation worklist ──────
	const inboundReceived = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna de fruta recibida",
		internalCode: "SHIP-SEED-INBOUND-RECEIVED",
		shipmentStatus: "received",
		destination: {
			label: "Deposito CABA",
			city: "CABA",
			state: "Buenos Aires",
		},
		contact: { name: "Recepcion CABA", phone: "+54 11 555 0110" },
		packageName: "PKG-SEED-INBOUND-RECEIVED",
		packageStatus: "received",
		lines: [
			{
				lotItemId: lotItemManzanaReceived.id,
				quantity: "25.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliInboundManzana.id,
						cartItemLotItemQuantity: "25.0000",
						quantity: "25.0000",
					},
				],
			},
		],
	});

	// ── S6/S7: the outbound legs and their inbound ancestor ─────────────────────
	const outboundInbound = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna previa a la distribucion final",
		internalCode: "SHIP-SEED-OUT-INBOUND",
		shipmentStatus: "received",
		destination: {
			label: "Deposito CABA",
			city: "CABA",
			state: "Buenos Aires",
		},
		contact: { name: "Recepcion CABA", phone: "+54 11 555 0110" },
		packageName: "PKG-SEED-OUT-INBOUND",
		packageStatus: "received",
		lines: [
			{
				lotItemId: lotItemTomateOut.id,
				quantity: "30.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliOutboundTomate.id,
						cartItemLotItemQuantity: "30.0000",
						quantity: "30.0000",
					},
				],
			},
			{
				lotItemId: lotItemManzanaOut.id,
				quantity: "75.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliOutboundManzana.id,
						cartItemLotItemQuantity: "50.0000",
						quantity: "50.0000",
					},
					{
						cartItemLotItemId: cilliPickupManzana.id,
						cartItemLotItemQuantity: "25.0000",
						quantity: "25.0000",
					},
				],
			},
		],
	});

	const shipmentHome = await tx.shipment.create({
		data: {
			name: "Entrega a domicilio en curso",
			internalCode: "SHIP-SEED-ENDUSER-HOME",
			type: "endUserDelivery",
			deliveryMode: "homeDelivery",
			status: "inTransit",
			destinationAddressSnapshot: buildAddressSnapshot(
				data.addresses.buyerShipping,
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				"Compras Norte Demo",
				"+54 11 555 0303",
			),
		},
	});
	const packageHome = await createOutboundPackageFixture(tx, {
		name: "PKG-SEED-OUT-HOME",
		status: "inTransit",
		shipmentId: shipmentHome.id,
		lines: [
			{
				lotItemId: lotItemTomateOut.id,
				quantity: "30.0000",
				status: "shipped",
				allocations: [
					{
						cartItemLotItemId: cilliOutboundTomate.id,
						cartItemLotItemQuantity: "30.0000",
						quantity: "30.0000",
					},
				],
			},
		],
	});

	// The pickup point: the shipment arrived, the packages deliberately did not
	// cascade, and each customer collects with `package.confirmDelivery` (§8).
	const shipmentPickup = await tx.shipment.create({
		data: {
			name: "Entrega en punto de retiro Once",
			internalCode: "SHIP-SEED-ENDUSER-PICKUP",
			trackingCode: "TRK-SEED-ENDUSER-PICKUP",
			type: "endUserDelivery",
			deliveryMode: "pickupPoint",
			status: "received",
			carrierOrderId: carrierOrderPickup.id,
			destinationAddressSnapshot: shipmentAddressSnapshot(
				"Punto de retiro Once",
				"CABA",
				"Buenos Aires",
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				"Punto de retiro Once",
				"+54 11 555 0404",
			),
		},
	});
	const packagePickupBuyer = await createOutboundPackageFixture(tx, {
		name: "PKG-SEED-OUT-PICKUP-A",
		status: "inTransit",
		shipmentId: shipmentPickup.id,
		lines: [
			{
				lotItemId: lotItemManzanaOut.id,
				quantity: "50.0000",
				status: "shipped",
				allocations: [
					{
						cartItemLotItemId: cilliOutboundManzana.id,
						cartItemLotItemQuantity: "50.0000",
						quantity: "50.0000",
					},
				],
			},
		],
	});
	const packagePickupSuper = await createOutboundPackageFixture(tx, {
		name: "PKG-SEED-OUT-PICKUP-B",
		status: "inTransit",
		shipmentId: shipmentPickup.id,
		lines: [
			{
				lotItemId: lotItemManzanaOut.id,
				quantity: "25.0000",
				status: "shipped",
				allocations: [
					{
						cartItemLotItemId: cilliPickupManzana.id,
						cartItemLotItemQuantity: "25.0000",
						quantity: "25.0000",
					},
				],
			},
		],
	});

	// ── S11: the written-off package ─────────────────────────────────────────────
	const disruptedWriteOff = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna fallida de lacteos",
		internalCode: "SHIP-SEED-DISRUPTED-INBOUND",
		shipmentStatus: "failed",
		destination: {
			label: "Camara Fria Rosario",
			city: "Rosario",
			state: "Santa Fe",
		},
		contact: { name: "Recepcion Rosario", phone: "+54 341 555 0101" },
		packageName: "PKG-SEED-DISRUPTED-WRITEOFF",
		packageStatus: "cancelled",
		lines: [
			{
				lotItemId: lotItemDulceWriteOff.id,
				// Quantity survives as history; the status is what removes the line from
				// every count (§21.2).
				quantity: "12.0000",
				status: "cancelled",
				allocations: [
					{
						cartItemLotItemId: cilliDisruptedDulce.id,
						cartItemLotItemQuantity: "0.0000",
						quantity: "0.0000",
					},
				],
			},
		],
	});

	// ── S11b: an outbound package lost before handover (depot pickup) ────────────
	const disruptedInbound = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna de secos recibida",
		internalCode: "SHIP-SEED-DISRUPTED-RECEIVED",
		shipmentStatus: "received",
		destination: {
			label: "Deposito CABA",
			city: "CABA",
			state: "Buenos Aires",
		},
		contact: { name: "Recepcion CABA", phone: "+54 11 555 0110" },
		packageName: "PKG-SEED-DISRUPTED-INBOUND",
		packageStatus: "received",
		lines: [
			{
				lotItemId: lotItemYerbaFailed.id,
				quantity: "10.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliDisruptedYerba.id,
						cartItemLotItemQuantity: "10.0000",
						quantity: "10.0000",
					},
				],
			},
		],
	});
	const packageOutFailed = await createOutboundPackageFixture(tx, {
		name: "PKG-SEED-OUT-FAILED",
		status: "failed",
		shipmentId: null,
		lines: [
			{
				lotItemId: lotItemYerbaFailed.id,
				quantity: "10.0000",
				status: "packed",
				allocations: [
					{
						cartItemLotItemId: cilliDisruptedYerba.id,
						cartItemLotItemQuantity: "10.0000",
						quantity: "10.0000",
					},
				],
			},
		],
	});

	// ── S12: a failed end-user shipment whose packages a retry moved on ─────────
	const retryInbound = await createInternalTransferLeg(tx, {
		shipmentName: "Transferencia interna previa al reintento",
		internalCode: "SHIP-SEED-RETRY-INBOUND",
		shipmentStatus: "received",
		destination: {
			label: "Deposito CABA",
			city: "CABA",
			state: "Buenos Aires",
		},
		contact: { name: "Recepcion CABA", phone: "+54 11 555 0110" },
		packageName: "PKG-SEED-RETRY-INBOUND",
		packageStatus: "received",
		lines: [
			{
				lotItemId: lotItemTomateRetry.id,
				quantity: "20.0000",
				status: "received",
				allocations: [
					{
						cartItemLotItemId: cilliDisruptedTomate.id,
						cartItemLotItemQuantity: "20.0000",
						quantity: "20.0000",
					},
				],
			},
		],
	});
	// `retry` empties the source and leaves it `failed` as history (§8), so this row
	// carries no packages — and `shipment.failedWithoutFollowUp` correctly stays
	// silent, which is the negative case worth having a fixture for.
	await tx.shipment.create({
		data: {
			name: "Entrega a domicilio fallida",
			internalCode: "SHIP-SEED-ENDUSER-FAILED",
			type: "endUserDelivery",
			deliveryMode: "homeDelivery",
			status: "failed",
			destinationAddressSnapshot: buildAddressSnapshot(
				data.addresses.buyerShipping,
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				"Compras Norte Demo",
				"+54 11 555 0303",
			),
		},
	});
	const shipmentRetry = await tx.shipment.create({
		data: {
			name: "Entrega a domicilio reintentada",
			internalCode: "SHIP-SEED-ENDUSER-RETRY",
			type: "endUserDelivery",
			deliveryMode: "homeDelivery",
			status: "readyForDispatch",
			destinationAddressSnapshot: buildAddressSnapshot(
				data.addresses.buyerShipping,
			),
			destinationContactSnapshot: shipmentContactSnapshot(
				"Compras Norte Demo",
				"+54 11 555 0303",
			),
		},
	});
	const packageRetry = await createOutboundPackageFixture(tx, {
		name: "PKG-SEED-OUT-RETRY",
		status: "readyForShipment",
		shipmentId: shipmentRetry.id,
		lines: [
			{
				lotItemId: lotItemTomateRetry.id,
				quantity: "20.0000",
				status: "packed",
				allocations: [
					{
						cartItemLotItemId: cilliDisruptedTomate.id,
						cartItemLotItemQuantity: "20.0000",
						quantity: "20.0000",
					},
				],
			},
		],
	});

	if (
		shipmentFinal.status !== "received" ||
		packageFinal.package.status !== "received"
	) {
		throw new Error("Completed seed shipment must be received");
	}
	if (
		shipmentDelayed.status !== "delayed" ||
		packageDelayed.package.status !== "delayed"
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
					lotItem: lotItemQueso,
					cilli: cilliQueso,
					inboundPackageId: dairyInbound.package.id,
					quantity: "20.0000",
				},
				{
					item: completedDulce,
					lotItem: lotItemDulce,
					cilli: cilliDulce,
					inboundPackageId: dairyInbound.package.id,
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
					lotId: lotDairy.id,
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
					lotId: lotDairy.id,
					lotItemId: entry.lotItem.id,
					packageId: entry.inboundPackageId,
					quantity: entry.quantity,
					metadata: json({ packageName: "PKG-SEED-DAIRY-INBOUND" }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "movedInInternalShipment" as const,
					source: "carrier" as const,
					packageId: entry.inboundPackageId,
					shipmentId: dairyInbound.shipment.id,
					quantity: entry.quantity,
					metadata: json({ shipmentCode: dairyInbound.shipment.internalCode }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "receivedAtWarehouse" as const,
					source: "carrier" as const,
					packageId: entry.inboundPackageId,
					shipmentId: dairyInbound.shipment.id,
					quantity: entry.quantity,
					metadata: json({ destination: data.destinations.rosarioCold.name }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "movedInEndUserShipment" as const,
					source: "carrier" as const,
					packageId: packageFinal.package.id,
					shipmentId: shipmentFinal.id,
					quantity: entry.quantity,
					metadata: json({ shipmentCode: shipmentFinal.internalCode }),
				},
				{
					cartItemId: entry.item.id,
					eventType: "delivered" as const,
					source: "carrier" as const,
					packageId: packageFinal.package.id,
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
				packageId: fruitInbound.package.id,
				quantity: "50.0000",
				metadata: json({ packageName: "PKG-SEED-FRUIT-INBOUND" }),
			},
			{
				cartItemId: exceptionManzana.id,
				eventType: "receivedAtWarehouse",
				source: "carrier",
				packageId: fruitInbound.package.id,
				shipmentId: fruitInbound.shipment.id,
				quantity: "50.0000",
				metadata: json({ destination: data.destinations.caba.name }),
			},
			{
				cartItemId: exceptionManzana.id,
				eventType: "movedInEndUserShipment",
				source: "carrier",
				packageId: packageDelayed.package.id,
				shipmentId: shipmentDelayed.id,
				quantity: "50.0000",
				metadata: json({
					shipmentCode: shipmentDelayed.internalCode,
					status: "delayed",
					reason: "Demora operativa demo",
				}),
			},
			{
				cartItemId: exceptionManzana.id,
				eventType: "fulfillmentException",
				source: "admin",
				packageId: packageDelayed.package.id,
				shipmentId: shipmentDelayed.id,
				quantity: "50.0000",
				metadata: json({ reason: "Demora operativa demo" }),
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
			{
				cartItemId: exceptionYerba.id,
				eventType: "cartItemCancelled",
				source: "user",
				actorUserId: data.users.buyer.id,
				quantity: "3.0000",
				metadata: json({ reason: "El cliente cancelo la linea." }),
			},
			{
				cartItemId: pendingTomate.id,
				eventType: "cartItemQuantityChanged",
				source: "user",
				actorUserId: data.users.buyer.id,
				quantity: "30.0000",
				metadata: json({ previousQuantity: "20.0000", newQuantity: "30.0000" }),
			},
			{
				cartItemId: pendingDropped.id,
				eventType: "cartItemRemoved",
				source: "user",
				actorUserId: data.users.buyer.id,
				quantity: "5.0000",
				metadata: json({ reason: "Quitado del carrito antes de confirmar." }),
			},
			// S1: executed, not yet requested.
			{
				cartItemId: supplyYerba.id,
				eventType: "includedInOperation",
				source: "system",
				operationId: operationSupply.id,
				quantity: "12.0000",
				metadata: json({ operationCode: operationSupply.code }),
			},
			{
				cartItemId: supplyYerba.id,
				eventType: "allocatedToLotItem",
				source: "system",
				operationId: operationSupply.id,
				lotId: lotYerbaAssembling.id,
				lotItemId: lotItemYerbaPending.id,
				cartItemLotItemId: cilliSupplyYerba.id,
				quantity: "12.0000",
				metadata: json({ lotCode: lotYerbaAssembling.code }),
			},
			// S2: confirmed with a partial cut.
			{
				cartItemId: supplyTomate.id,
				eventType: "allocatedToLotItem",
				source: "system",
				operationId: operationSupply.id,
				lotId: lotVegConfirmed.id,
				lotItemId: lotItemTomateCut.id,
				cartItemLotItemId: cilliSupplyTomate.id,
				quantity: "50.0000",
				metadata: json({ lotCode: lotVegConfirmed.code }),
			},
			{
				cartItemId: supplyTomate.id,
				eventType: "includedInSupplierOrder",
				source: "supplier",
				operationId: operationSupply.id,
				lotId: lotVegConfirmed.id,
				lotItemId: lotItemTomateCut.id,
				quantity: "50.0000",
				metadata: json({ supplierOrderCode: supplierOrderVegConfirmed.code }),
			},
			{
				cartItemId: supplyTomate.id,
				eventType: "rolledOverPostAllocation",
				source: "supplier",
				operationId: operationSupply.id,
				rollOverId: rollOverSupplyCut.id,
				quantity: "10.0000",
				metadata: json({ reason: rollOverSupplyCut.reason }),
			},
			{
				cartItemId: supplyTomate.id,
				eventType: "supplierConfirmed",
				source: "supplier",
				operationId: operationSupply.id,
				lotId: lotVegConfirmed.id,
				lotItemId: lotItemTomateCut.id,
				cartItemLotItemId: cilliSupplyTomate.id,
				quantity: "40.0000",
				metadata: json({ supplierOrderCode: supplierOrderVegConfirmed.code }),
			},
			{
				cartItemId: supplyManzana.id,
				eventType: "supplierConfirmed",
				source: "supplier",
				operationId: operationSupply.id,
				lotId: lotVegConfirmed.id,
				lotItemId: lotItemManzanaConfirmed.id,
				cartItemLotItemId: cilliSupplyManzana.id,
				quantity: "25.0000",
				metadata: json({ supplierOrderCode: supplierOrderVegConfirmed.code }),
			},
			// S3: dispatched, awaiting departure.
			{
				cartItemId: inboundQueso.id,
				eventType: "packaged",
				source: "system",
				operationId: operationInbound.id,
				lotId: lotDairyDispatched.id,
				lotItemId: lotItemQuesoDispatch.id,
				packageId: inboundReady.package.id,
				quantity: "20.0000",
				metadata: json({ packageName: inboundReady.package.name }),
			},
			// S4: in internal transit.
			{
				cartItemId: inboundArroz.id,
				eventType: "packaged",
				source: "system",
				operationId: operationInbound.id,
				lotId: lotDryTransit.id,
				lotItemId: lotItemArrozTransit.id,
				packageId: inboundTransit.package.id,
				quantity: "15.0000",
				metadata: json({ packageName: inboundTransit.package.name }),
			},
			{
				cartItemId: inboundArroz.id,
				eventType: "movedInInternalShipment",
				source: "carrier",
				packageId: inboundTransit.package.id,
				shipmentId: inboundTransit.shipment.id,
				quantity: "15.0000",
				metadata: json({ shipmentCode: inboundTransit.shipment.internalCode }),
			},
			// S5: received, awaiting fractionation.
			{
				cartItemId: inboundManzana.id,
				eventType: "movedInInternalShipment",
				source: "carrier",
				packageId: inboundReceived.package.id,
				shipmentId: inboundReceived.shipment.id,
				quantity: "25.0000",
				metadata: json({ shipmentCode: inboundReceived.shipment.internalCode }),
			},
			{
				cartItemId: inboundManzana.id,
				eventType: "receivedAtWarehouse",
				source: "carrier",
				packageId: inboundReceived.package.id,
				shipmentId: inboundReceived.shipment.id,
				quantity: "25.0000",
				metadata: json({ destination: data.destinations.caba.name }),
			},
			// S6: out for home delivery.
			{
				cartItemId: outboundTomate.id,
				eventType: "receivedAtWarehouse",
				source: "carrier",
				packageId: outboundInbound.package.id,
				shipmentId: outboundInbound.shipment.id,
				quantity: "30.0000",
				metadata: json({ destination: data.destinations.caba.name }),
			},
			{
				cartItemId: outboundTomate.id,
				eventType: "movedInEndUserShipment",
				source: "carrier",
				packageId: packageHome.package.id,
				shipmentId: shipmentHome.id,
				quantity: "30.0000",
				metadata: json({ shipmentCode: shipmentHome.internalCode }),
			},
			// S7: arrived at a pickup point, uncollected.
			...[
				{
					cartItemId: outboundManzana.id,
					packageId: packagePickupBuyer.package.id,
					quantity: "50.0000",
				},
				{
					cartItemId: pickupManzana.id,
					packageId: packagePickupSuper.package.id,
					quantity: "25.0000",
				},
			].flatMap((entry) => [
				{
					cartItemId: entry.cartItemId,
					eventType: "receivedAtWarehouse" as const,
					source: "carrier" as const,
					packageId: outboundInbound.package.id,
					shipmentId: outboundInbound.shipment.id,
					quantity: entry.quantity,
					metadata: json({ destination: data.destinations.caba.name }),
				},
				{
					cartItemId: entry.cartItemId,
					eventType: "movedInEndUserShipment" as const,
					source: "carrier" as const,
					packageId: entry.packageId,
					shipmentId: shipmentPickup.id,
					quantity: entry.quantity,
					metadata: json({ shipmentCode: shipmentPickup.internalCode }),
				},
				{
					cartItemId: entry.cartItemId,
					eventType: "arrivedAtPickupPoint" as const,
					source: "carrier" as const,
					packageId: entry.packageId,
					shipmentId: shipmentPickup.id,
					quantity: entry.quantity,
					metadata: json({ pickupPoint: "Punto de retiro Once" }),
				},
			]),
			// S8: compensated operation.
			{
				cartItemId: compensatedYerba.id,
				eventType: "includedInOperation",
				source: "system",
				operationId: operationCompensated.id,
				quantity: "12.0000",
				metadata: json({ operationCode: operationCompensated.code }),
			},
			{
				cartItemId: compensatedYerba.id,
				eventType: "excludedFromOperation",
				source: "admin",
				operationId: operationCompensated.id,
				quantity: "12.0000",
				metadata: json({ reason: "Compensacion administrativa demo." }),
			},
			// S9: a roll over resolved without delivery.
			{
				cartItemId: rollOverResolved.cartItemId,
				eventType: "rolledOverPreAllocation",
				source: "system",
				operationId: operationRebatch.id,
				rollOverId: rollOverResolved.id,
				quantity: "4.0000",
				metadata: json({ reason: rollOverResolved.reason }),
			},
			{
				cartItemId: rollOverResolved.cartItemId,
				eventType: "rollOverResolved",
				source: "admin",
				operationId: operationRebatch.id,
				rollOverId: rollOverResolved.id,
				quantity: "4.0000",
				metadata: json({ reason: rollOverResolved.reason }),
			},
			// S10: entirely rolled over.
			{
				cartItemId: rollOverFull.cartItemId,
				eventType: "includedInOperation",
				source: "system",
				operationId: operationRebatch.id,
				quantity: "6.0000",
				metadata: json({ operationCode: operationRebatch.code }),
			},
			{
				cartItemId: rollOverFull.cartItemId,
				eventType: "rolledOverPreAllocation",
				source: "system",
				operationId: operationRebatch.id,
				rollOverId: rollOverFull.id,
				quantity: "6.0000",
				metadata: json({ reason: rollOverFull.reason }),
			},
			// The rebatched roll over: consumed by the operation still executing.
			{
				cartItemId: rollOverRebatched.cartItemId,
				eventType: "rolledOverPreAllocation",
				source: "system",
				operationId: operationMain.id,
				rollOverId: rollOverRebatched.id,
				quantity: "5.0000",
				metadata: json({ reason: rollOverRebatched.reason }),
			},
			{
				cartItemId: rollOverRebatched.cartItemId,
				eventType: "includedInOperation",
				source: "system",
				operationId: operationRunning.id,
				quantity: "5.0000",
				metadata: json({ operationCode: operationRunning.code }),
			},
			// S11: the written-off package.
			{
				cartItemId: disruptedDulce.id,
				eventType: "packaged",
				source: "system",
				operationId: operationDisrupted.id,
				lotId: lotDairyWriteOff.id,
				lotItemId: lotItemDulceWriteOff.id,
				packageId: disruptedWriteOff.package.id,
				quantity: "12.0000",
				metadata: json({ packageName: disruptedWriteOff.package.name }),
			},
			{
				cartItemId: disruptedDulce.id,
				eventType: "fulfillmentException",
				source: "admin",
				packageId: disruptedWriteOff.package.id,
				shipmentId: disruptedWriteOff.shipment.id,
				quantity: "12.0000",
				metadata: json({ reason: "Mercaderia dañada en transito." }),
			},
			{
				cartItemId: disruptedDulce.id,
				eventType: "rolledOverPostAllocation",
				source: "admin",
				operationId: operationDisrupted.id,
				rollOverId: rollOverWriteOff.id,
				quantity: "12.0000",
				metadata: json({ reason: rollOverWriteOff.reason }),
			},
			{
				cartItemId: disruptedDulce.id,
				eventType: "exceptionResolved",
				source: "admin",
				packageId: disruptedWriteOff.package.id,
				quantity: "12.0000",
				metadata: json({
					reason: "Baja registrada; la demanda se reprograma.",
				}),
			},
			// S11b: an outbound package lost before handover.
			{
				cartItemId: disruptedYerba.id,
				eventType: "receivedAtWarehouse",
				source: "carrier",
				packageId: disruptedInbound.package.id,
				shipmentId: disruptedInbound.shipment.id,
				quantity: "10.0000",
				metadata: json({ destination: data.destinations.caba.name }),
			},
			{
				cartItemId: disruptedYerba.id,
				eventType: "fulfillmentException",
				source: "admin",
				packageId: packageOutFailed.package.id,
				quantity: "10.0000",
				metadata: json({ reason: "Paquete extraviado antes de la entrega." }),
			},
			// S12: the retried end-user shipment.
			{
				cartItemId: disruptedTomate.id,
				eventType: "receivedAtWarehouse",
				source: "carrier",
				packageId: retryInbound.package.id,
				shipmentId: retryInbound.shipment.id,
				quantity: "20.0000",
				metadata: json({ destination: data.destinations.caba.name }),
			},
			{
				cartItemId: disruptedTomate.id,
				eventType: "packaged",
				source: "system",
				operationId: operationDisrupted.id,
				lotId: lotVegRetry.id,
				lotItemId: lotItemTomateRetry.id,
				packageId: packageRetry.package.id,
				quantity: "20.0000",
				metadata: json({ packageName: packageRetry.package.name }),
			},
		],
	});

	// Rewritten from records so `operation.quantity.*` holds by construction. The
	// compensated operation keeps its pre-compensation snapshot: its live counters
	// go to zero while `eligibleQuantity` stays frozen (architecture §11), which is
	// exactly why cancelled operations are exempt from the balance rule.
	for (const operationId of [
		operationMain.id,
		operationRebatch.id,
		operationSupply.id,
		operationInbound.id,
		operationOutbound.id,
		operationDisrupted.id,
		operationFailed.id,
		operationRunning.id,
	]) {
		await alignOperationCounters(tx, operationId);
	}
	await alignOperationCounters(tx, operationCompensated.id, {
		eligibleQuantity: "12.0000",
		eligibleItemCount: 1,
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
					carts: 12,
					orders: 10,
					transactions: 11,
				}),
			},
			{
				action: "seed.fulfillmentScenarios.recreated",
				source: "system",
				actorReference: SEED_ACTOR_REFERENCE,
				entityType: "seed",
				entityId: "fulfillment-scenarios",
				metadata: json({
					operations: 9,
					lots: 12,
					shipments: 15,
					carrierOrders: 10,
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
		// The whole seed is one transaction and the development database is remote, so
		// the wall clock is round-trips, not work. The fulfillment scenarios roughly
		// tripled the statement count and pushed it past the previous 60s ceiling.
		{ maxWait: 30_000, timeout: 240_000 },
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
