import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
	AdminSupplierOrderChangeSet,
	AdminSupplierOrderEffectHandler,
} from "./operations-effects.types";
import {
	buildConfirmedEvents,
	buildRequestedEvents,
	buildSupplierOrderRollOverEvents,
} from "./supplier-order-event-builders";

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
			...buildSupplierOrderRollOverEvents(ctx, changeSet),
		]);
	}

	async onSupplierOrderCancelled(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return publishEvents(
			ctx,
			"supplierOrder.cancelled",
			buildSupplierOrderRollOverEvents(ctx, changeSet),
		);
	}

	async onSupplierOrderLineCancelled(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return publishEvents(
			ctx,
			"supplierOrder.lineCancelled",
			buildSupplierOrderRollOverEvents(ctx, changeSet),
		);
	}
}
