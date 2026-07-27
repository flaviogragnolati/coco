import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	AdminOperationChangeSet,
	AdminOperationEffectHandler,
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
} from "./operations-effects.types";

const HANDLER = "OperationEffects";

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

export class OperationEffects implements AdminOperationEffectHandler {
	async onOperationCompensated(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationChangeSet,
	) {
		// An operation leaves `completed` only once, so (operation, cart item) is a
		// stable key — the status guard makes a second compensation impossible.
		const events: DomainEventInput[] = changeSet.excludedCartItems.map(
			(entry) => ({
				type: "operation.cartItem.excluded",
				eventKey: `operation:${changeSet.operationId}:cartItem:${entry.cartItemId}:excluded`,
				aggregateType: "CartItem",
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
			}),
		);

		if (events.length === 0) {
			return skippedSummary(
				"operation.compensated",
				"No domain events were needed.",
			);
		}

		await DomainEventPublisher.publishMany(ctx.db, events);
		return completedSummary(
			"operation.compensated",
			events.map((event) => event.eventKey),
		);
	}
}
