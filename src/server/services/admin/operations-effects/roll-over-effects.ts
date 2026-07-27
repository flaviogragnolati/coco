import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
	AdminRollOverChangeSet,
	AdminRollOverEffectHandler,
} from "./operations-effects.types";

const HANDLER = "RollOverEffects";

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

function adminActor(ctx: AdminOperationsEffectContext) {
	return {
		source: "admin" as const,
		actorId: ctx.actor.id,
		actorReference: ctx.actor.name,
	};
}

export class RollOverEffects implements AdminRollOverEffectHandler {
	async onRollOverResolved(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminRollOverChangeSet,
	) {
		// A roll over can only leave `open` once, so the id alone is a stable key.
		const event: DomainEventInput = {
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

		await DomainEventPublisher.publishMany(ctx.db, [event]);
		return completedSummary("rollOver.resolved", [event.eventKey]);
	}
}
