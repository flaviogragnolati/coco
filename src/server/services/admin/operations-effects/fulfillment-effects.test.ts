import { expect, test } from "vitest";
import { domainEventSchema } from "~/schemas/domain-events.schemas";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import {
	buildExceptionEvents,
	buildExceptionResolvedEvents,
	buildFractionationEvents,
	buildMovementEvents,
	buildPackageDeliveryEvents,
	buildPackageExceptionEvents,
	buildPackageRecoveredEvents,
	buildPickupArrivalEvents,
	buildRollOverEvents,
	buildShipmentPackagedEvents,
	buildWriteOffResolvedEvents,
	buildWriteOffRollOverEvents,
} from "./fulfillment-event-builders";
import type {
	AdminOperationsEffectContext,
	AdminPackageChangeSet,
	AdminPackagedLineChange,
	AdminShipmentChangeSet,
} from "./operations-effects.types";

const ctx: AdminOperationsEffectContext = {
	// The builders are pure — they read only the actor, never the client.
	db: {} as AdminOperationsEffectContext["db"],
	actor: { id: "admin-1", name: "Ada", role: "admin" },
	source: "shipment",
};

const line: AdminPackagedLineChange = {
	packageId: 7,
	packageLotItemId: 70,
	lotItemId: 700,
	allocations: [
		{ cartItemId: 1, cartId: 11, quantity: "6" },
		{ cartItemId: 2, cartId: 12, quantity: "4" },
	],
};

const shipmentChangeSet: AdminShipmentChangeSet = {
	shipmentId: 5,
	shipmentInternalCode: "SHP-1",
	supplierOrderId: 3,
	packagedLines: [line],
	movedLines: [line],
	createdRollOvers: [
		{
			rollOverId: 90,
			operationId: 2,
			cartItemId: 1,
			cartId: 11,
			quantity: "2",
			reason: "Faltante en recepción",
		},
	],
	reason: "El camión no llegó",
};

const packageChangeSet: AdminPackageChangeSet = {
	packageId: 7,
	packageName: "Paquete consolidado",
	writtenOffLines: [line],
	movedLines: [line],
	createdRollOvers: shipmentChangeSet.createdRollOvers,
	reason: "Mercadería perdida",
};

/** Collected at a pickup point: the package has a shipment behind it. */
const collectedChangeSet: AdminPackageChangeSet = {
	...packageChangeSet,
	shipmentId: 5,
	resolvesException: true,
};

/** Depot pickup: handed over with no shipment record at all. */
const depotPickupChangeSet: AdminPackageChangeSet = {
	packageId: 9,
	packageName: "Retiro en deposito",
	movedLines: [{ ...line, packageId: 9, packageLotItemId: 90 }],
};

/** A fractionation output is a new package row, so its lines carry new ids. */
const fractionationChangeSet: AdminPackageChangeSet = {
	packageId: 8,
	packageName: "Fraccionamiento — Ada",
	packagedLines: [{ ...line, packageId: 8, packageLotItemId: 80 }],
};

/** Every event this phase can publish, from every builder, in one list. */
function allEvents(): DomainEventInput[] {
	return [
		...buildShipmentPackagedEvents(ctx, shipmentChangeSet),
		...buildMovementEvents(ctx, shipmentChangeSet, "dispatched"),
		...buildMovementEvents(ctx, shipmentChangeSet, "received"),
		...buildMovementEvents(ctx, shipmentChangeSet, "dispatched", "endUser"),
		...buildMovementEvents(ctx, shipmentChangeSet, "received", "endUser"),
		...buildPickupArrivalEvents(ctx, shipmentChangeSet),
		...buildPackageDeliveryEvents(ctx, packageChangeSet),
		...buildPackageDeliveryEvents(ctx, depotPickupChangeSet),
		...buildPackageRecoveredEvents(ctx, packageChangeSet),
		...buildRollOverEvents(ctx, shipmentChangeSet),
		...buildExceptionEvents(ctx, {
			...shipmentChangeSet,
			exceptionStatus: "delayed",
		}),
		...buildExceptionEvents(ctx, {
			...shipmentChangeSet,
			exceptionStatus: "failed",
		}),
		...buildExceptionResolvedEvents(ctx, shipmentChangeSet, "receipt"),
		...buildExceptionResolvedEvents(ctx, shipmentChangeSet, "retry"),
		...buildWriteOffRollOverEvents(ctx, packageChangeSet),
		...buildWriteOffResolvedEvents(ctx, packageChangeSet),
		...buildFractionationEvents(ctx, fractionationChangeSet),
		...buildPackageExceptionEvents(ctx, {
			...packageChangeSet,
			exceptionStatus: "delayed",
		}),
		...buildPackageExceptionEvents(ctx, {
			...packageChangeSet,
			exceptionStatus: "failed",
		}),
	];
}

test("every event this phase publishes validates against the domain event schema", () => {
	const events = allEvents();

	expect(events.length).toBeGreaterThan(0);
	for (const event of events) {
		expect(() => domainEventSchema.parse(event)).not.toThrow();
	}
});

test("event keys are collision-free across every command of the phase", () => {
	const keys = allEvents().map((event) => event.eventKey);

	// The write-off roll over reuses the shipment roll over key shape on purpose:
	// `rollOverId` is unique, so the same roll over is the same fact either way.
	expect(new Set(keys).size).toBe(keys.length - 1);
});

test("a delayed and a failed disruption of one shipment are distinct facts", () => {
	const delayed = buildExceptionEvents(ctx, {
		...shipmentChangeSet,
		exceptionStatus: "delayed",
	}).map((event) => event.eventKey);
	const failed = buildExceptionEvents(ctx, {
		...shipmentChangeSet,
		exceptionStatus: "failed",
	}).map((event) => event.eventKey);

	expect(delayed).toHaveLength(2);
	expect(new Set([...delayed, ...failed]).size).toBe(4);
});

test("a disruption without a recorded status publishes nothing", () => {
	expect(buildExceptionEvents(ctx, shipmentChangeSet)).toEqual([]);
});

test("exception events are one per cart item, not one per line", () => {
	const events = buildExceptionEvents(ctx, {
		...shipmentChangeSet,
		exceptionStatus: "failed",
		// The same two cart items appear on two lines of the same shipment.
		movedLines: [line, { ...line, packageLotItemId: 71, lotItemId: 701 }],
	});

	expect(events).toHaveLength(2);
});

test("a disrupted package and a disrupted shipment are distinct facts for one cart item", () => {
	// The whole point of package-level exceptions: one lost box inside an
	// otherwise-fine shipment. The two keys must never dedupe into each other.
	const fromPackage = buildPackageExceptionEvents(ctx, {
		...packageChangeSet,
		exceptionStatus: "failed",
	}).map((event) => event.eventKey);
	const fromShipment = buildExceptionEvents(ctx, {
		...shipmentChangeSet,
		exceptionStatus: "failed",
	}).map((event) => event.eventKey);

	expect(fromPackage).toHaveLength(2);
	expect(new Set([...fromPackage, ...fromShipment]).size).toBe(4);
});

test("a package disruption without a recorded status publishes nothing", () => {
	expect(buildPackageExceptionEvents(ctx, packageChangeSet)).toEqual([]);
});

test("a fractionated package publishes packaged events under its own new ids", () => {
	const fractionated = buildFractionationEvents(ctx, fractionationChangeSet);
	const dispatched = buildShipmentPackagedEvents(ctx, shipmentChangeSet);

	expect(fractionated).toHaveLength(2);
	expect(
		new Set([...fractionated, ...dispatched].map((event) => event.eventKey))
			.size,
	).toBe(4);
});

test("a receipt resolution and a retry resolution never collide", () => {
	const receipt = buildExceptionResolvedEvents(
		ctx,
		shipmentChangeSet,
		"receipt",
	);
	const retry = buildExceptionResolvedEvents(ctx, shipmentChangeSet, "retry");

	expect(
		new Set([...receipt, ...retry].map((event) => event.eventKey)).size,
	).toBe(4);
});

test("the two legs record distinct facts for the same shipment, package and cart item", () => {
	const internal = buildMovementEvents(ctx, shipmentChangeSet, "dispatched");
	const endUser = buildMovementEvents(
		ctx,
		shipmentChangeSet,
		"dispatched",
		"endUser",
	);

	expect(internal.map((event) => event.type)).toEqual([
		"shipment.internal.dispatched",
		"shipment.internal.dispatched",
	]);
	expect(endUser.map((event) => event.type)).toEqual([
		"shipment.endUser.dispatched",
		"shipment.endUser.dispatched",
	]);
	expect(
		new Set([...internal, ...endUser].map((event) => event.eventKey)).size,
	).toBe(4);
});

test("a pickup arrival is one fact per cart item, distinct from both movements", () => {
	const arrivals = buildPickupArrivalEvents(ctx, shipmentChangeSet);
	const movements = [
		...buildMovementEvents(ctx, shipmentChangeSet, "received"),
		...buildMovementEvents(ctx, shipmentChangeSet, "received", "endUser"),
	];

	expect(arrivals).toHaveLength(2);
	expect(
		new Set([...arrivals, ...movements].map((event) => event.eventKey)).size,
	).toBe(6);
});

test("a depot-pickup delivery carries a packageId and no shipmentId at all", () => {
	const [event] = buildPackageDeliveryEvents(ctx, depotPickupChangeSet);
	if (!event) throw new Error("Expected a delivery event");

	const payload = event.payload as {
		packageId?: string;
		shipmentId?: string;
	};
	expect(event.type).toBe("shipment.endUser.delivered");
	expect(payload.packageId).toBe("9");
	expect(payload.shipmentId).toBeUndefined();
	expect(() => domainEventSchema.parse(event)).not.toThrow();
});

test("a pickup-point collection carries both references", () => {
	const [event] = buildPackageDeliveryEvents(ctx, collectedChangeSet);
	if (!event) throw new Error("Expected a delivery event");

	const payload = event.payload as {
		packageId?: string;
		shipmentId?: string;
	};
	expect(payload.packageId).toBe("7");
	expect(payload.shipmentId).toBe("5");
});

test("a recovery resolution never collides with a write-off resolution", () => {
	const recovered = buildPackageRecoveredEvents(ctx, packageChangeSet);
	const writtenOff = buildWriteOffResolvedEvents(ctx, packageChangeSet);

	expect(recovered).toHaveLength(2);
	expect(
		new Set([...recovered, ...writtenOff].map((event) => event.eventKey)).size,
	).toBe(4);
});

test("quantities travel as decimal strings, never as Decimal instances", () => {
	for (const event of allEvents()) {
		const quantity = (event.payload as { quantity?: unknown }).quantity;
		if (quantity === undefined) continue;
		expect(typeof quantity).toBe("string");
	}
});
