import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import {
	buildExceptionEvents,
	buildExceptionResolvedEvents,
	buildMovementEvents,
	buildPickupArrivalEvents,
	buildRollOverEvents,
	buildShipmentPackagedEvents,
} from "./fulfillment-event-builders";
import type {
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
	AdminShipmentChangeSet,
	AdminShipmentEffectHandler,
} from "./operations-effects.types";

const HANDLER = "ShipmentEffects";

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

export class ShipmentEffects implements AdminShipmentEffectHandler {
	async onDispatchRegistered(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(
			ctx,
			"shipment.dispatchRegistered",
			buildShipmentPackagedEvents(ctx, changeSet),
		);
	}

	async onShipmentDispatched(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(
			ctx,
			"shipment.dispatched",
			buildMovementEvents(ctx, changeSet, "dispatched", "internal"),
		);
	}

	async onEndUserDispatched(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(
			ctx,
			"shipment.endUserDispatched",
			buildMovementEvents(ctx, changeSet, "dispatched", "endUser"),
		);
	}

	/** The home-delivery handover — the outbound counterpart of `onShipmentReceived`. */
	async onEndUserDelivered(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(ctx, "shipment.endUserDelivered", [
			...buildMovementEvents(ctx, changeSet, "received", "endUser"),
			...(changeSet.resolvesException
				? buildExceptionResolvedEvents(ctx, changeSet, "receipt")
				: []),
		]);
	}

	/**
	 * Arrival at a collection point, not a handover: no delivered event, because
	 * each customer still has to collect (`package.confirmDelivery`).
	 */
	async onPickupPointArrived(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(ctx, "shipment.pickupPointArrived", [
			...buildPickupArrivalEvents(ctx, changeSet),
			...(changeSet.resolvesException
				? buildExceptionResolvedEvents(ctx, changeSet, "receipt")
				: []),
		]);
	}

	async onShipmentReceived(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(ctx, "shipment.received", [
			...buildMovementEvents(ctx, changeSet, "received"),
			...buildRollOverEvents(ctx, changeSet),
			...(changeSet.resolvesException
				? buildExceptionResolvedEvents(ctx, changeSet, "receipt")
				: []),
		]);
	}

	async onShipmentDisrupted(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(
			ctx,
			"shipment.disrupted",
			buildExceptionEvents(ctx, changeSet),
		);
	}

	async onShipmentRetried(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return publishEvents(
			ctx,
			"shipment.retried",
			buildExceptionResolvedEvents(ctx, changeSet, "retry"),
		);
	}
}
