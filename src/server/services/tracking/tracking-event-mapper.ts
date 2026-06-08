import "server-only";

import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	CartItemTrackingEventType,
	TrackingEventSource,
} from "../~/prisma/client";

export type TrackingCommand = {
	eventKey: string;
	cartItemId: string;
	eventType: CartItemTrackingEventType;
	quantity?: string;
	source: Exclude<TrackingEventSource, "external_api">;
	actorId?: string;
	actorReference?: string;
	refs?: {
		operationId?: string;
		lotId?: string;
		lotItemId?: string;
		packageId?: string;
		shipmentId?: string;
		rolloverId?: string;
		orderId?: string;
		userOrderItemId?: string;
		transactionId?: string;
	};
	metadata?: Record<string, unknown>;
};

function defaultSourceForEvent(
	event: DomainEventInput,
): TrackingCommand["source"] {
	if (event.actor?.source) return event.actor.source;
	if (event.type.startsWith("admin.")) return "admin";
	if (event.type.startsWith("supplier.")) return "supplier";
	if (event.type.startsWith("shipment.")) return "carrier";
	if (event.type.startsWith("cart.item.")) return "user";
	return "system";
}

function commandBase(
	event: DomainEventInput,
	eventType: CartItemTrackingEventType,
	cartItemId: string,
): Pick<
	TrackingCommand,
	| "eventKey"
	| "eventType"
	| "cartItemId"
	| "source"
	| "actorId"
	| "actorReference"
> {
	return {
		eventKey: `tracking:${event.eventKey}:${eventType}`,
		eventType,
		cartItemId,
		source: defaultSourceForEvent(event),
		actorId: event.actor?.actorId,
		actorReference: event.actor?.actorReference,
	};
}

function metadataWithDomainEvent(
	event: DomainEventInput,
	metadata: Record<string, unknown> = {},
) {
	return {
		...metadata,
		domainEventKey: event.eventKey,
		domainEventType: event.type,
	};
}

export function mapDomainEventToTrackingCommands(
	event: DomainEventInput,
): TrackingCommand[] {
	switch (event.type) {
		case "cart.item.submittedToOrder":
			return [
				{
					...commandBase(event, "submittedToOrder", event.payload.cartItemId),
					quantity: event.payload.quantity,
					refs: {
						orderId: event.payload.orderId,
						userOrderItemId: event.payload.userOrderItemId,
						transactionId: event.payload.transactionId,
					},
					metadata: metadataWithDomainEvent(event, {
						cartId: event.payload.cartId,
					}),
				},
			];

		case "admin.cartItem.added":
			return [
				{
					...commandBase(event, "addedToCart", event.payload.cartItemId),
					quantity: event.payload.quantity,
					metadata: metadataWithDomainEvent(event, {
						cartId: event.payload.cartId,
						reason: event.payload.reason,
					}),
				},
			];

		case "admin.cartItem.quantityChanged":
			return [
				{
					...commandBase(
						event,
						"cartItemQuantityChanged",
						event.payload.cartItemId,
					),
					quantity: event.payload.newQuantity,
					metadata: metadataWithDomainEvent(event, {
						cartId: event.payload.cartId,
						previousQuantity: event.payload.previousQuantity,
						newQuantity: event.payload.newQuantity,
						reason: event.payload.reason,
					}),
				},
			];

		case "admin.cartItem.removed":
			return [
				{
					...commandBase(event, "cartItemRemoved", event.payload.cartItemId),
					quantity: event.payload.previousQuantity,
					metadata: metadataWithDomainEvent(event, {
						cartId: event.payload.cartId,
						reason: event.payload.reason,
					}),
				},
			];

		case "admin.cartItem.cancelled":
			return [
				{
					...commandBase(event, "cartItemCancelled", event.payload.cartItemId),
					refs: { orderId: event.payload.orderId },
					metadata: metadataWithDomainEvent(event, {
						cartId: event.payload.cartId,
						reason: event.payload.reason,
					}),
				},
			];

		case "fulfillment.exception.created":
			return [
				{
					...commandBase(
						event,
						"fulfillmentException",
						event.payload.cartItemId,
					),
					refs: event.payload,
					metadata: metadataWithDomainEvent(event, {
						reason: event.payload.reason,
						...(event.payload.metadata ?? {}),
					}),
				},
			];

		case "fulfillment.exception.resolved":
			return [
				{
					...commandBase(event, "exceptionResolved", event.payload.cartItemId),
					refs: event.payload,
					metadata: metadataWithDomainEvent(event, {
						reason: event.payload.reason,
						...(event.payload.metadata ?? {}),
					}),
				},
			];

		case "operation.cartItem.included":
			return [
				{
					...commandBase(
						event,
						"includedInOperation",
						event.payload.cartItemId,
					),
					quantity: event.payload.quantity,
					refs: { operationId: event.payload.operationId },
					metadata: metadataWithDomainEvent(event, {
						cartId: event.payload.cartId,
						...(event.payload.metadata ?? {}),
					}),
				},
			];

		case "operation.cartItem.allocatedToLotItem":
			return [
				{
					...commandBase(event, "allocatedToLotItem", event.payload.cartItemId),
					quantity: event.payload.quantity,
					refs: {
						operationId: event.payload.operationId,
						lotId: event.payload.lotId,
						lotItemId: event.payload.lotItemId,
					},
					metadata: metadataWithDomainEvent(event, {
						cartId: event.payload.cartId,
						...(event.payload.metadata ?? {}),
					}),
				},
			];

		case "supplier.lotItem.confirmed":
			return [
				{
					...commandBase(event, "supplierConfirmed", event.payload.cartItemId),
					quantity: event.payload.quantity,
					refs: {
						lotId: event.payload.lotId,
						lotItemId: event.payload.lotItemId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];

		case "package.cartItem.packaged":
			return [
				{
					...commandBase(event, "packaged", event.payload.cartItemId),
					quantity: event.payload.quantity,
					refs: {
						packageId: event.payload.packageId,
						lotItemId: event.payload.lotItemId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];

		case "shipment.internal.dispatched":
			return [
				{
					...commandBase(
						event,
						"movedInInternalShipment",
						event.payload.cartItemId,
					),
					quantity: event.payload.quantity,
					refs: {
						shipmentId: event.payload.shipmentId,
						packageId: event.payload.packageId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];

		case "shipment.internal.received":
			return [
				{
					...commandBase(
						event,
						"receivedAtWarehouse",
						event.payload.cartItemId,
					),
					quantity: event.payload.quantity,
					refs: {
						shipmentId: event.payload.shipmentId,
						packageId: event.payload.packageId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];

		case "shipment.endUser.dispatched":
			return [
				{
					...commandBase(
						event,
						"movedInEndUserShipment",
						event.payload.cartItemId,
					),
					quantity: event.payload.quantity,
					refs: {
						shipmentId: event.payload.shipmentId,
						packageId: event.payload.packageId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];

		case "shipment.endUser.delivered":
			return [
				{
					...commandBase(event, "delivered", event.payload.cartItemId),
					quantity: event.payload.quantity,
					refs: {
						shipmentId: event.payload.shipmentId,
						packageId: event.payload.packageId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];

		case "rollover.preAllocation.created":
			return [
				{
					...commandBase(
						event,
						"rolledOverPreAllocation",
						event.payload.cartItemId,
					),
					quantity: event.payload.quantity,
					refs: {
						operationId: event.payload.operationId,
						rolloverId: event.payload.rolloverId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];

		case "rollover.postAllocation.created":
			return [
				{
					...commandBase(
						event,
						"rolledOverPostAllocation",
						event.payload.cartItemId,
					),
					quantity: event.payload.quantity,
					refs: {
						operationId: event.payload.operationId,
						rolloverId: event.payload.rolloverId,
					},
					metadata: metadataWithDomainEvent(event, event.payload.metadata),
				},
			];
	}
}
