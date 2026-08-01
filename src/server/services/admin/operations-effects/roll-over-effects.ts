import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import { buildRollOverResolvedEvent } from "./operation-event-builders";
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

export class RollOverEffects implements AdminRollOverEffectHandler {
	async onRollOverResolved(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminRollOverChangeSet,
	) {
		const event = buildRollOverResolvedEvent(ctx, changeSet);

		await DomainEventPublisher.publishMany(ctx.db, [event]);
		return completedSummary("rollOver.resolved", [event.eventKey]);
	}
}
