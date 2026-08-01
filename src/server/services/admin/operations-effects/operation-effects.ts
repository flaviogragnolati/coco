import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import { buildOperationCompensatedEvents } from "./operation-event-builders";
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

export class OperationEffects implements AdminOperationEffectHandler {
	async onOperationCompensated(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationChangeSet,
	) {
		const events = buildOperationCompensatedEvents(ctx, changeSet);

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
