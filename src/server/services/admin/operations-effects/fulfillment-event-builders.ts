import type { DomainEventInput } from "~/shared/common/domain-events.types";
import type {
	AdminOperationsEffectContext,
	AdminPackageChangeSet,
	AdminPackagedLineChange,
	AdminShipmentChangeSet,
} from "./operations-effects.types";

/**
 * Pure event builders for the goods-inbound commands: change set in, validated
 * `DomainEventInput[]` out. Kept apart from the two handler classes so the
 * payloads and the deterministic keys can be unit-tested without reaching for
 * `DomainEventPublisher`, which is `server-only`.
 *
 * The mapper defaults every `shipment.*` event to the `carrier` source, so these
 * builders state the admin actor explicitly — that is what keeps the tracking
 * rows attributed to the operator who ran the command rather than to a carrier.
 */
function adminActor(ctx: AdminOperationsEffectContext) {
	return {
		source: "admin" as const,
		actorId: ctx.actor.id,
		actorReference: ctx.actor.name,
	};
}

function shipmentMetadata(changeSet: AdminShipmentChangeSet) {
	return {
		shipmentId: String(changeSet.shipmentId),
		shipmentInternalCode: changeSet.shipmentInternalCode,
		...(changeSet.supplierOrderId === undefined
			? {}
			: { supplierOrderId: String(changeSet.supplierOrderId) }),
		...(changeSet.reason === undefined ? {} : { reason: changeSet.reason }),
	};
}

/** Every affected cart item, deduped: the exception events are per item, not per line. */
function affectedCartItems(lines: AdminPackagedLineChange[]) {
	const byCartItemId = new Map<
		number,
		{ cartItemId: number; cartId: number }
	>();

	for (const line of lines) {
		for (const allocation of line.allocations) {
			if (byCartItemId.has(allocation.cartItemId)) continue;
			byCartItemId.set(allocation.cartItemId, {
				cartItemId: allocation.cartItemId,
				cartId: allocation.cartId,
			});
		}
	}

	return Array.from(byCartItemId.values());
}

/**
 * Deterministic keys, no timestamp component: the ladder guards make each fact
 * publishable at most once per (shipment, package, line, cart item). The
 * exception key carries the status because one shipment can be delayed and then
 * fail, and those are two distinct facts. The roll over key deliberately reuses
 * `supplier-order-effects`'s shape — `rollOverId` is unique, so they cannot
 * collide across producers.
 */
function packagedKey(input: {
	packageId: number;
	packageLotItemId: number;
	cartItemId: number;
}) {
	return `package:${input.packageId}:line:${input.packageLotItemId}:cartItem:${input.cartItemId}:packaged`;
}

/**
 * Shared by both legs. The internal shape is unchanged — those keys are already
 * in the outbox and must stay byte-identical — and the end-user leg adds a
 * segment, so the two can never collide even on hand-edited data.
 */
function movementKey(input: {
	shipmentId: number;
	packageId: number;
	cartItemId: number;
	movement: "dispatched" | "received";
	leg: "internal" | "endUser";
}) {
	const suffix =
		input.leg === "internal" ? input.movement : `endUser:${input.movement}`;
	return `shipment:${input.shipmentId}:package:${input.packageId}:cartItem:${input.cartItemId}:${suffix}`;
}

/** Depot pickup has no shipment, so the package is the only anchor available. */
function packageDeliveryKey(input: { packageId: number; cartItemId: number }) {
	return `package:${input.packageId}:cartItem:${input.cartItemId}:delivered`;
}

function pickupArrivalKey(input: { shipmentId: number; cartItemId: number }) {
	return `shipment:${input.shipmentId}:cartItem:${input.cartItemId}:arrivedAtPickupPoint`;
}

function exceptionKey(input: {
	shipmentId: number;
	cartItemId: number;
	status: "delayed" | "failed";
}) {
	return `shipment:${input.shipmentId}:cartItem:${input.cartItemId}:exception:${input.status}`;
}

function exceptionResolvedKey(input: {
	shipmentId: number;
	cartItemId: number;
	trigger: "receipt" | "retry";
}) {
	return `shipment:${input.shipmentId}:cartItem:${input.cartItemId}:exception:resolved:${input.trigger}`;
}

function rollOverKey(input: {
	operationId: number;
	cartItemId: number;
	rollOverId: number;
}) {
	return `operation:${input.operationId}:cartItem:${input.cartItemId}:rollover:${input.rollOverId}:created`;
}

/**
 * Shared by the two producers of packaged quantity — `registerDispatch` on the
 * inbound leg and `fractionate` on the outbound one — so the metadata is passed
 * in rather than derived from a change-set shape only one of them has.
 */
export function buildPackagedEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: { packagedLines?: AdminPackagedLineChange[] },
	metadata: Record<string, string>,
): DomainEventInput[] {
	return (changeSet.packagedLines ?? []).flatMap((line) =>
		line.allocations.map((allocation) => ({
			type: "package.cartItem.packaged" as const,
			eventKey: packagedKey({
				packageId: line.packageId,
				packageLotItemId: line.packageLotItemId,
				cartItemId: allocation.cartItemId,
			}),
			aggregateType: "CartItem" as const,
			aggregateId: String(allocation.cartItemId),
			actor: adminActor(ctx),
			payload: {
				cartItemId: String(allocation.cartItemId),
				cartId: String(allocation.cartId),
				packageId: String(line.packageId),
				lotItemId: String(line.lotItemId),
				quantity: allocation.quantity,
				metadata,
			},
		})),
	);
}

export function buildShipmentPackagedEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminShipmentChangeSet,
): DomainEventInput[] {
	return buildPackagedEvents(ctx, changeSet, shipmentMetadata(changeSet));
}

const movementTypeByLeg = {
	internal: {
		dispatched: "shipment.internal.dispatched",
		received: "shipment.internal.received",
	},
	endUser: {
		dispatched: "shipment.endUser.dispatched",
		received: "shipment.endUser.delivered",
	},
} as const;

/**
 * The four movement facts, selected by leg. Both legs carry `shipmentId` and
 * `packageId`; only the *contract* differs — the end-user schemas require
 * `packageId` and make `shipmentId` optional, because depot pickup emits a
 * delivery with no shipment at all (`buildPackageDeliveryEvents`).
 */
export function buildMovementEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminShipmentChangeSet,
	movement: "dispatched" | "received",
	leg: "internal" | "endUser" = "internal",
): DomainEventInput[] {
	const type = movementTypeByLeg[leg][movement];

	return (changeSet.movedLines ?? []).flatMap((line) =>
		line.allocations.map((allocation) => ({
			type,
			eventKey: movementKey({
				shipmentId: changeSet.shipmentId,
				packageId: line.packageId,
				cartItemId: allocation.cartItemId,
				movement,
				leg,
			}),
			aggregateType: "Shipment" as const,
			aggregateId: String(changeSet.shipmentId),
			actor: adminActor(ctx),
			payload: {
				cartItemId: String(allocation.cartItemId),
				cartId: String(allocation.cartId),
				shipmentId: String(changeSet.shipmentId),
				packageId: String(line.packageId),
				lotItemId: String(line.lotItemId),
				quantity: allocation.quantity,
				metadata: shipmentMetadata(changeSet),
			},
		})),
	);
}

/**
 * A pickup-point shipment reached its collection point. One event per affected
 * cart item, not per line: the arrival is a shipment-level fact the customer is
 * told about, and the handover it announces is still to come.
 */
export function buildPickupArrivalEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminShipmentChangeSet,
): DomainEventInput[] {
	const lines = changeSet.movedLines ?? [];
	// Every affected cart item's first line supplies the package anchor the schema
	// requires; the arrival is the same fact whichever package carries it.
	const packageIdByCartItemId = new Map<number, number>();
	for (const line of lines) {
		for (const allocation of line.allocations) {
			if (packageIdByCartItemId.has(allocation.cartItemId)) continue;
			packageIdByCartItemId.set(allocation.cartItemId, line.packageId);
		}
	}

	return affectedCartItems(lines).map((item) => ({
		type: "shipment.endUser.arrivedAtPickupPoint" as const,
		eventKey: pickupArrivalKey({
			shipmentId: changeSet.shipmentId,
			cartItemId: item.cartItemId,
		}),
		aggregateType: "Shipment" as const,
		aggregateId: String(changeSet.shipmentId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(item.cartItemId),
			cartId: String(item.cartId),
			shipmentId: String(changeSet.shipmentId),
			packageId: String(packageIdByCartItemId.get(item.cartItemId)),
			metadata: shipmentMetadata(changeSet),
		},
	}));
}

export function buildExceptionEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminShipmentChangeSet,
): DomainEventInput[] {
	const status = changeSet.exceptionStatus;
	if (!status) return [];

	return affectedCartItems(changeSet.movedLines ?? []).map((item) => ({
		type: "fulfillment.exception.created" as const,
		eventKey: exceptionKey({
			shipmentId: changeSet.shipmentId,
			cartItemId: item.cartItemId,
			status,
		}),
		aggregateType: "CartItem" as const,
		aggregateId: String(item.cartItemId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(item.cartItemId),
			shipmentId: String(changeSet.shipmentId),
			reason: changeSet.reason ?? "",
			metadata: {
				...shipmentMetadata(changeSet),
				exceptionStatus: status,
				cartId: String(item.cartId),
			},
		},
	}));
}

export function buildExceptionResolvedEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminShipmentChangeSet,
	trigger: "receipt" | "retry",
): DomainEventInput[] {
	return affectedCartItems(changeSet.movedLines ?? []).map((item) => ({
		type: "fulfillment.exception.resolved" as const,
		eventKey: exceptionResolvedKey({
			shipmentId: changeSet.shipmentId,
			cartItemId: item.cartItemId,
			trigger,
		}),
		aggregateType: "CartItem" as const,
		aggregateId: String(item.cartItemId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(item.cartItemId),
			shipmentId: String(changeSet.shipmentId),
			reason: changeSet.reason,
			metadata: {
				...shipmentMetadata(changeSet),
				resolutionTrigger: trigger,
				cartId: String(item.cartId),
			},
		},
	}));
}

export function buildRollOverEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminShipmentChangeSet,
): DomainEventInput[] {
	return (changeSet.createdRollOvers ?? []).map((rollOver) => ({
		type: "rollover.postAllocation.created" as const,
		eventKey: rollOverKey({
			operationId: rollOver.operationId,
			cartItemId: rollOver.cartItemId,
			rollOverId: rollOver.rollOverId,
		}),
		aggregateType: "RollOver" as const,
		aggregateId: String(rollOver.rollOverId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(rollOver.cartItemId),
			cartId: String(rollOver.cartId),
			operationId: String(rollOver.operationId),
			rolloverId: String(rollOver.rollOverId),
			quantity: rollOver.quantity,
			metadata: {
				...shipmentMetadata(changeSet),
				reason: rollOver.reason,
			},
		},
	}));
}

function packageMetadata(changeSet: AdminPackageChangeSet) {
	return {
		packageId: String(changeSet.packageId),
		packageName: changeSet.packageName,
		...(changeSet.reason === undefined ? {} : { reason: changeSet.reason }),
	};
}

export function buildFractionationEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminPackageChangeSet,
): DomainEventInput[] {
	return buildPackagedEvents(ctx, changeSet, packageMetadata(changeSet));
}

/**
 * A package-level exception. The key is namespaced by package, so a disrupted
 * package and its shipment record two distinct facts for the same cart item —
 * which is the point of the command: a single lost box inside an otherwise-fine
 * shipment.
 */
export function buildPackageExceptionEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminPackageChangeSet,
): DomainEventInput[] {
	const status = changeSet.exceptionStatus;
	if (!status) return [];

	return affectedCartItems(changeSet.movedLines ?? []).map((item) => ({
		type: "fulfillment.exception.created" as const,
		eventKey: `package:${changeSet.packageId}:cartItem:${item.cartItemId}:exception:${status}`,
		aggregateType: "CartItem" as const,
		aggregateId: String(item.cartItemId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(item.cartItemId),
			packageId: String(changeSet.packageId),
			reason: changeSet.reason ?? "",
			metadata: {
				...packageMetadata(changeSet),
				exceptionStatus: status,
				cartId: String(item.cartId),
			},
		},
	}));
}

export function buildWriteOffRollOverEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminPackageChangeSet,
): DomainEventInput[] {
	return (changeSet.createdRollOvers ?? []).map((rollOver) => ({
		type: "rollover.postAllocation.created" as const,
		eventKey: `operation:${rollOver.operationId}:cartItem:${rollOver.cartItemId}:rollover:${rollOver.rollOverId}:created`,
		aggregateType: "RollOver" as const,
		aggregateId: String(rollOver.rollOverId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(rollOver.cartItemId),
			cartId: String(rollOver.cartId),
			operationId: String(rollOver.operationId),
			rolloverId: String(rollOver.rollOverId),
			quantity: rollOver.quantity,
			metadata: {
				...packageMetadata(changeSet),
				reason: rollOver.reason,
			},
		},
	}));
}

/**
 * The per-package handover: depot pickup, or a customer collecting at a pickup
 * point. Anchored on `packageId` with `shipmentId` supplied only when the package
 * has one — the exact case the `shipment.endUser.delivered` contract was inverted
 * for. The key is namespaced by package, so it cannot collide with the shipment
 * movement key a home delivery produces.
 */
export function buildPackageDeliveryEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminPackageChangeSet,
): DomainEventInput[] {
	return (changeSet.movedLines ?? []).flatMap((line) =>
		line.allocations.map((allocation) => ({
			type: "shipment.endUser.delivered" as const,
			eventKey: packageDeliveryKey({
				packageId: line.packageId,
				cartItemId: allocation.cartItemId,
			}),
			aggregateType: "Shipment" as const,
			aggregateId: String(changeSet.packageId),
			actor: adminActor(ctx),
			payload: {
				cartItemId: String(allocation.cartItemId),
				cartId: String(allocation.cartId),
				packageId: String(line.packageId),
				...(changeSet.shipmentId === undefined
					? {}
					: { shipmentId: String(changeSet.shipmentId) }),
				lotItemId: String(line.lotItemId),
				quantity: allocation.quantity,
				metadata: packageMetadata(changeSet),
			},
		})),
	);
}

/**
 * `package.recover` undoing a package-level disruption. The trigger is part of
 * the key so it stays distinct from the write-off resolution, which resolves the
 * same exception a different way.
 */
export function buildPackageRecoveredEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminPackageChangeSet,
): DomainEventInput[] {
	return affectedCartItems(changeSet.movedLines ?? []).map((item) => ({
		type: "fulfillment.exception.resolved" as const,
		eventKey: `package:${changeSet.packageId}:cartItem:${item.cartItemId}:exception:resolved:recover`,
		aggregateType: "CartItem" as const,
		aggregateId: String(item.cartItemId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(item.cartItemId),
			packageId: String(changeSet.packageId),
			reason: changeSet.reason,
			metadata: {
				...packageMetadata(changeSet),
				resolutionTrigger: "recover",
				cartId: String(item.cartId),
			},
		},
	}));
}

export function buildWriteOffResolvedEvents(
	ctx: AdminOperationsEffectContext,
	changeSet: AdminPackageChangeSet,
): DomainEventInput[] {
	const byCartItemId = new Map<number, number>();
	for (const line of changeSet.writtenOffLines ?? []) {
		for (const allocation of line.allocations) {
			if (byCartItemId.has(allocation.cartItemId)) continue;
			byCartItemId.set(allocation.cartItemId, allocation.cartId);
		}
	}

	return Array.from(byCartItemId.entries()).map(([cartItemId, cartId]) => ({
		type: "fulfillment.exception.resolved" as const,
		eventKey: `package:${changeSet.packageId}:cartItem:${cartItemId}:exception:resolved:writeOff`,
		aggregateType: "CartItem" as const,
		aggregateId: String(cartItemId),
		actor: adminActor(ctx),
		payload: {
			cartItemId: String(cartItemId),
			packageId: String(changeSet.packageId),
			reason: changeSet.reason,
			metadata: {
				...packageMetadata(changeSet),
				resolutionTrigger: "writeOff",
				cartId: String(cartId),
			},
		},
	}));
}
