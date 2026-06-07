import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { OperationsCartDetail } from "~/shared/common/admin-crud/operations-cart.types";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	AdminOperationsCartChangeSet,
	AdminOperationsCartEffectHandler,
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
} from "./operations-effects.types";

type CartItemDetail = OperationsCartDetail["cartItems"][number];

function completedSummary(
	action: string,
	eventKeys: string[],
): AdminOperationsEffectSummary[] {
	return [
		{
			handler: "CartOperationEffects",
			action,
			status: "completed",
			message: `${eventKeys.length} domain events published.`,
		},
	];
}

function skippedSummary(
	action: string,
	message: string,
): AdminOperationsEffectSummary[] {
	return [
		{
			handler: "CartOperationEffects",
			action,
			status: "skipped",
			message,
		},
	];
}

function itemMap(cart: OperationsCartDetail) {
	return new Map(cart.cartItems.map((item) => [item.id, item]));
}

function orderIdForCartItem(cart: OperationsCartDetail, cartItemId: number) {
	const order = cart.userOrders.find((userOrder) =>
		userOrder.items.some((item) => item.sourceCartItemId === cartItemId),
	);

	return order?.id;
}

function adminActor(ctx: AdminOperationsEffectContext) {
	return {
		source: "admin" as const,
		actorId: ctx.actor.id,
		actorReference: ctx.actor.name,
	};
}

function itemEventKey(input: {
	cartId: number;
	cartItemId: number;
	action: string;
	occurredAt: Date;
}) {
	return `admin:cart:${input.cartId}:cartItem:${input.cartItemId}:${input.action}:${input.occurredAt.toISOString()}`;
}

function buildAddedEvent(
	ctx: AdminOperationsEffectContext,
	cartId: number,
	item: CartItemDetail,
): DomainEventInput {
	return {
		type: "admin.cartItem.added",
		eventKey: itemEventKey({
			cartId,
			cartItemId: item.id,
			action: "added",
			occurredAt: item.createdAt,
		}),
		aggregateType: "CartItem",
		aggregateId: String(item.id),
		actor: adminActor(ctx),
		payload: {
			cartId: String(cartId),
			cartItemId: String(item.id),
			quantity: item.quantity,
			reason: "admin.operationsCart.update",
		},
	};
}

function buildQuantityChangedEvent(
	ctx: AdminOperationsEffectContext,
	cartId: number,
	beforeItem: CartItemDetail,
	afterItem: CartItemDetail,
): DomainEventInput {
	return {
		type: "admin.cartItem.quantityChanged",
		eventKey: itemEventKey({
			cartId,
			cartItemId: afterItem.id,
			action: "quantityChanged",
			occurredAt: afterItem.updatedAt,
		}),
		aggregateType: "CartItem",
		aggregateId: String(afterItem.id),
		actor: adminActor(ctx),
		payload: {
			cartId: String(cartId),
			cartItemId: String(afterItem.id),
			previousQuantity: beforeItem.quantity,
			newQuantity: afterItem.quantity,
			reason: "admin.operationsCart.update",
		},
	};
}

function buildRemovedOrCancelledEvent(
	ctx: AdminOperationsEffectContext,
	cartId: number,
	beforeCart: OperationsCartDetail,
	beforeItem: CartItemDetail,
	afterItem: CartItemDetail | undefined,
	action: "removed" | "cancelled",
	reason: string,
): DomainEventInput {
	const occurredAt = afterItem?.updatedAt ?? beforeItem.updatedAt;
	const orderId = orderIdForCartItem(beforeCart, beforeItem.id);

	if (action === "cancelled") {
		return {
			type: "admin.cartItem.cancelled",
			eventKey: itemEventKey({
				cartId,
				cartItemId: beforeItem.id,
				action,
				occurredAt,
			}),
			aggregateType: "CartItem",
			aggregateId: String(beforeItem.id),
			actor: adminActor(ctx),
			payload: {
				cartId: String(cartId),
				cartItemId: String(beforeItem.id),
				orderId: orderId === undefined ? undefined : String(orderId),
				reason,
			},
		};
	}

	return {
		type: "admin.cartItem.removed",
		eventKey: itemEventKey({
			cartId,
			cartItemId: beforeItem.id,
			action,
			occurredAt,
		}),
		aggregateType: "CartItem",
		aggregateId: String(beforeItem.id),
		actor: adminActor(ctx),
		payload: {
			cartId: String(cartId),
			cartItemId: String(beforeItem.id),
			previousQuantity: beforeItem.quantity,
			reason,
		},
	};
}

async function publishEvents(
	ctx: AdminOperationsEffectContext,
	action: string,
	events: DomainEventInput[],
) {
	if (events.length === 0) {
		return skippedSummary(action, "No domain events were needed.");
	}

	await DomainEventPublisher.publishMany(ctx.db, events);
	return completedSummary(
		action,
		events.map((event) => event.eventKey),
	);
}

export class CartOperationEffects implements AdminOperationsCartEffectHandler {
	private skipped(action: string): AdminOperationsEffectSummary[] {
		return skippedSummary(action, "No tracking domain events were needed.");
	}

	async onCartUpdated(
		_ctx: AdminOperationsEffectContext,
		_changeSet: AdminOperationsCartChangeSet,
	) {
		return this.skipped("cart.updated");
	}

	async onCartStatusChanged(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) {
		if (!changeSet.after) return this.skipped("cart.statusChanged");
		if (
			changeSet.after.status !== "cancelled" &&
			changeSet.after.status !== "aborted"
		) {
			return this.skipped("cart.statusChanged");
		}

		const afterItems = itemMap(changeSet.after);
		const removedItemIds = new Set(changeSet.removedItemIds ?? []);
		const events = changeSet.before.cartItems
			.filter((item) => !item.deleted && !removedItemIds.has(item.id))
			.map((item) =>
				buildRemovedOrCancelledEvent(
					ctx,
					changeSet.cartId,
					changeSet.before,
					item,
					afterItems.get(item.id),
					"cancelled",
					`admin.operationsCart.${changeSet.after?.status}`,
				),
			);

		return publishEvents(ctx, "cart.statusChanged", events);
	}

	async onCartItemsChanged(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) {
		if (!changeSet.after) return this.skipped("cart.itemsChanged");

		const beforeItems = itemMap(changeSet.before);
		const afterItems = itemMap(changeSet.after);
		const events: DomainEventInput[] = [];

		for (const itemId of changeSet.addedItemIds ?? []) {
			const afterItem = afterItems.get(itemId);
			if (afterItem)
				events.push(buildAddedEvent(ctx, changeSet.cartId, afterItem));
		}

		for (const itemId of changeSet.changedItemIds ?? []) {
			const beforeItem = beforeItems.get(itemId);
			const afterItem = afterItems.get(itemId);
			if (beforeItem && afterItem) {
				events.push(
					buildQuantityChangedEvent(
						ctx,
						changeSet.cartId,
						beforeItem,
						afterItem,
					),
				);
			}
		}

		for (const itemId of changeSet.removedItemIds ?? []) {
			const beforeItem = beforeItems.get(itemId);
			if (!beforeItem) continue;

			const afterItem = afterItems.get(itemId);
			const hasOperationalLinks =
				beforeItem.operationalLinkCount > 0 || beforeItem.orderItemCount > 0;
			events.push(
				buildRemovedOrCancelledEvent(
					ctx,
					changeSet.cartId,
					changeSet.before,
					beforeItem,
					afterItem,
					hasOperationalLinks ? "cancelled" : "removed",
					"admin.operationsCart.update",
				),
			);
		}

		return publishEvents(ctx, "cart.itemsChanged", events);
	}

	async onCartDeleted(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) {
		if (!changeSet.after) return this.skipped("cart.deleted");

		const afterItems = itemMap(changeSet.after);
		const events = changeSet.before.cartItems
			.filter((item) => !item.deleted)
			.map((item) => {
				const hasOperationalLinks =
					item.operationalLinkCount > 0 || item.orderItemCount > 0;

				return buildRemovedOrCancelledEvent(
					ctx,
					changeSet.cartId,
					changeSet.before,
					item,
					afterItems.get(item.id),
					hasOperationalLinks ? "cancelled" : "removed",
					"admin.operationsCart.softDelete",
				);
			});

		return publishEvents(ctx, "cart.deleted", events);
	}
}
