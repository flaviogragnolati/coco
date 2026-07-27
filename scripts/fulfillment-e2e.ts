/**
 * The end-to-end run owed since Phase 1: §21.7's twelve steps driven through the
 * real service layer against the real database, repeatably, plus a thirteenth
 * covering the draft → review → execute path (ADR 0006).
 *
 * Run with `pnpm fulfillment:e2e`. Two things about that script line are
 * load-bearing:
 *
 * - `--conditions=react-server` is **mandatory**. The command services import
 *   `DomainEventDispatcher`, which imports `server-only`; without the flag the
 *   import throws "This module cannot be imported from a Client Component
 *   module", which names nothing near the actual cause.
 * - `NODE_ENV=test` only silences Prisma's query log (`src/server/db.ts` turns it
 *   on in development); it selects no different code path.
 *
 * Everything this script creates carries the `E2E-` prefix and is removed in the
 * `finally`. That prefix is deliberately *not* `*-SEED-*`: `resetDemoTransactionalData`
 * would not clean up after it, so the harness owns its own teardown.
 *
 * Projections are not racy here even though they are asynchronous in principle:
 * every command `await`s `DomainEventDispatcher.wake()` after commit, and `wake()`
 * runs its listeners to completion. `drainOutbox()` below covers the one gap —
 * `wake()` takes a bounded batch, so a command emitting more events than the
 * batch size would leave some unprojected.
 */

import { Prisma } from "~/prisma/client";
import { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import * as operationService from "~/server/services/admin/operation.service";
import * as packageService from "~/server/services/admin/package.service";
import * as rollOverService from "~/server/services/admin/roll-over.service";
import * as shipmentService from "~/server/services/admin/shipment.service";
import * as supplierOrderService from "~/server/services/admin/supplier-order.service";
import {
	deriveUserOrderClosure,
	terminalFulfillmentStatuses,
} from "~/shared/common/user-order-closure";
import { summarizeWarnings, sweepDiagnostics } from "./lib/diagnostics-sweep";

const PREFIX = "E2E";

/**
 * The actor has to be a **real** user: `createRunningOperation` writes
 * `Operation.triggeredByUserId`, which carries a foreign key, so a synthetic
 * `e2e:harness` id fails at the first command. The run is instead marked by the
 * operation's `notes` and by `RUN_STARTED_AT`, which is what scopes the audit
 * teardown — deleting every row this user ever wrote would be far too broad.
 */
const RUN_STARTED_AT = new Date();
let actor: AdminMutationActor;

/**
 * The window the seed's aggregable pool sits in: four carts across three
 * customers, two products, paid, submitted, unallocated and free of open roll
 * overs. Four because fractionation groups by cart and steps 6–8 need one
 * outbound package for the depot pickup, one for the home delivery and two for
 * the pickup point. `pnpm db:seed-verify` asserts the pool still exists, so a
 * seed edit that consumes it fails there rather than here.
 */
const AGGREGATION_FROM = new Date("2026-05-15T00:00:00.000Z");
const AGGREGATION_TO = new Date("2026-05-25T00:00:00.000Z");

/**
 * A second aggregable pool, deliberately disjoint from the one above: step 13
 * runs the draft → review → execute path for real, and an overlapping window
 * would have the two operations competing for the same demand.
 */
const DRAFT_FROM = new Date("2026-06-10T00:00:00.000Z");
const DRAFT_TO = new Date("2026-06-15T00:00:00.000Z");

const HARNESS_NOTE = `${PREFIX} harness run`;
const DRAFT_NOTE = `${PREFIX} draft review run`;

type Step = { name: string; run: () => Promise<void> };

const steps: Step[] = [];
const failures: string[] = [];
let currentStep = "";

function stepFn(name: string, run: () => Promise<void>) {
	steps.push({ name, run });
}

function check(condition: boolean, message: string) {
	if (!condition) failures.push(`${currentStep}: ${message}`);
}

function checkEqual(actual: unknown, expected: unknown, label: string) {
	check(
		actual === expected,
		`${label} — expected ${String(expected)}, got ${String(actual)}`,
	);
}

/**
 * `wake()` claims a bounded batch, so a command that emitted more events than the
 * batch size would leave the tail unprojected. Loops until the outbox is empty.
 */
async function drainOutbox() {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const pending = await db.domainEventOutbox.count({
			where: { status: { in: ["pending", "processing"] } },
		});
		if (pending === 0) return;
		await DomainEventDispatcher.wake();
	}
	failures.push(`${currentStep}: outbox did not drain`);
}

async function fulfillmentStatusOf(cartItemId: number) {
	const record = await db.cartItem.findUniqueOrThrow({
		where: { id: cartItemId },
		select: { fulfillmentStatus: true },
	});
	return record.fulfillmentStatus;
}

async function assertNoCriticals(scope: string) {
	const sweep = await sweepDiagnostics(db);
	for (const critical of sweep.criticals) {
		failures.push(
			`${scope}: critical ${critical.code} on ${critical.scope} — ${critical.message}`,
		);
	}
	return sweep;
}

// ── Run state, threaded between steps ────────────────────────────────────────

type RunState = {
	operationId: number;
	supplierOrderId: number;
	/** Cart item ids the operation allocated, in aggregation order. */
	cartItemIds: number[];
	/** The lot line the harness cuts on confirmation. */
	cutLotItemId: number;
	cutCartItemId: number;
	internalShipmentId: number;
	inboundPackageId: number;
	/** One outbound package per customer, from fractionation. */
	outboundPackageIds: number[];
	depotPackageId: number;
	homePackageId: number;
	pickupPackageIds: number[];
	homeShipmentId: number;
	pickupShipmentId: number;
	resolvedRollOverId: number;
};

const state = {} as RunState;

// ── Steps 1–5: aggregation through fractionation ─────────────────────────────

stepFn("1. aggregate real cart demand into a new operation", async () => {
	const destination = await db.destination.findFirstOrThrow({
		where: { active: true, deleted: false },
		select: { id: true },
	});

	const operation = await operationService.createAndExecute(
		{
			from: AGGREGATION_FROM.toISOString(),
			to: AGGREGATION_TO.toISOString(),
			destinationId: destination.id,
			includeRollOver: false,
			strategy: "fifo",
			notes: HARNESS_NOTE,
		},
		actor,
		db,
	);
	await drainOutbox();

	state.operationId = operation.id;
	checkEqual(operation.status, "completed", "operation status");
	check(operation.lots.length > 0, "the operation produced no lots");

	const allocations = await db.cartItemLotItem.findMany({
		where: { lotItem: { lot: { operationId: operation.id } } },
		select: {
			cartItemId: true,
			quantity: true,
			lotItemId: true,
			cartItem: { select: { cartId: true, code: true } },
		},
		orderBy: { id: "asc" },
	});

	state.cartItemIds = [
		...new Set(allocations.map((allocation) => allocation.cartItemId)),
	];
	check(
		new Set(allocations.map((allocation) => allocation.cartItem.cartId)).size >=
			2,
		"aggregation produced demand from fewer than two customers — fractionation needs at least two",
	);

	for (const cartItemId of state.cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"allocatedToSupplierItem",
			`cart item ${cartItemId} after execution`,
		);
	}

	// The line the confirmation cuts: whichever has the most demand allocations, so
	// LIFO absorption has something to order.
	const byLotItem = new Map<number, typeof allocations>();
	for (const allocation of allocations) {
		const bucket = byLotItem.get(allocation.lotItemId) ?? [];
		bucket.push(allocation);
		byLotItem.set(allocation.lotItemId, bucket);
	}
	const [cutLotItemId, cutAllocations] = [...byLotItem].sort(
		([, a], [, b]) => b.length - a.length,
	)[0] ?? [0, []];
	state.cutLotItemId = cutLotItemId;

	const supplierOrder = await db.supplierOrder.findFirstOrThrow({
		where: { lots: { some: { operationId: operation.id } } },
		select: { id: true },
	});
	state.supplierOrderId = supplierOrder.id;

	// LIFO absorbs the latest payment first, so the cut lands on the allocation
	// whose customer paid last.
	const latest = cutAllocations.at(-1);
	state.cutCartItemId = latest?.cartItemId ?? 0;
});

stepFn("2. request and partially confirm the supplier order", async () => {
	await supplierOrderService.request(
		{ id: state.supplierOrderId, externalReference: `${PREFIX}-EXT-REQ` },
		actor,
		db,
	);
	await drainOutbox();

	for (const cartItemId of state.cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"requestedFromSupplier",
			`cart item ${cartItemId} after request`,
		);
	}

	const lines = await db.lotItem.findMany({
		where: { lot: { supplierOrderId: state.supplierOrderId } },
		select: { id: true, quantity: true },
		orderBy: { id: "asc" },
	});

	// One line short by 10, every other line confirmed in full — the partial
	// confirmation §21.7 asks for, and the only place LIFO absorption runs.
	const CUT = new Prisma.Decimal("10");
	await supplierOrderService.confirm(
		{
			id: state.supplierOrderId,
			externalReference: undefined,
			lines: lines.map((line) => ({
				lotItemId: line.id,
				confirmedQuantity:
					line.id === state.cutLotItemId
						? line.quantity.minus(CUT).toString()
						: line.quantity.toString(),
			})),
		},
		actor,
		db,
	);
	await drainOutbox();

	const rollOvers = await db.rollOver.findMany({
		where: { operationId: state.operationId, stage: "postAllocation" },
		select: { cartItemId: true, quantity: true, status: true },
	});
	check(rollOvers.length > 0, "the cut minted no post-allocation roll over");
	check(
		rollOvers.every((rollOver) => rollOver.status === "open"),
		"a cut roll over is not open",
	);

	const total = rollOvers.reduce(
		(sum, rollOver) => sum.plus(rollOver.quantity),
		new Prisma.Decimal(0),
	);
	check(total.equals(CUT), `cut roll overs sum to ${total.toString()}, not 10`);

	// The absorption order is what customers see, so assert it rather than only
	// the total: LIFO takes from the latest payment first.
	check(
		rollOvers.some((rollOver) => rollOver.cartItemId === state.cutCartItemId),
		"the cut did not land on the latest-paid allocation (LIFO order broken)",
	);

	const uncut = state.cartItemIds.filter(
		(cartItemId) =>
			!rollOvers.some((rollOver) => rollOver.cartItemId === cartItemId),
	);
	for (const cartItemId of uncut) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"supplierConfirmed",
			`uncut cart item ${cartItemId} after confirmation`,
		);
	}
});

stepFn("3. register the supplier dispatch", async () => {
	const lines = await db.lotItem.findMany({
		where: {
			lot: { supplierOrderId: state.supplierOrderId },
			status: "confirmed",
		},
		select: { id: true, quantity: true },
		orderBy: { id: "asc" },
	});

	await supplierOrderService.registerDispatch(
		{
			id: state.supplierOrderId,
			shipment: {
				name: `${PREFIX} transferencia interna`,
				internalCode: `${PREFIX}-SHIP-INBOUND`,
				trackingCode: undefined,
			},
			packageName: `${PREFIX}-PKG-INBOUND`,
			lines: lines.map((line) => ({
				lotItemId: line.id,
				quantity: line.quantity.toString(),
			})),
		},
		actor,
		db,
	);
	await drainOutbox();

	const shipment = await db.shipment.findFirstOrThrow({
		where: { internalCode: `${PREFIX}-SHIP-INBOUND` },
		select: {
			id: true,
			status: true,
			type: true,
			packages: { select: { id: true, leg: true, status: true } },
		},
	});
	state.internalShipmentId = shipment.id;
	checkEqual(shipment.type, "internalTransfer", "dispatch shipment type");
	checkEqual(shipment.status, "readyForDispatch", "dispatch shipment status");
	checkEqual(shipment.packages.length, 1, "dispatch package count");

	const inbound = shipment.packages[0];
	state.inboundPackageId = inbound?.id ?? 0;
	checkEqual(inbound?.leg, "inbound", "dispatch package leg");
	checkEqual(inbound?.status, "readyForShipment", "dispatch package status");

	for (const cartItemId of state.cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"packaged",
			`cart item ${cartItemId} after dispatch registration`,
		);
	}
});

stepFn("4. dispatch and receive with a shortfall", async () => {
	await shipmentService.dispatch({ id: state.internalShipmentId }, actor, db);
	await drainOutbox();

	for (const cartItemId of state.cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"inInternalShipment",
			`cart item ${cartItemId} after departure`,
		);
	}

	const lines = await db.packageLotItem.findMany({
		where: { packageId: state.inboundPackageId, status: { not: "cancelled" } },
		select: { id: true, quantity: true, lotItemId: true },
		orderBy: { id: "asc" },
	});

	// A shortfall of 5 on one line: the receipt path's own absorption, on a
	// different trigger than the supplier cut.
	const SHORTFALL = new Prisma.Decimal("5");
	const shortLine =
		lines.find((line) => line.lotItemId !== state.cutLotItemId) ?? lines[0];
	const rollOversBefore = await db.rollOver.count({
		where: { operationId: state.operationId, stage: "postAllocation" },
	});

	await shipmentService.receive(
		{
			id: state.internalShipmentId,
			lines: lines.map((line) => ({
				packageLotItemId: line.id,
				receivedQuantity:
					line.id === shortLine?.id
						? line.quantity.minus(SHORTFALL).toString()
						: line.quantity.toString(),
				reason: line.id === shortLine?.id ? "Faltante en recepcion" : undefined,
			})),
			final: true,
			finalReason: `${PREFIX} cierre definitivo`,
		},
		actor,
		db,
	);
	await drainOutbox();

	const rollOversAfter = await db.rollOver.count({
		where: { operationId: state.operationId, stage: "postAllocation" },
	});
	check(
		rollOversAfter > rollOversBefore,
		"the receipt shortfall minted no roll over",
	);

	const order = await db.supplierOrder.findUniqueOrThrow({
		where: { id: state.supplierOrderId },
		select: { status: true },
	});
	checkEqual(order.status, "completed", "supplier order after a final receipt");

	const live = await liveCartItems();
	for (const cartItemId of live) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"atWarehouse",
			`cart item ${cartItemId} after receipt`,
		);
	}
});

/** Cart items of the run that still hold a live allocation with quantity. */
async function liveCartItems() {
	const allocations = await db.cartItemLotItem.findMany({
		where: {
			lotItem: {
				lot: { operationId: state.operationId, status: { not: "cancelled" } },
				status: { not: "cancelled" },
			},
			quantity: { gt: 0 },
		},
		select: { cartItemId: true },
	});
	return [...new Set(allocations.map((allocation) => allocation.cartItemId))];
}

stepFn("5. fractionate into one outbound package per customer", async () => {
	const result = await packageService.fractionate(
		{
			sourcePackageIds: [state.inboundPackageId],
			namePrefix: `${PREFIX}-FRAC`,
		},
		actor,
		db,
	);
	await drainOutbox();

	state.outboundPackageIds = result.createdPackageIds;
	check(
		result.createdPackageIds.length >= 2,
		`fractionation produced ${result.createdPackageIds.length} package(s); steps 6–8 need at least two`,
	);

	const created = await db.package.findMany({
		where: { id: { in: result.createdPackageIds } },
		select: { id: true, leg: true, status: true, shipmentId: true },
	});
	for (const pkg of created) {
		checkEqual(pkg.leg, "outbound", `package ${pkg.id} leg`);
		checkEqual(pkg.status, "readyForShipment", `package ${pkg.id} status`);
		checkEqual(pkg.shipmentId, null, `package ${pkg.id} shipment`);
	}

	// 4a's exit condition: fractionation moves no customer forward.
	for (const cartItemId of await liveCartItems()) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"atWarehouse",
			`cart item ${cartItemId} after fractionation`,
		);
	}
});

// ── Steps 6–9: the three delivery modes and disruption ───────────────────────

stepFn(
	"6. depot pickup — confirmDelivery with no shipment at all",
	async () => {
		const [first] = state.outboundPackageIds;
		state.depotPackageId = first ?? 0;

		await packageService.confirmDelivery(
			{ id: state.depotPackageId, notes: undefined },
			actor,
			db,
		);
		await drainOutbox();

		const pkg = await db.package.findUniqueOrThrow({
			where: { id: state.depotPackageId },
			select: {
				status: true,
				shipmentId: true,
				packageLotItems: {
					select: {
						status: true,
						packageAllocations: {
							select: { cartItemLotItem: { select: { cartItemId: true } } },
						},
					},
				},
			},
		});
		checkEqual(pkg.status, "received", "depot package status");
		checkEqual(pkg.shipmentId, null, "depot package shipment");

		for (const cartItemId of pkg.packageLotItems.flatMap((line) =>
			line.packageAllocations.map(
				(allocation) => allocation.cartItemLotItem.cartItemId,
			),
		)) {
			checkEqual(
				await fulfillmentStatusOf(cartItemId),
				"delivered",
				`depot cart item ${cartItemId}`,
			);
		}

		// §12's contract adjustment: the delivery event carries `packageId` and omits
		// `shipmentId` entirely, because the command never wrote a shipment.
		const event = await db.domainEventOutbox.findFirst({
			where: {
				eventType: "shipment.endUser.delivered",
				eventKey: { contains: `package:${state.depotPackageId}:` },
			},
			select: { payload: true },
			orderBy: { createdAt: "desc" },
		});
		check(
			event !== null,
			"no shipment.endUser.delivered event for the depot package",
		);

		const payload = (event?.payload ?? {}) as Record<string, unknown>;
		// The builders stringify every id, so compare as strings rather than by
		// identity: the assertion is about *which* package, not which JSON type.
		checkEqual(
			String(payload.packageId),
			String(state.depotPackageId),
			"delivery event packageId",
		);
		check(
			!("shipmentId" in payload),
			"the depot delivery event carries a shipmentId; it must be omitted",
		);
	},
);

stepFn("7. home delivery — create, dispatch, deliver", async () => {
	const [, second] = state.outboundPackageIds;
	state.homePackageId = second ?? 0;

	const shipment = await shipmentService.createEndUser(
		{
			name: `${PREFIX} entrega a domicilio`,
			internalCode: `${PREFIX}-SHIP-HOME`,
			trackingCode: undefined,
			deliveryMode: "homeDelivery",
			packageIds: [state.homePackageId],
			destinationAddressSnapshot: { label: "Domicilio e2e", city: "CABA" },
		},
		actor,
		db,
	);
	state.homeShipmentId = shipment.id;
	checkEqual(shipment.status, "readyForDispatch", "home shipment on creation");

	const cartItemIds = await cartItemsOfPackage(state.homePackageId);

	await shipmentService.dispatch({ id: state.homeShipmentId }, actor, db);
	await drainOutbox();
	for (const cartItemId of cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"inEndUserShipment",
			`home cart item ${cartItemId} after dispatch`,
		);
	}

	await shipmentService.deliver(
		{ id: state.homeShipmentId, notes: undefined },
		actor,
		db,
	);
	await drainOutbox();
	for (const cartItemId of cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"delivered",
			`home cart item ${cartItemId} after delivery`,
		);
	}

	// The mode's defining behaviour: a home delivery *does* cascade its packages.
	const pkg = await db.package.findUniqueOrThrow({
		where: { id: state.homePackageId },
		select: { status: true },
	});
	checkEqual(pkg.status, "received", "home package after delivery");
});

async function cartItemsOfPackage(packageId: number) {
	const allocations = await db.packageAllocation.findMany({
		where: { packageLotItem: { packageId, status: { not: "cancelled" } } },
		select: { cartItemLotItem: { select: { cartItemId: true } } },
	});
	return [
		...new Set(
			allocations.map((allocation) => allocation.cartItemLotItem.cartItemId),
		),
	];
}

stepFn("8. pickup point — arrival is not a handover", async () => {
	const remaining = state.outboundPackageIds.filter(
		(id) => id !== state.depotPackageId && id !== state.homePackageId,
	);
	if (remaining.length === 0) {
		// Reuse is impossible — every fractionation output is already delivered — so
		// say so rather than silently skipping the asymmetry this run exists to prove.
		failures.push(
			`${currentStep}: no outbound package left for the pickup point`,
		);
		return;
	}
	state.pickupPackageIds = remaining;

	const shipment = await shipmentService.createEndUser(
		{
			name: `${PREFIX} punto de retiro`,
			internalCode: `${PREFIX}-SHIP-PICKUP`,
			trackingCode: undefined,
			deliveryMode: "pickupPoint",
			packageIds: remaining,
			destinationAddressSnapshot: {
				label: "Punto de retiro e2e",
				city: "CABA",
			},
		},
		actor,
		db,
	);
	state.pickupShipmentId = shipment.id;

	const cartItemIds = (
		await Promise.all(remaining.map((id) => cartItemsOfPackage(id)))
	).flat();

	await shipmentService.dispatch({ id: state.pickupShipmentId }, actor, db);
	await drainOutbox();
	await shipmentService.deliver(
		{ id: state.pickupShipmentId, notes: undefined },
		actor,
		db,
	);
	await drainOutbox();

	// The asymmetry asserted **positively**: the shipment arrived, the packages
	// deliberately did not follow, and nobody has been handed anything yet.
	const packages = await db.package.findMany({
		where: { id: { in: remaining } },
		select: { id: true, status: true },
	});
	for (const pkg of packages) {
		checkEqual(
			pkg.status,
			"inTransit",
			`pickup package ${pkg.id} after arrival`,
		);
	}
	for (const cartItemId of cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"inEndUserShipment",
			`pickup cart item ${cartItemId} after arrival`,
		);
	}

	const sweep = await sweepDiagnostics(db);
	check(
		sweep.warnings.some(
			(warning) =>
				warning.code === "shipment.pickupPoint.pendingCollection" &&
				warning.scope.includes(`${PREFIX}-SHIP-PICKUP`),
		),
		"shipment.pickupPoint.pendingCollection did not fire on the arrived shipment",
	);

	for (const packageId of remaining) {
		await packageService.confirmDelivery(
			{ id: packageId, notes: undefined },
			actor,
			db,
		);
	}
	await drainOutbox();

	for (const cartItemId of cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"delivered",
			`pickup cart item ${cartItemId} after collection`,
		);
	}
});

stepFn("9. disruption and recovery on an undisrupted shipment", async () => {
	// `package.recover` refuses while the *shipment* is disrupted, so the package
	// this step disrupts must sit on a healthy one — the seeded fixture that is
	// still `readyForShipment` on a `readyForDispatch` shipment.
	const candidate = await db.package.findFirst({
		where: {
			status: "readyForShipment",
			shipment: {
				status: { in: ["pending", "preparing", "readyForDispatch"] },
			},
			packageLotItems: { some: { status: { not: "cancelled" } } },
		},
		select: { id: true },
	});

	if (!candidate) {
		failures.push(`${currentStep}: no undisrupted package to disrupt`);
		return;
	}

	const cartItemIds = await cartItemsOfPackage(candidate.id);
	const before = await Promise.all(cartItemIds.map(fulfillmentStatusOf));

	await packageService.markDelayed(
		{ id: candidate.id, reason: `${PREFIX} demora simulada` },
		actor,
		db,
	);
	await drainOutbox();
	for (const cartItemId of cartItemIds) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			"exception",
			`cart item ${cartItemId} after the package was delayed`,
		);
	}

	await packageService.recover(
		{ id: candidate.id, notes: undefined },
		actor,
		db,
	);
	await drainOutbox();

	const recovered = await db.package.findUniqueOrThrow({
		where: { id: candidate.id },
		select: { status: true },
	});
	checkEqual(recovered.status, "readyForShipment", "package after recovery");
	for (const [index, cartItemId] of cartItemIds.entries()) {
		checkEqual(
			await fulfillmentStatusOf(cartItemId),
			before[index],
			`cart item ${cartItemId} back to its pre-disruption status`,
		);
	}
});

// ── Steps 10–12: closure, resolution, final sweep ────────────────────────────

stepFn("10. order closure, including the negative case", async () => {
	const orders = await db.userOrder.findMany({
		where: {
			cart: {
				cartItems: {
					some: {
						cartItemLotItems: {
							some: { lotItem: { lot: { operationId: state.operationId } } },
						},
					},
				},
			},
		},
		select: {
			id: true,
			code: true,
			status: true,
			cart: {
				select: {
					cartItems: { select: { id: true, fulfillmentStatus: true } },
				},
			},
		},
	});

	check(orders.length > 0, "the run touched no user order");

	for (const order of orders) {
		const itemStatuses = order.cart.cartItems.map(
			(item) => item.fulfillmentStatus,
		);

		// The same pure rule the projector applies, not a second statement of it —
		// and it is what encodes §20.2's "`rolledOver` is not terminal", so an order
		// still owing re-aggregated demand must stay open.
		const expected = deriveUserOrderClosure({
			currentStatus: "processing",
			itemStatuses,
		});

		if (expected === "completed") {
			checkEqual(order.status, "completed", `order ${order.code} should close`);
			continue;
		}

		check(
			order.status !== "completed",
			`order ${order.code} closed while ${itemStatuses.filter((status) => !terminalFulfillmentStatuses.has(status)).join(", ") || "nothing"} is still not terminal`,
		);
	}
});

stepFn("11. resolve the run's own open roll over", async () => {
	// Scoped to a roll over **this run created**: the seed carries a resolved one
	// from S9 onwards, so "the resolved one" is no longer unambiguous.
	const rollOver = await db.rollOver.findFirst({
		where: { operationId: state.operationId, status: "open" },
		select: { id: true, cartItemId: true },
		orderBy: { id: "asc" },
	});

	if (!rollOver) {
		failures.push(`${currentStep}: the run left no open roll over to resolve`);
		return;
	}

	state.resolvedRollOverId = rollOver.id;
	await rollOverService.resolve(
		{ id: rollOver.id, reason: `${PREFIX} resuelto sin entrega` },
		actor,
		db,
	);
	await drainOutbox();

	const after = await db.rollOver.findUniqueOrThrow({
		where: { id: rollOver.id },
		select: { status: true },
	});
	checkEqual(after.status, "resolved", "roll over after resolution");

	const remaining = await db.cartItemLotItem.count({
		where: {
			cartItemId: rollOver.cartItemId,
			quantity: { gt: 0 },
			lotItem: {
				status: { not: "cancelled" },
				lot: { status: { not: "cancelled" } },
			},
		},
	});
	const openRollOvers = await db.rollOver.count({
		where: { cartItemId: rollOver.cartItemId, status: "open" },
	});

	// Only a lineage with nothing live left derives `cancelled`; a partially cut
	// item keeps its ladder position, which is correct and worth not mis-asserting.
	if (remaining === 0 && openRollOvers === 0) {
		checkEqual(
			await fulfillmentStatusOf(rollOver.cartItemId),
			"cancelled",
			`cart item ${rollOver.cartItemId} after resolution`,
		);
	}
});

stepFn("12. final sweep — no critical anywhere", async () => {
	const sweep = await assertNoCriticals("final sweep");
	console.log(
		`     swept ${sweep.counts.operations} operations, ${sweep.counts.lots} lots, ` +
			`${sweep.counts.supplierOrders} supplier orders, ${sweep.counts.packages} packages, ` +
			`${sweep.counts.shipments} shipments, ${sweep.counts.carrierOrders} carrier orders`,
	);
	for (const [code, count] of summarizeWarnings(sweep.warnings)) {
		console.log(`     warning ${code} ×${count}`);
	}
});

/**
 * The production path end to end, over its own window: create a draft, review it,
 * omit one demand item, refuse a stale execution, then execute. Step 1 keeps
 * using `createAndExecute` — which is now a wrapper over these same commands, so
 * the two together pin that there is exactly one materialization path.
 */
stepFn("13. draft → review → omit → execute", async () => {
	const destination = await db.destination.findFirstOrThrow({
		where: { active: true, deleted: false },
		select: { id: true },
	});

	const draft = await operationService.createDraft(
		{
			from: DRAFT_FROM.toISOString(),
			to: DRAFT_TO.toISOString(),
			destinationId: destination.id,
			includeRollOver: false,
			strategy: "fifo",
			notes: DRAFT_NOTE,
		},
		actor,
		db,
	);

	checkEqual(draft.status, "draft", "draft status");
	checkEqual(draft.lotCount, 0, "a draft must materialize nothing");
	checkEqual(draft.eligibleItemCount, 0, "a draft carries no counters");

	const review = await operationService.review(draft.id, db);
	check(review.rows.length > 0, "the draft window carries no demand to review");
	if (review.rows.length === 0) return;

	// A cart item that appears exactly once, so "no allocation afterwards" is an
	// unambiguous statement about the omission rather than about a sibling row.
	const rowsByCartItem = new Map<number, number>();
	for (const row of review.rows) {
		rowsByCartItem.set(
			row.cartItemId,
			(rowsByCartItem.get(row.cartItemId) ?? 0) + 1,
		);
	}
	const omitted =
		review.rows.find(
			(row) =>
				rowsByCartItem.get(row.cartItemId) === 1 &&
				Number(row.assignedQuantity) > 0,
		) ?? review.rows.find((row) => rowsByCartItem.get(row.cartItemId) === 1);

	check(omitted !== undefined, "no single-row cart item to omit");
	if (!omitted) return;

	const afterOmission = await operationService.updateDraft(
		{
			id: draft.id,
			omissions: { sourceKeys: [omitted.sourceKey], userIds: [] },
		},
		actor,
		db,
	);

	checkEqual(
		afterOmission.rows.find((row) => row.sourceKey === omitted.sourceKey)
			?.omitted,
		true,
		"the omitted row is not flagged",
	);
	checkEqual(
		afterOmission.totals.eligibleItemCount,
		review.totals.eligibleItemCount - 1,
		"eligible count after omitting one item",
	);
	check(
		afterOmission.fingerprint !== review.fingerprint,
		"omitting an item left the fingerprint unchanged",
	);

	// The stale-review refusal: the pre-omission fingerprint no longer describes
	// what would run, so execution must be refused with nothing written (ADR 0006).
	let refusal: unknown;
	try {
		await operationService.execute(
			{ id: draft.id, fingerprint: review.fingerprint },
			actor,
			db,
		);
	} catch (error) {
		refusal = error;
	}
	check(
		refusal instanceof AdminCrudError && refusal.code === "CONFLICT",
		"a stale fingerprint did not produce a CONFLICT",
	);
	checkEqual(
		(
			await db.operation.findUniqueOrThrow({
				where: { id: draft.id },
				select: { status: true },
			})
		).status,
		"draft",
		"a refused execution must leave the operation a draft",
	);

	const executed = await operationService.execute(
		{ id: draft.id, fingerprint: afterOmission.fingerprint },
		actor,
		db,
	);
	await drainOutbox();

	checkEqual(executed.status, "completed", "executed draft status");
	checkEqual(
		executed.lotCount,
		afterOmission.totals.lotCount,
		"the review's lot count did not match what execution produced",
	);

	// An omission writes nothing: no allocation, no roll over, and the demand stays
	// exactly where it was so the next operation picks it up (ADR 0005).
	checkEqual(
		await db.cartItemLotItem.count({
			where: {
				cartItemId: omitted.cartItemId,
				lotItem: { lot: { operationId: draft.id } },
			},
		}),
		0,
		"the omitted item was allocated",
	);
	checkEqual(
		await db.rollOver.count({
			where: { cartItemId: omitted.cartItemId, operationId: draft.id },
		}),
		0,
		"the omitted item produced a roll over",
	);

	const stillAggregable = await db.userOrderItem.count({
		where: {
			id: Number(omitted.sourceKey.split(":")[1]),
			sourceCartItem: {
				deleted: false,
				status: "submitted",
				cart: { deleted: false, status: "submitted" },
				cartItemLotItems: {
					none: {
						lotItem: {
							status: { not: "cancelled" },
							lot: { status: { not: "cancelled" } },
						},
					},
				},
				rollOvers: { none: { status: "open" } },
			},
		},
	});
	checkEqual(stillAggregable, 1, "the omitted demand is no longer aggregable");

	await assertNoCriticals("draft review run");
});

// ── Teardown ─────────────────────────────────────────────────────────────────

/**
 * Everything the run created, in FK order. Scoped by the `E2E-` prefix plus the
 * operation the run built, because the commands mint rows (roll overs, packages,
 * allocations) that carry no code of their own.
 */
async function teardown() {
	const operations = await db.operation.findMany({
		where: { notes: { in: [HARNESS_NOTE, DRAFT_NOTE] } },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);
	// `in: []` matches nothing, so an aborted run with no operation still deletes
	// cleanly instead of needing a sentinel id.
	const ownedByRun = { in: operationIds };

	const lots = await db.lot.findMany({
		where: { operationId: ownedByRun },
		select: { id: true, supplierOrderId: true },
	});
	const lotIds = lots.map((lot) => lot.id);
	const supplierOrderIds = [
		...new Set(
			lots
				.map((lot) => lot.supplierOrderId)
				.filter((id): id is number => id !== null),
		),
	];

	const lotItems = await db.lotItem.findMany({
		where: { lotId: { in: lotIds } },
		select: { id: true },
	});
	const lotItemIds = lotItems.map((lotItem) => lotItem.id);

	const packageLotItems = await db.packageLotItem.findMany({
		where: { lotItemId: { in: lotItemIds } },
		select: { id: true, packageId: true },
	});
	const packageIds = [
		...new Set(packageLotItems.map((line) => line.packageId)),
	];
	const shipments = await db.shipment.findMany({
		where: { internalCode: { startsWith: `${PREFIX}-` } },
		select: { id: true },
	});
	const shipmentIds = shipments.map((shipment) => shipment.id);

	const cartItemLotItems = await db.cartItemLotItem.findMany({
		where: { lotItemId: { in: lotItemIds } },
		select: { id: true, cartItemId: true },
	});
	const cartItemIds = [
		...new Set(cartItemLotItems.map((allocation) => allocation.cartItemId)),
	];

	await db.cartItemTrackingEvent.deleteMany({
		where: {
			OR: [
				{ operationId: ownedByRun },
				{ lotId: { in: lotIds } },
				{ lotItemId: { in: lotItemIds } },
				{ packageId: { in: packageIds } },
				{ shipmentId: { in: shipmentIds } },
				{ rollOver: { operationId: ownedByRun } },
			],
		},
	});
	await db.packageAllocation.deleteMany({
		where: { packageLotItem: { lotItemId: { in: lotItemIds } } },
	});
	await db.packageLotItem.deleteMany({
		where: { lotItemId: { in: lotItemIds } },
	});
	await db.package.deleteMany({ where: { id: { in: packageIds } } });
	await db.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
	await db.cartItemLotItem.deleteMany({
		where: { lotItemId: { in: lotItemIds } },
	});
	await db.rollOver.deleteMany({ where: { operationId: ownedByRun } });
	await db.lotItem.deleteMany({ where: { id: { in: lotItemIds } } });
	await db.lot.deleteMany({ where: { id: { in: lotIds } } });
	await db.operation.deleteMany({ where: { id: ownedByRun } });
	await db.supplierTransaction.deleteMany({
		where: { supplierOrderId: { in: supplierOrderIds } },
	});
	await db.supplierOrder.deleteMany({
		where: { id: { in: supplierOrderIds } },
	});
	await db.auditLog.deleteMany({
		where: { actorReference: actor?.id, createdAt: { gte: RUN_STARTED_AT } },
	});
	await db.domainEventOutbox.deleteMany({
		where: { createdAt: { gte: RUN_STARTED_AT } },
	});

	// The commands the run drove moved these items forward; the seed owns their
	// stored status, so put them back where a fresh seed left them.
	if (cartItemIds.length > 0) {
		await db.cartItem.updateMany({
			where: { id: { in: cartItemIds } },
			data: { fulfillmentStatus: "awaitingAggregation" },
		});
	}
	await db.userOrder.updateMany({
		where: { cart: { cartItems: { some: { id: { in: cartItemIds } } } } },
		data: { status: "processing" },
	});

	return {
		operations: operationIds.length,
		lots: lotIds.length,
		packages: packageIds.length,
		shipments: shipmentIds.length,
	};
}

async function main() {
	console.log(`Fulfillment end-to-end run (prefix ${PREFIX}-)\n`);

	const operator = await db.user.findFirstOrThrow({
		where: { role: { in: ["admin", "superadmin"] }, deleted: false },
		select: { id: true, name: true },
		orderBy: { id: "asc" },
	});
	actor = { id: operator.id, name: operator.name, role: "admin" };

	try {
		for (const step of steps) {
			currentStep = step.name;
			const startedAt = Date.now();
			const before = failures.length;
			await step.run();
			const outcome = failures.length === before ? "ok  " : "FAIL";
			console.log(`  ${outcome} ${step.name} — ${Date.now() - startedAt}ms`);
		}
	} finally {
		currentStep = "teardown";
		const removed = await teardown();
		console.log(
			`\n  teardown removed ${removed.operations} operation(s), ${removed.lots} lot(s), ` +
				`${removed.packages} package(s), ${removed.shipments} shipment(s)`,
		);
	}

	if (failures.length > 0) {
		console.error(`\n${failures.length} assertion failure(s):`);
		for (const failure of failures) console.error(`  ✗ ${failure}`);
		process.exitCode = 1;
		return;
	}

	console.log("\nAll thirteen steps passed.");
}

main()
	.catch((error) => {
		console.error("Harness failed");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
