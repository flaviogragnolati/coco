import {
	operationsCartDetailSchema,
	operationsCartListOutputSchema,
	operationsCartStatsSchema,
} from "~/schemas/admin/operations-cart.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import type {
	OperationsCartDeleteInput,
	OperationsCartDetail,
	OperationsCartListInput,
	OperationsCartQuickStatusInput,
	OperationsCartStats,
	OperationsCartUpdateInput,
} from "~/shared/common/admin-crud/operations-cart.types";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createCartItem,
	findOperationCartById,
	findProductClientTermsForCartItem,
	getOperationCartRelationCounts,
	getOperationCartStats,
	hardDeleteCart,
	listOperationCarts,
	type OperationsCartRelationRecord,
	type OperationsProductClientTermsRecord,
	softDeleteCart,
	softDeleteCartItem,
	updateCartItemQuantity,
	updateCartStatus,
	updateUserOrderItemQuantitiesByCartItemId,
} from "./operations-cart.data";
import { AdminOperationsSideEffects } from "./operations-effects/operations-side-effects.service";

type AdminDb = typeof db;

const CART_ENTITY = "operations_cart";
const sideEffects = new AdminOperationsSideEffects();

function parseDetail(record: unknown): OperationsCartDetail {
	return operationsCartDetailSchema.parse(record);
}

function activeItems(cart: OperationsCartDetail) {
	return cart.cartItems.filter((item) => !item.deleted);
}

function assertUniqueExistingItemIds(input: OperationsCartUpdateInput) {
	const ids = input.items
		.map((item) => item.id)
		.filter((id): id is number => typeof id === "number");

	if (new Set(ids).size !== ids.length) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede enviar el mismo item de carrito mas de una vez",
		);
	}
}

function buildProductSnapshot(terms: OperationsProductClientTermsRecord) {
	return {
		source: "admin.operationsCart",
		capturedAt: new Date().toISOString(),
		productClientTerms: {
			id: terms.id,
			currency: terms.currency,
			moq: terms.moq.toString(),
			moqPrice: terms.moqPrice.toString(),
			step: terms.step?.toString() ?? null,
			stepPrice: terms.stepPrice?.toString() ?? null,
			max: terms.max?.toString() ?? null,
			refPrice: terms.refPrice?.toString() ?? null,
		},
		product: {
			id: terms.product.id,
			name: terms.product.name,
			unit: terms.product.unit,
			deleted: terms.product.deleted,
			brand: terms.product.brand
				? {
						id: terms.product.brand.id,
						name: terms.product.brand.name,
						deleted: terms.product.brand.deleted,
					}
				: null,
		},
	};
}

async function assertProductClientTermsCanBeUsed(
	productClientTermsId: number,
	database: Parameters<typeof findProductClientTermsForCartItem>[0],
) {
	const terms = await findProductClientTermsForCartItem(
		database,
		productClientTermsId,
	);

	if (!terms) {
		throw new AdminCrudError(
			"CONFLICT",
			"Los terminos de cliente seleccionados no existen",
		);
	}

	if (terms.deleted || !terms.active || terms.product.deleted) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede agregar un producto eliminado o con terminos inactivos",
		);
	}

	return terms;
}

function createCartItemCode(cartId: number) {
	return `CITEM-${cartId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function buildRelationBlockMessage(record: OperationsCartRelationRecord) {
	const orderCount = record.userOrders.length;
	const orderItemCount = record.userOrders.reduce(
		(total, order) => total + order._count.items,
		0,
	);
	const transactionCount = record.userOrders.reduce(
		(total, order) => total + order._count.transactions,
		0,
	);
	const linkedCartItemCount = record.cartItems.filter(
		(item) =>
			item._count.rollOvers > 0 ||
			item._count.cartItemLotItems > 0 ||
			item._count.trackingEvents > 0 ||
			item._count.userOrderItems > 0,
	).length;

	const blockingParts = [
		orderCount > 0 ? `${orderCount} ordenes` : null,
		orderItemCount > 0 ? `${orderItemCount} items de orden` : null,
		transactionCount > 0 ? `${transactionCount} pagos` : null,
		linkedCartItemCount > 0
			? `${linkedCartItemCount} items con trazabilidad operacional`
			: null,
	].filter(Boolean);

	return `No se puede eliminar definitivamente el carrito "${record.code}" porque tiene ${blockingParts.join(", ")} relacionados.`;
}

function hasHardDeleteBlockers(record: OperationsCartRelationRecord) {
	return (
		record.userOrders.length > 0 ||
		record.cartItems.some(
			(item) =>
				item._count.rollOvers > 0 ||
				item._count.cartItemLotItems > 0 ||
				item._count.trackingEvents > 0 ||
				item._count.userOrderItems > 0,
		)
	);
}

async function reconcileCartItems(
	cart: OperationsCartDetail,
	input: OperationsCartUpdateInput,
	database: Parameters<typeof updateCartItemQuantity>[0],
) {
	const existingItems = new Map(
		activeItems(cart).map((item) => [item.id, item]),
	);
	const submittedExistingIds = new Set<number>();
	const changedItemIds: number[] = [];
	const addedItemIds: number[] = [];
	const removedItemIds: number[] = [];

	for (const item of input.items) {
		if (item.id !== undefined) {
			const currentItem = existingItems.get(item.id);
			if (!currentItem) {
				throw new AdminCrudError(
					"CONFLICT",
					"No se puede actualizar un item que no pertenece al carrito",
				);
			}

			if (currentItem.productClientTerms.id !== item.productClientTermsId) {
				throw new AdminCrudError(
					"CONFLICT",
					"Para cambiar el producto de un item, removelo y agregalo nuevamente",
				);
			}

			submittedExistingIds.add(item.id);

			if (currentItem.quantity !== item.quantity) {
				await updateCartItemQuantity(database, item.id, item.quantity);
				await updateUserOrderItemQuantitiesByCartItemId(
					database,
					item.id,
					item.quantity,
				);
				changedItemIds.push(item.id);
			}

			continue;
		}

		const terms = await assertProductClientTermsCanBeUsed(
			item.productClientTermsId,
			database,
		);
		const created = await createCartItem(database, {
			cartId: cart.id,
			code: createCartItemCode(cart.id),
			item,
			productSnapshot: buildProductSnapshot(terms),
		});
		addedItemIds.push(created.id);
	}

	for (const item of activeItems(cart)) {
		if (submittedExistingIds.has(item.id)) continue;

		const hasOperationalLinks =
			item.operationalLinkCount > 0 || item.orderItemCount > 0;
		await softDeleteCartItem(database, item.id, hasOperationalLinks);
		removedItemIds.push(item.id);
	}

	return { changedItemIds, addedItemIds, removedItemIds };
}

export async function list(input: OperationsCartListInput, database: AdminDb) {
	const records = await listOperationCarts(database, input);
	return operationsCartListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const cart = await findOperationCartById(database, id);
	if (!cart) throwNotFound("Carrito");
	return parseDetail(cart);
}

export async function getStats(
	database: AdminDb,
): Promise<OperationsCartStats> {
	return operationsCartStatsSchema.parse(await getOperationCartStats(database));
}

export async function update(
	input: OperationsCartUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	assertUniqueExistingItemIds(input);

	const result = await database.$transaction(async (tx) => {
		const beforeRecord = await findOperationCartById(tx, input.id);
		if (!beforeRecord) throwNotFound("Carrito");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar un carrito eliminado",
			);
		}

		if (before.status !== input.status) {
			await updateCartStatus(tx, input.id, input.status);
		}

		const itemChanges = await reconcileCartItems(before, input, tx);
		const afterRecord = await findOperationCartById(tx, input.id);
		if (!afterRecord) throwNotFound("Carrito");
		const after = parseDetail(afterRecord);

		const changeSet = {
			cartId: after.id,
			before,
			after,
			...itemChanges,
		};

		const effects = [
			...(await sideEffects.onCartUpdated(
				{ db: tx, actor, source: "cart" },
				changeSet,
			)),
			...(before.status !== after.status
				? await sideEffects.onCartStatusChanged(
						{ db: tx, actor, source: "cart" },
						changeSet,
					)
				: []),
			...(itemChanges.changedItemIds.length > 0 ||
			itemChanges.addedItemIds.length > 0 ||
			itemChanges.removedItemIds.length > 0
				? await sideEffects.onCartItemsChanged(
						{ db: tx, actor, source: "cartItem" },
						changeSet,
					)
				: []),
		];

		await writeAdminAuditLog(tx, {
			action: "operationsCart.update",
			actor,
			entityType: CART_ENTITY,
			entityId: String(after.id),
			before,
			after,
			metadata: { effects },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

export async function quickUpdateStatus(
	input: OperationsCartQuickStatusInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	const result = await database.$transaction(async (tx) => {
		const beforeRecord = await findOperationCartById(tx, input.id);
		if (!beforeRecord) throwNotFound("Carrito");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede cambiar el estado de un carrito eliminado",
			);
		}

		await updateCartStatus(tx, input.id, input.status);

		const afterRecord = await findOperationCartById(tx, input.id);
		if (!afterRecord) throwNotFound("Carrito");
		const after = parseDetail(afterRecord);
		const changeSet = { cartId: after.id, before, after };
		const effects = await sideEffects.onCartStatusChanged(
			{ db: tx, actor, source: "cart" },
			changeSet,
		);

		await writeAdminAuditLog(tx, {
			action: "operationsCart.quickStatusUpdate",
			actor,
			entityType: CART_ENTITY,
			entityId: String(after.id),
			before,
			after,
			metadata: { effects },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

export async function softDelete(
	input: OperationsCartDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	const result = await database.$transaction(async (tx) => {
		const beforeRecord = await findOperationCartById(tx, input.id);
		if (!beforeRecord) throwNotFound("Carrito");
		const before = parseDetail(beforeRecord);

		const after = parseDetail(await softDeleteCart(tx, input.id));
		const changeSet = { cartId: after.id, before, after };
		const effects = await sideEffects.onCartDeleted(
			{ db: tx, actor, source: "cart" },
			changeSet,
		);

		await writeAdminAuditLog(tx, {
			action: "operationsCart.softDelete",
			actor,
			entityType: CART_ENTITY,
			entityId: String(after.id),
			before,
			after,
			metadata: { effects },
		});

		return { id: after.id };
	});

	await DomainEventDispatcher.wake();
	return result;
}

export async function hardDelete(
	input: OperationsCartDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	const result = await database.$transaction(async (tx) => {
		const relationRecord = await getOperationCartRelationCounts(tx, input.id);
		if (!relationRecord) throwNotFound("Carrito");

		if (hasHardDeleteBlockers(relationRecord)) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(relationRecord),
			);
		}

		const beforeRecord = await findOperationCartById(tx, input.id);
		if (!beforeRecord) throwNotFound("Carrito");
		const before = parseDetail(beforeRecord);
		const changeSet = { cartId: before.id, before, after: null };
		const effects = await sideEffects.onCartDeleted(
			{ db: tx, actor, source: "cart" },
			changeSet,
		);

		const deleted = await hardDeleteCart(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "operationsCart.hardDelete",
			actor,
			entityType: CART_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true, effects },
		});

		return { id: deleted.id };
	});

	await DomainEventDispatcher.wake();
	return result;
}
