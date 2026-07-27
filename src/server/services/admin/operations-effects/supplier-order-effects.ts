import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
	AdminSupplierOrderChangeSet,
	AdminSupplierOrderEffectHandler,
} from "./operations-effects.types";

const HANDLER = "SupplierOrderEffects";

function completedSummary(
	action: string,
	eventKeys: string[],
): AdminOperationsEffectSummary[] {
	return [
		{
			handler: HANDLER,
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
	return [{ handler: HANDLER, action, status: "skipped", message }];
}

function adminActor(ctx: AdminOperationsEffectContext) {
	return {
		source: "admin" as const,
		actorId: ctx.actor.id,
		actorReference: ctx.actor.name,
	};
}

/**
 * Deterministic keys: the transition guards make each fact publishable at most
 * once per (order, line, cart item), so no timestamp component is needed. The
 * roll over key deliberately mirrors the pre-allocation shape `executeOperation`
 * uses — `rollOverId` is unique, so the two can never collide.
 */
function requestedKey(input: {
	supplierOrderId: number;
	lotItemId: number;
	cartItemId: number;
}) {
	return `supplier:order:${input.supplierOrderId}:lotItem:${input.lotItemId}:cartItem:${input.cartItemId}:requested`;
}

function confirmedKey(input: {
	supplierOrderId: number;
	lotItemId: number;
	cartItemId: number;
}) {
	return `supplier:order:${input.supplierOrderId}:lotItem:${input.lotItemId}:cartItem:${input.cartItemId}:confirmed`;
}

function rollOverKey(input: {
	operationId: number;
	cartItemId: number;
	rollOverId: number;
}) {
	return `operation:${input.operationId}:cartItem:${input.cartItemId}:rollover:${input.rollOverId}:created`;
}

function buildRequestedEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminSupplierOrderChangeSet,
): DomainEventInput[] {
	return (changeSet.requestedLines ?? []).flatMap((line) =>
		line.allocations.map((allocation) => ({
			type: "supplier.cartItem.requested" as const,
			eventKey: requestedKey({
				supplierOrderId: changeSet.supplierOrderId,
				lotItemId: line.lotItemId,
				cartItemId: allocation.cartItemId,
			}),
			aggregateType: "CartItem" as const,
			aggregateId: String(allocation.cartItemId),
			actor: adminActor(ctx),
			payload: {
				cartItemId: String(allocation.cartItemId),
				cartId: String(allocation.cartId),
				operationId: String(changeSet.operationId),
				lotId: String(line.lotId),
				lotItemId: String(line.lotItemId),
				quantity: allocation.quantity,
				metadata: {
					supplierOrderId: String(changeSet.supplierOrderId),
					supplierOrderCode: changeSet.supplierOrderCode,
				},
			},
		})),
	);
}

function buildConfirmedEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminSupplierOrderChangeSet,
): DomainEventInput[] {
	return (changeSet.confirmedLines ?? []).flatMap((line) =>
		line.allocations.map((allocation) => ({
			type: "supplier.lotItem.confirmed" as const,
			eventKey: confirmedKey({
				supplierOrderId: changeSet.supplierOrderId,
				lotItemId: line.lotItemId,
				cartItemId: allocation.cartItemId,
			}),
			aggregateType: "LotItem" as const,
			aggregateId: String(line.lotItemId),
			actor: adminActor(ctx),
			payload: {
				cartItemId: String(allocation.cartItemId),
				cartId: String(allocation.cartId),
				operationId: String(changeSet.operationId),
				lotId: String(line.lotId),
				lotItemId: String(line.lotItemId),
				quantity: allocation.quantity,
				metadata: {
					supplierOrderId: String(changeSet.supplierOrderId),
					supplierOrderCode: changeSet.supplierOrderCode,
				},
			},
		})),
	);
}

function buildRollOverEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminSupplierOrderChangeSet,
): DomainEventInput[] {
	return (changeSet.createdRollOvers ?? []).map((rollOver) => ({
		type: "rollover.postAllocation.created" as const,
		eventKey: rollOverKey({
			operationId: rollOver.operationId,
			cartItemId: rollOver.cartItemId,
			rollOverId: rollOver.rollOverId,
		}),
		aggregateType: "RollOver" as const,
		aggregateId: String(rollOver.rollOverId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(rollOver.cartItemId),
			cartId: String(rollOver.cartId),
			operationId: String(rollOver.operationId),
			rolloverId: String(rollOver.rollOverId),
			quantity: rollOver.quantity,
			metadata: {
				supplierOrderId: String(changeSet.supplierOrderId),
				supplierOrderCode: changeSet.supplierOrderCode,
				reason: rollOver.reason,
			},
		},
	}));
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

export class SupplierOrderEffects implements AdminSupplierOrderEffectHandler {
	async onSupplierOrderRequested(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return publishEvents(
			ctx,
			"supplierOrder.requested",
			buildRequestedEvents(ctx, changeSet),
		);
	}

	async onSupplierOrderConfirmed(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return publishEvents(ctx, "supplierOrder.confirmed", [
			...buildConfirmedEvents(ctx, changeSet),
			...buildRollOverEvents(ctx, changeSet),
		]);
	}

	async onSupplierOrderCancelled(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return publishEvents(
			ctx,
			"supplierOrder.cancelled",
			buildRollOverEvents(ctx, changeSet),
		);
	}

	async onSupplierOrderLineCancelled(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return publishEvents(
			ctx,
			"supplierOrder.lineCancelled",
			buildRollOverEvents(ctx, changeSet),
		);
	}
}
