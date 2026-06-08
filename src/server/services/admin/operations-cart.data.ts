import { Prisma } from "~/prisma/client";
import type {
	OperationsCartItemInput,
	OperationsCartListInput,
	OperationsCartStatus,
} from "~/shared/common/admin-crud/operations-cart.types";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

const decimalZero = () => new Prisma.Decimal(0);

function sumDecimal(values: Array<Prisma.Decimal | number | string | null>) {
	return values.reduce<Prisma.Decimal>((total, value) => {
		if (value === null) return total;
		return total.plus(new Prisma.Decimal(value));
	}, decimalZero());
}

const operationsUserSummarySelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const operationsProductClientTermsSelect = {
	id: true,
	currency: true,
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	refPrice: true,
	active: true,
	deleted: true,
	product: {
		select: {
			id: true,
			name: true,
			unit: true,
			deleted: true,
			brand: {
				select: {
					id: true,
					name: true,
					deleted: true,
				},
			},
		},
	},
} satisfies Prisma.ProductClientTermsSelect;

const operationsCartItemDetailSelect = {
	id: true,
	code: true,
	quantity: true,
	status: true,
	fulfillmentStatus: true,
	deleted: true,
	productSnapshot: true,
	createdAt: true,
	updatedAt: true,
	productClientTerms: {
		select: operationsProductClientTermsSelect,
	},
	_count: {
		select: {
			rollOvers: true,
			cartItemLotItems: true,
			trackingEvents: true,
			userOrderItems: true,
		},
	},
} satisfies Prisma.CartItemSelect;

const operationsCartDetailSelect = {
	id: true,
	code: true,
	status: true,
	deleted: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: operationsUserSummarySelect,
	},
	cartItems: {
		orderBy: [{ deleted: "asc" }, { createdAt: "asc" }, { id: "asc" }],
		select: operationsCartItemDetailSelect,
	},
	userOrders: {
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			status: true,
			billingAddressSnapshot: true,
			shippingAddressSnapshot: true,
			createdAt: true,
			updatedAt: true,
			items: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					sourceCartItemId: true,
					quantity: true,
					productSnapshot: true,
					priceSnapshot: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			transactions: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					amount: true,
					currency: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					paymentMethod: {
						select: {
							id: true,
							type: true,
							details: true,
						},
					},
				},
			},
		},
	},
} satisfies Prisma.CartSelect;

export const operationsCartListSelect = {
	id: true,
	code: true,
	status: true,
	deleted: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: operationsUserSummarySelect,
	},
	cartItems: {
		where: { deleted: false },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			quantity: true,
			productClientTerms: {
				select: operationsProductClientTermsSelect,
			},
		},
	},
	userOrders: {
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			status: true,
			transactions: {
				select: {
					id: true,
					amount: true,
					currency: true,
					status: true,
				},
			},
		},
	},
} satisfies Prisma.CartSelect;

const operationsCartRelationSelect = {
	id: true,
	code: true,
	userOrders: {
		select: {
			id: true,
			_count: {
				select: {
					items: true,
					transactions: true,
				},
			},
		},
	},
	cartItems: {
		select: {
			id: true,
			_count: {
				select: {
					rollOvers: true,
					cartItemLotItems: true,
					trackingEvents: true,
					userOrderItems: true,
				},
			},
		},
	},
} satisfies Prisma.CartSelect;

export type OperationsCartDetailRecord = Prisma.CartGetPayload<{
	select: typeof operationsCartDetailSelect;
}>;

export type OperationsCartRelationRecord = Prisma.CartGetPayload<{
	select: typeof operationsCartRelationSelect;
}>;

export type OperationsProductClientTermsRecord =
	Prisma.ProductClientTermsGetPayload<{
		select: typeof operationsProductClientTermsSelect;
	}>;

type OperationsCartListRecordRaw = Prisma.CartGetPayload<{
	select: typeof operationsCartListSelect;
}>;

function buildCartItemWhere(input: OperationsCartListInput) {
	const where: Prisma.CartItemWhereInput = { deleted: false };
	let hasFilters = false;

	if (input.productClientTermsId !== undefined) {
		where.productClientTermsId = input.productClientTermsId;
		hasFilters = true;
	}

	if (input.productId !== undefined) {
		where.productClientTerms = { productId: input.productId };
		hasFilters = true;
	}

	if (input.cartItemStatus !== undefined) {
		where.status = input.cartItemStatus;
		hasFilters = true;
	}

	if (input.fulfillmentStatus !== undefined) {
		where.fulfillmentStatus = input.fulfillmentStatus;
		hasFilters = true;
	}

	return hasFilters ? where : null;
}

function buildCartWhere(input: OperationsCartListInput): Prisma.CartWhereInput {
	const and: Prisma.CartWhereInput[] = [];

	if (!input.includeDeleted) and.push({ deleted: false });
	if (input.userId !== undefined) and.push({ userId: input.userId });
	if (input.cartStatus !== undefined) and.push({ status: input.cartStatus });
	if (input.orderStatus !== undefined) {
		and.push({ userOrders: { some: { status: input.orderStatus } } });
	}
	if (input.paymentStatus !== undefined) {
		and.push({
			userOrders: {
				some: { transactions: { some: { status: input.paymentStatus } } },
			},
		});
	}

	const cartItemWhere = buildCartItemWhere(input);
	if (cartItemWhere) and.push({ cartItems: { some: cartItemWhere } });

	if (input.search !== undefined) {
		and.push({
			OR: [
				{ code: { contains: input.search } },
				{ user: { name: { contains: input.search } } },
				{ user: { email: { contains: input.search } } },
				{
					cartItems: {
						some: {
							deleted: false,
							productClientTerms: {
								product: { name: { contains: input.search } },
							},
						},
					},
				},
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

function summarizePayments(
	userOrders: OperationsCartListRecordRaw["userOrders"],
) {
	const transactions = userOrders.flatMap((order) => order.transactions);
	const currencies = Array.from(
		new Set(transactions.map((transaction) => transaction.currency)),
	).sort();

	return {
		transactionCount: transactions.length,
		pendingAmount: sumDecimal(
			transactions
				.filter((transaction) => transaction.status === "pending")
				.map((transaction) => transaction.amount),
		).toString(),
		completedAmount: sumDecimal(
			transactions
				.filter((transaction) => transaction.status === "completed")
				.map((transaction) => transaction.amount),
		).toString(),
		failedAmount: sumDecimal(
			transactions
				.filter((transaction) => transaction.status === "failed")
				.map((transaction) => transaction.amount),
		).toString(),
		refundedAmount: sumDecimal(
			transactions
				.filter((transaction) => transaction.status === "refunded")
				.map((transaction) => transaction.amount),
		).toString(),
		currencies,
	};
}

function summarizeProducts(
	cartItems: OperationsCartListRecordRaw["cartItems"],
) {
	const grouped = new Map<
		number,
		{
			productId: number;
			name: string;
			unit: OperationsCartListRecordRaw["cartItems"][number]["productClientTerms"]["product"]["unit"];
			quantity: Prisma.Decimal;
			itemCount: number;
			deleted: boolean;
		}
	>();

	for (const item of cartItems) {
		const product = item.productClientTerms.product;
		const current = grouped.get(product.id);

		if (!current) {
			grouped.set(product.id, {
				productId: product.id,
				name: product.name,
				unit: product.unit,
				quantity: new Prisma.Decimal(item.quantity),
				itemCount: 1,
				deleted: product.deleted,
			});
			continue;
		}

		current.quantity = current.quantity.plus(item.quantity);
		current.itemCount += 1;
	}

	return Array.from(grouped.values()).map((product) => ({
		...product,
		quantity: product.quantity.toString(),
	}));
}

function toListItem(record: OperationsCartListRecordRaw) {
	return {
		id: record.id,
		code: record.code,
		status: record.status,
		deleted: record.deleted,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		user: record.user,
		itemCount: record.cartItems.length,
		totalQuantity: sumDecimal(
			record.cartItems.map((item) => item.quantity),
		).toString(),
		products: summarizeProducts(record.cartItems),
		orderCount: record.userOrders.length,
		latestOrderStatus: record.userOrders[0]?.status ?? null,
		paymentSummary: summarizePayments(record.userOrders),
	};
}

function toDetail(record: OperationsCartDetailRecord) {
	return {
		...record,
		cartItems: record.cartItems.map(({ _count, ...item }) => ({
			...item,
			operationalLinkCount:
				_count.rollOvers + _count.cartItemLotItems + _count.trackingEvents,
			orderItemCount: _count.userOrderItems,
		})),
	};
}

export async function listOperationCarts(
	db: AdminDbClient,
	input: OperationsCartListInput,
) {
	const records = await db.cart.findMany({
		where: buildCartWhere(input),
		select: operationsCartListSelect,
		orderBy: [{ deleted: "asc" }, { updatedAt: "desc" }, { id: "desc" }],
	});

	return records.map(toListItem);
}

export async function findOperationCartById(db: AdminDbClient, id: number) {
	const record = await db.cart.findUnique({
		where: { id },
		select: operationsCartDetailSelect,
	});

	return record ? toDetail(record) : null;
}

export async function getOperationCartStats(db: AdminDbClient) {
	const [total, deleted, open, submitted, withOrders, withPayments] =
		await Promise.all([
			db.cart.count(),
			db.cart.count({ where: { deleted: true } }),
			db.cart.count({
				where: {
					deleted: false,
					status: { in: ["draft", "pending", "atCheckout"] },
				},
			}),
			db.cart.count({ where: { deleted: false, status: "submitted" } }),
			db.cart.count({
				where: { deleted: false, userOrders: { some: {} } },
			}),
			db.cart.count({
				where: {
					deleted: false,
					userOrders: { some: { transactions: { some: {} } } },
				},
			}),
		]);

	return { total, deleted, open, submitted, withOrders, withPayments };
}

export async function updateCartStatus(
	db: AdminDbClient,
	id: number,
	status: OperationsCartStatus,
) {
	const record = await db.cart.update({
		where: { id },
		data: { status },
		select: operationsCartDetailSelect,
	});

	return toDetail(record);
}

export async function updateCartItemQuantity(
	db: AdminDbClient,
	id: number,
	quantity: string,
) {
	return db.cartItem.update({
		where: { id },
		data: { quantity },
		select: operationsCartItemDetailSelect,
	});
}

export async function updateUserOrderItemQuantitiesByCartItemId(
	db: AdminDbClient,
	cartItemId: number,
	quantity: string,
) {
	await db.userOrderItem.updateMany({
		where: { sourceCartItemId: cartItemId },
		data: { quantity },
	});
}

export async function createCartItem(
	db: AdminDbClient,
	input: {
		cartId: number;
		code: string;
		item: OperationsCartItemInput;
		productSnapshot: unknown;
	},
) {
	return db.cartItem.create({
		data: {
			cartId: input.cartId,
			code: input.code,
			quantity: input.item.quantity,
			status: "inCart",
			fulfillmentStatus: "awaitingAggregation",
			deleted: false,
			productClientTermsId: input.item.productClientTermsId,
			productSnapshot: toPrismaInputJson(input.productSnapshot),
		},
		select: operationsCartItemDetailSelect,
	});
}

export async function softDeleteCartItem(
	db: AdminDbClient,
	id: number,
	hasOperationalLinks: boolean,
) {
	return db.cartItem.update({
		where: { id },
		data: {
			deleted: true,
			status: hasOperationalLinks ? "cancelled" : "dropped",
			fulfillmentStatus: hasOperationalLinks ? "cancelled" : undefined,
		},
		select: operationsCartItemDetailSelect,
	});
}

export async function softDeleteCart(db: AdminDbClient, id: number) {
	const record = await db.cart.update({
		where: { id },
		data: { deleted: true },
		select: operationsCartDetailSelect,
	});

	return toDetail(record);
}

export async function hardDeleteCart(db: AdminDbClient, id: number) {
	await db.cartItem.deleteMany({ where: { cartId: id } });

	return db.cart.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getOperationCartRelationCounts(
	db: AdminDbClient,
	id: number,
) {
	return db.cart.findUnique({
		where: { id },
		select: operationsCartRelationSelect,
	});
}

export async function findProductClientTermsForCartItem(
	db: AdminDbClient,
	id: number,
) {
	return db.productClientTerms.findUnique({
		where: { id },
		select: operationsProductClientTermsSelect,
	});
}
