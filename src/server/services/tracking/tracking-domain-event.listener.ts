import "server-only";

import { db } from "~/server/db";
import type {
	DomainEventListener,
	ParsedPersistedDomainEvent,
} from "~/server/events/domain-event.types";
import { AuditLogService } from "~/server/services/audit/audit-log.service";
import { appLogger } from "~/server/services/logging/app-logger.service";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import { TrackingEventService } from "./tracking-event.service";
import { mapDomainEventToTrackingCommands } from "./tracking-event-mapper";

const supportedEventTypes = new Set<DomainEventInput["type"]>([
	"cart.item.submittedToOrder",
	"admin.cartItem.added",
	"admin.cartItem.quantityChanged",
	"admin.cartItem.removed",
	"admin.cartItem.cancelled",
	"fulfillment.exception.created",
	"fulfillment.exception.resolved",
	"operation.cartItem.included",
	"operation.cartItem.allocatedToLotItem",
	"supplier.lotItem.confirmed",
	"package.cartItem.packaged",
	"shipment.internal.dispatched",
	"shipment.internal.received",
	"shipment.endUser.dispatched",
	"shipment.endUser.delivered",
	"rollover.preAllocation.created",
	"rollover.postAllocation.created",
]);

export class TrackingDomainEventListener implements DomainEventListener {
	name = "TrackingDomainEventListener";

	supports(event: DomainEventInput): boolean {
		return supportedEventTypes.has(event.type);
	}

	async handle(event: ParsedPersistedDomainEvent): Promise<void> {
		const commands = mapDomainEventToTrackingCommands(event.domainEvent);
		if (commands.length === 0) return;

		await db.$transaction(async (tx) => {
			const trackingEvents = await TrackingEventService.recordManyFromCommands(
				tx,
				commands,
			);

			await AuditLogService.write(tx, {
				action: "tracking.domainEventHandled",
				actor: event.domainEvent.actor,
				source: event.domainEvent.actor?.source ?? "system",
				entityType: event.aggregateType,
				entityId: event.aggregateId,
				metadata: {
					domainEventIds: [event.id],
					trackingEventIds: trackingEvents.map(
						(trackingEvent) => trackingEvent.id,
					),
					eventKeys: [
						event.eventKey,
						...trackingEvents
							.map((trackingEvent) => trackingEvent.eventKey)
							.filter((eventKey): eventKey is string => eventKey !== null),
					],
					listenerName: this.name,
				},
			});
		});

		appLogger.info("trackingDomainEventHandled", {
			domainEventId: event.id,
			domainEventKey: event.eventKey,
			domainEventType: event.eventType,
			commandCount: commands.length,
		});
	}
}
