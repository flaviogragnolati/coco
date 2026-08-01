import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	AdminOperationChangeSet,
	AdminOperationsEffectContext,
	AdminRollOverChangeSet,
} from "./operations-effects.types";

/**
 * Pure event builders for the operation-level facts: execution, compensation and
 * roll over resolution. Split out of their handlers for the same reason
 * `fulfillment-event-builders.ts` exists — every one of those modules reaches
 * `DomainEventPublisher`, which is `server-only` and therefore unreachable from a
 * test, while the payloads are exactly what has to be asserted against
 * `COMMAND_EVENT_TYPES`.
 *
 * Quantities arrive as strings: the callers own the `Prisma.Decimal` and this
 * module never converts one.
 */
function adminActor(ctx: AdminOperationsEffectContext) {
	return {
		source: "admin" as const,
		actorId: ctx.actor.id,
		actorReference: ctx.actor.name,
	};
}

/** One demand item as the execution included it, already stringified. */
export type ExecutionDemandItem = {
	sourceKey: string;
	sourceRollOverId?: number;
	cartItemId: number;
	cartId: number;
	cartCode: string;
	quantity: string;
};

export type ExecutionAllocation = {
	cartItemId: number;
	cartId: number;
	lotId: number;
	lotItemId: number;
	quantity: string;
};

export type ExecutionRollOver = {
	id: number;
	cartItemId: number;
	cartId: number;
	quantity: string;
};

/**
 * Everything `operation.execute` (and `rerun`, which runs the same execution)
 * publishes. The actor carries only `actorId`: execution has never recorded an
 * `actorReference`, and the outbox keys are already live.
 */
export function buildOperationExecutionEvents(input: {
	operationId: number;
	actor: AdminMutationActor;
	demandItems: ExecutionDemandItem[];
	allocations: ExecutionAllocation[];
	rollOvers: ExecutionRollOver[];
}): DomainEventInput[] {
	const actor = { source: "admin" as const, actorId: input.actor.id };

	return [
		...input.demandItems.map((demand) => ({
			type: "operation.cartItem.included" as const,
			eventKey: `operation:${input.operationId}:cartItem:${demand.cartItemId}:source:${demand.sourceKey}:included`,
			aggregateType: "CartItem" as const,
			aggregateId: String(demand.cartItemId),
			actor,
			payload: {
				operationId: String(input.operationId),
				cartItemId: String(demand.cartItemId),
				cartId: String(demand.cartId),
				quantity: demand.quantity,
				metadata: {
					sourceKey: demand.sourceKey,
					...(demand.sourceRollOverId === undefined
						? {}
						: { sourceRollOverId: String(demand.sourceRollOverId) }),
					cartCode: demand.cartCode,
				},
			},
		})),
		...input.allocations.map((allocation) => ({
			type: "operation.cartItem.allocatedToLotItem" as const,
			eventKey: `operation:${input.operationId}:cartItem:${allocation.cartItemId}:lotItem:${allocation.lotItemId}:allocated`,
			aggregateType: "CartItem" as const,
			aggregateId: String(allocation.cartItemId),
			actor,
			payload: {
				operationId: String(input.operationId),
				cartItemId: String(allocation.cartItemId),
				cartId: String(allocation.cartId),
				lotId: String(allocation.lotId),
				lotItemId: String(allocation.lotItemId),
				quantity: allocation.quantity,
			},
		})),
		...input.rollOvers.map((rollOver) => ({
			type: "rollover.preAllocation.created" as const,
			eventKey: `operation:${input.operationId}:cartItem:${rollOver.cartItemId}:rollover:${rollOver.id}:created`,
			aggregateType: "RollOver" as const,
			aggregateId: String(rollOver.id),
			actor,
			payload: {
				operationId: String(input.operationId),
				rolloverId: String(rollOver.id),
				cartItemId: String(rollOver.cartItemId),
				cartId: String(rollOver.cartId),
				quantity: rollOver.quantity,
			},
		})),
	];
}

/**
 * The compensation notice. An operation leaves `completed` only once, so
 * (operation, cart item) is a stable key — the status guard makes a second
 * compensation impossible.
 */
export function buildOperationCompensatedEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminOperationChangeSet,
): DomainEventInput[] {
	return changeSet.excludedCartItems.map((entry) => ({
		type: "operation.cartItem.excluded" as const,
		eventKey: `operation:${changeSet.operationId}:cartItem:${entry.cartItemId}:excluded`,
		aggregateType: "CartItem" as const,
		aggregateId: String(entry.cartItemId),
		actor: adminActor(ctx),
		payload: {
			operationId: String(changeSet.operationId),
			cartItemId: String(entry.cartItemId),
			cartId: String(entry.cartId),
			quantity: entry.quantity,
			reason: changeSet.reason,
			metadata: { operationCode: changeSet.operationCode },
		},
	}));
}

/** A roll over can only leave `open` once, so the id alone is a stable key. */
export function buildRollOverResolvedEvent(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminRollOverChangeSet,
): DomainEventInput {
	return {
		type: "rollover.resolved",
		eventKey: `rollover:${changeSet.rollOverId}:resolved`,
		aggregateType: "RollOver",
		aggregateId: String(changeSet.rollOverId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(changeSet.cartItemId),
			cartId: String(changeSet.cartId),
			operationId: String(changeSet.operationId),
			rolloverId: String(changeSet.rollOverId),
			quantity: changeSet.quantity,
			reason: changeSet.reason,
		},
	};
}
