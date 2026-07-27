import { z } from "zod";

type JsonSafeValue =
	| string
	| number
	| boolean
	| null
	| JsonSafeValue[]
	| { [key: string]: JsonSafeValue };

function isJsonSafeValue(
	value: unknown,
	seen = new WeakSet<object>(),
): boolean {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return true;
	}

	if (typeof value === "number") return Number.isFinite(value);
	if (typeof value !== "object") return false;
	if (value instanceof Date) return false;
	if (seen.has(value)) return false;

	seen.add(value);

	if (Array.isArray(value)) {
		return value.every((item) => isJsonSafeValue(item, seen));
	}

	if (Object.getPrototypeOf(value) !== Object.prototype) return false;

	return Object.values(value).every((item) => isJsonSafeValue(item, seen));
}

const jsonSafeRecordSchema = z
	.record(z.string(), z.unknown())
	.refine(
		(value): value is Record<string, JsonSafeValue> => isJsonSafeValue(value),
		{
			message:
				"Metadata must be JSON-safe. Serialize Date, Decimal, Error, and class instances before publishing.",
		},
	);

export const decimalStringSchema = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/, "Expected a decimal string with up to 4 places");

export const domainActorSchema = z.object({
	source: z.enum(["user", "admin", "system", "supplier", "carrier"]),
	actorId: z.string().optional(),
	actorReference: z.string().optional(),
});

export const baseDomainEventSchema = z.object({
	eventKey: z.string().min(1),
	aggregateType: z.string().min(1),
	aggregateId: z.string().min(1),
	actor: domainActorSchema.optional(),
});

const optionalDomainRefsSchema = z.object({
	operationId: z.string().optional(),
	lotId: z.string().optional(),
	lotItemId: z.string().optional(),
	packageId: z.string().optional(),
	shipmentId: z.string().optional(),
	rolloverId: z.string().optional(),
	orderId: z.string().optional(),
	userOrderItemId: z.string().optional(),
});

export const cartItemSubmittedToOrderEventSchema = baseDomainEventSchema.extend(
	{
		type: z.literal("cart.item.submittedToOrder"),
		aggregateType: z.literal("CartItem"),
		payload: z.object({
			cartItemId: z.string(),
			cartId: z.string(),
			orderId: z.string(),
			userOrderItemId: z.string(),
			transactionId: z.string().optional(),
			quantity: decimalStringSchema,
		}),
	},
);

export const adminCartItemAddedEventSchema = baseDomainEventSchema.extend({
	type: z.literal("admin.cartItem.added"),
	aggregateType: z.literal("CartItem"),
	payload: z.object({
		cartItemId: z.string(),
		cartId: z.string(),
		quantity: decimalStringSchema,
		reason: z.string().optional(),
	}),
});

export const adminCartItemQuantityChangedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("admin.cartItem.quantityChanged"),
		aggregateType: z.literal("CartItem"),
		payload: z.object({
			cartItemId: z.string(),
			cartId: z.string(),
			previousQuantity: decimalStringSchema,
			newQuantity: decimalStringSchema,
			reason: z.string().optional(),
		}),
	});

export const adminCartItemRemovedEventSchema = baseDomainEventSchema.extend({
	type: z.literal("admin.cartItem.removed"),
	aggregateType: z.literal("CartItem"),
	payload: z.object({
		cartItemId: z.string(),
		cartId: z.string(),
		previousQuantity: decimalStringSchema.optional(),
		reason: z.string().optional(),
	}),
});

export const adminCartItemCancelledEventSchema = baseDomainEventSchema.extend({
	type: z.literal("admin.cartItem.cancelled"),
	aggregateType: z.literal("CartItem"),
	payload: z.object({
		cartItemId: z.string(),
		cartId: z.string(),
		orderId: z.string().optional(),
		reason: z.string().optional(),
	}),
});

export const fulfillmentExceptionCreatedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("fulfillment.exception.created"),
		aggregateType: z.literal("CartItem"),
		payload: optionalDomainRefsSchema.extend({
			cartItemId: z.string(),
			reason: z.string(),
			metadata: jsonSafeRecordSchema.optional(),
		}),
	});

export const fulfillmentExceptionResolvedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("fulfillment.exception.resolved"),
		aggregateType: z.literal("CartItem"),
		payload: optionalDomainRefsSchema.extend({
			cartItemId: z.string(),
			reason: z.string().optional(),
			metadata: jsonSafeRecordSchema.optional(),
		}),
	});

const cartItemOperationEventPayloadSchema = optionalDomainRefsSchema.extend({
	cartItemId: z.string(),
	cartId: z.string().optional(),
	quantity: decimalStringSchema.optional(),
	metadata: jsonSafeRecordSchema.optional(),
});

export const operationCartItemIncludedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("operation.cartItem.included"),
		aggregateType: z.literal("CartItem"),
		payload: cartItemOperationEventPayloadSchema.extend({
			operationId: z.string(),
		}),
	});

/**
 * An operation compensation returned this cart item's demand to the pool. Mirrors
 * `operation.cartItem.included` and carries the same quantity that inclusion did,
 * which is the conservation property compensation rests on (ADR 0005).
 */
export const operationCartItemExcludedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("operation.cartItem.excluded"),
		aggregateType: z.literal("CartItem"),
		payload: cartItemOperationEventPayloadSchema.extend({
			operationId: z.string(),
			reason: z.string(),
		}),
	});

export const operationCartItemAllocatedToLotItemEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("operation.cartItem.allocatedToLotItem"),
		aggregateType: z.literal("CartItem"),
		payload: cartItemOperationEventPayloadSchema.extend({
			operationId: z.string(),
			lotId: z.string(),
			lotItemId: z.string(),
			quantity: decimalStringSchema,
		}),
	});

export const supplierLotItemConfirmedEventSchema = baseDomainEventSchema.extend(
	{
		type: z.literal("supplier.lotItem.confirmed"),
		aggregateType: z.literal("LotItem"),
		payload: cartItemOperationEventPayloadSchema.extend({
			lotId: z.string(),
			lotItemId: z.string(),
			quantity: decimalStringSchema.optional(),
		}),
	},
);

/**
 * One demand allocation was sent to a supplier as part of a supplier order. The
 * supplier order id and code travel in `metadata`: `CartItemTrackingEvent` has
 * no supplier-order column, so there is nothing for a ref to resolve to.
 */
export const supplierCartItemRequestedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("supplier.cartItem.requested"),
		aggregateType: z.literal("CartItem"),
		payload: cartItemOperationEventPayloadSchema.extend({
			lotId: z.string(),
			lotItemId: z.string(),
			quantity: decimalStringSchema,
		}),
	});

export const packageCartItemPackagedEventSchema = baseDomainEventSchema.extend({
	type: z.literal("package.cartItem.packaged"),
	aggregateType: z.literal("CartItem"),
	payload: cartItemOperationEventPayloadSchema.extend({
		packageId: z.string(),
		lotItemId: z.string().optional(),
		quantity: decimalStringSchema,
	}),
});

export const shipmentInternalDispatchedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("shipment.internal.dispatched"),
		aggregateType: z.literal("Shipment"),
		payload: cartItemOperationEventPayloadSchema.extend({
			shipmentId: z.string(),
			packageId: z.string().optional(),
		}),
	});

export const shipmentInternalReceivedEventSchema = baseDomainEventSchema.extend(
	{
		type: z.literal("shipment.internal.received"),
		aggregateType: z.literal("Shipment"),
		payload: cartItemOperationEventPayloadSchema.extend({
			shipmentId: z.string(),
			packageId: z.string().optional(),
		}),
	},
);

/**
 * The outbound leg anchors on `packageId`, not `shipmentId` — the inverse of its
 * `shipment.internal.*` siblings. Depot pickup emits a delivery fact with no
 * shipment at all (`package.confirmDelivery` on a package that never moved), so
 * the package is the only reference every outbound fact carries.
 *
 * `aggregateType` stays `"Shipment"` deliberately: the aggregate is still
 * conceptually the movement, and changing it would churn the outbox for no gain.
 */
export const shipmentEndUserDispatchedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("shipment.endUser.dispatched"),
		aggregateType: z.literal("Shipment"),
		payload: cartItemOperationEventPayloadSchema.extend({
			packageId: z.string(),
			shipmentId: z.string().optional(),
		}),
	});

export const shipmentEndUserDeliveredEventSchema = baseDomainEventSchema.extend(
	{
		type: z.literal("shipment.endUser.delivered"),
		aggregateType: z.literal("Shipment"),
		payload: cartItemOperationEventPayloadSchema.extend({
			packageId: z.string(),
			shipmentId: z.string().optional(),
		}),
	},
);

/**
 * A pickup-point shipment reached its collection point. Not a handover: the
 * customer still has to collect, which `package.confirmDelivery` records.
 */
export const shipmentEndUserArrivedAtPickupPointEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("shipment.endUser.arrivedAtPickupPoint"),
		aggregateType: z.literal("Shipment"),
		payload: cartItemOperationEventPayloadSchema.extend({
			packageId: z.string(),
			shipmentId: z.string().optional(),
		}),
	});

export const rolloverPreAllocationCreatedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("rollover.preAllocation.created"),
		aggregateType: z.literal("RollOver"),
		payload: cartItemOperationEventPayloadSchema.extend({
			operationId: z.string(),
			rolloverId: z.string(),
			quantity: decimalStringSchema,
		}),
	});

export const rolloverPostAllocationCreatedEventSchema =
	baseDomainEventSchema.extend({
		type: z.literal("rollover.postAllocation.created"),
		aggregateType: z.literal("RollOver"),
		payload: cartItemOperationEventPayloadSchema.extend({
			operationId: z.string(),
			rolloverId: z.string(),
			quantity: decimalStringSchema,
		}),
	});

/**
 * An operator closed an open roll over with an explicit decision. Records the
 * decision only — it moves no money and creates no demand (ADR 0005).
 */
export const rolloverResolvedEventSchema = baseDomainEventSchema.extend({
	type: z.literal("rollover.resolved"),
	aggregateType: z.literal("RollOver"),
	payload: cartItemOperationEventPayloadSchema.extend({
		operationId: z.string(),
		rolloverId: z.string(),
		quantity: decimalStringSchema,
		reason: z.string(),
	}),
});

export const domainEventSchema = z.discriminatedUnion("type", [
	cartItemSubmittedToOrderEventSchema,
	adminCartItemAddedEventSchema,
	adminCartItemQuantityChangedEventSchema,
	adminCartItemRemovedEventSchema,
	adminCartItemCancelledEventSchema,
	fulfillmentExceptionCreatedEventSchema,
	fulfillmentExceptionResolvedEventSchema,
	operationCartItemIncludedEventSchema,
	operationCartItemExcludedEventSchema,
	operationCartItemAllocatedToLotItemEventSchema,
	supplierCartItemRequestedEventSchema,
	supplierLotItemConfirmedEventSchema,
	packageCartItemPackagedEventSchema,
	shipmentInternalDispatchedEventSchema,
	shipmentInternalReceivedEventSchema,
	shipmentEndUserDispatchedEventSchema,
	shipmentEndUserDeliveredEventSchema,
	shipmentEndUserArrivedAtPickupPointEventSchema,
	rolloverPreAllocationCreatedEventSchema,
	rolloverPostAllocationCreatedEventSchema,
	rolloverResolvedEventSchema,
]);

export const domainEventTypeSchema = z.enum([
	"cart.item.submittedToOrder",
	"admin.cartItem.added",
	"admin.cartItem.quantityChanged",
	"admin.cartItem.removed",
	"admin.cartItem.cancelled",
	"fulfillment.exception.created",
	"fulfillment.exception.resolved",
	"operation.cartItem.included",
	"operation.cartItem.excluded",
	"operation.cartItem.allocatedToLotItem",
	"supplier.cartItem.requested",
	"supplier.lotItem.confirmed",
	"package.cartItem.packaged",
	"shipment.internal.dispatched",
	"shipment.internal.received",
	"shipment.endUser.dispatched",
	"shipment.endUser.delivered",
	"shipment.endUser.arrivedAtPickupPoint",
	"rollover.preAllocation.created",
	"rollover.postAllocation.created",
	"rollover.resolved",
]);

export type DomainEventInput = z.infer<typeof domainEventSchema>;
