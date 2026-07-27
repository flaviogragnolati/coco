import type { CartItemFulfillmentStatus } from "~/prisma/client";
import { Prisma } from "~/prisma/client";
import {
	fulfillmentStageRank,
	stageByLotItemStatus,
	stageBySupplierOrderStatus,
} from "~/shared/common/fulfillment-transitions";
import type { AdminTrackingStageKey } from "~/shared/common/tracking-display";
import type {
	FulfillmentAllocationSnapshot,
	FulfillmentLineageSnapshot,
	FulfillmentPackagedAllocationSnapshot,
} from "./fulfillment-lineage.data";

function zero() {
	return new Prisma.Decimal(0);
}

function sumQuantities(values: Prisma.Decimal[]): Prisma.Decimal {
	return values.reduce<Prisma.Decimal>((sum, value) => sum.plus(value), zero());
}

function isLiveAllocation(allocation: FulfillmentAllocationSnapshot) {
	return (
		allocation.lotItemStatus !== "cancelled" &&
		allocation.lotStatus !== "cancelled"
	);
}

function isLivePackagedAllocation(
	packaged: FulfillmentPackagedAllocationSnapshot,
) {
	return (
		packaged.packageLineStatus !== "cancelled" &&
		packaged.packageStatus !== "cancelled"
	);
}

function livePackagedAllocations(snapshot: FulfillmentLineageSnapshot) {
	return snapshot.allocations
		.filter(isLiveAllocation)
		.flatMap((allocation) =>
			allocation.packagedAllocations.filter(isLivePackagedAllocation),
		);
}

function isDisrupted(packaged: FulfillmentPackagedAllocationSnapshot) {
	return (
		packaged.packageStatus === "delayed" ||
		packaged.packageStatus === "failed" ||
		packaged.shipmentStatus === "delayed" ||
		packaged.shipmentStatus === "failed"
	);
}

function hasArrived(packaged: FulfillmentPackagedAllocationSnapshot) {
	return (
		packaged.packageStatus === "received" ||
		packaged.shipmentStatus === "received"
	);
}

/**
 * Whether the goods physically left. The leg picks the branch; how far along the
 * package is decides the stage — without this split a package would derive
 * `inInternalShipment` the moment it is created and `packaged` would stay
 * unreachable, which is exactly what the two-step dispatch exists to avoid.
 *
 * `delayed`/`failed` count as departed. `isDisrupted` short-circuits to
 * `exception` before this runs, so it only affects the roll over overlay
 * comparison, where disrupted quantity has indeed left.
 */
const departedStatuses: ReadonlySet<string> = new Set([
	"inTransit",
	"received",
	"delayed",
	"failed",
]);

function hasDeparted(packaged: FulfillmentPackagedAllocationSnapshot) {
	return (
		departedStatuses.has(packaged.packageStatus) ||
		(packaged.shipmentStatus !== null &&
			departedStatuses.has(packaged.shipmentStatus))
	);
}

/**
 * `packaged` is the **inbound-before-departure** stage: goods boxed at the
 * supplier and not yet moving. An *outbound* package that has not departed is a
 * different fact — it was fractionated or promoted from goods that already
 * arrived, so it is sitting at the destination, which is what `atWarehouse`
 * means. Returning `packaged` there would walk the customer's journey backwards.
 */
function packagedStage(
	packaged: FulfillmentPackagedAllocationSnapshot,
): AdminTrackingStageKey {
	if (packaged.leg === "outbound") {
		if (hasArrived(packaged)) return "delivered";
		return hasDeparted(packaged) ? "inEndUserShipment" : "atWarehouse";
	}

	if (hasArrived(packaged)) return "atWarehouse";
	return hasDeparted(packaged) ? "inInternalShipment" : "packaged";
}

function supplierStage(
	allocations: FulfillmentAllocationSnapshot[],
): AdminTrackingStageKey | undefined {
	let furthest: AdminTrackingStageKey | undefined;

	for (const allocation of allocations) {
		const stage =
			stageByLotItemStatus[allocation.lotItemStatus] ??
			(allocation.supplierOrderStatus
				? stageBySupplierOrderStatus[allocation.supplierOrderStatus]
				: undefined);

		if (!stage) continue;
		if (
			!furthest ||
			fulfillmentStageRank(stage) > fulfillmentStageRank(furthest)
		)
			furthest = stage;
	}

	return furthest;
}

function deriveStage(
	snapshot: FulfillmentLineageSnapshot,
): AdminTrackingStageKey {
	const liveAllocations = snapshot.allocations.filter(isLiveAllocation);
	const packaged = livePackagedAllocations(snapshot);

	// The furthest stage any live packaged allocation backs wins, exactly as
	// `supplierStage` resolves several lot lines: a lineage that is half received
	// and half still packed has reached the further of the two.
	let furthestPackaged: AdminTrackingStageKey | undefined;
	for (const entry of packaged) {
		const stage = packagedStage(entry);
		if (
			!furthestPackaged ||
			fulfillmentStageRank(stage) > fulfillmentStageRank(furthestPackaged)
		) {
			furthestPackaged = stage;
		}
	}
	if (furthestPackaged) return furthestPackaged;

	const fromSupplier = supplierStage(liveAllocations);
	if (fromSupplier) return fromSupplier;

	if (liveAllocations.length > 0) return "allocatedToSupplierItem";
	// Cancelled roll overs are compensation debris, not evidence of membership in
	// an operation: counting them would strand a compensated item at
	// `includedInOperation` instead of letting it fall back to the queue.
	if (snapshot.rollOvers.some((rollOver) => rollOver.status !== "cancelled")) {
		return "includedInOperation";
	}

	return "awaitingAggregation";
}

export function deriveFulfillmentStatus(
	snapshot: FulfillmentLineageSnapshot,
): CartItemFulfillmentStatus {
	if (snapshot.cartItem.deleted || snapshot.cartItem.status === "cancelled") {
		return "cancelled";
	}

	if (livePackagedAllocations(snapshot).some(isDisrupted)) return "exception";

	const openRollOvers = snapshot.rollOvers.filter(
		(rollOver) => rollOver.status === "open",
	);
	const liveAllocations = snapshot.allocations.filter(isLiveAllocation);

	// Resolving a roll over is a terminal decision that moves no money (ADR 0005):
	// the demand is settled and must read terminal. Without this it fell through to
	// `deriveStage`'s `includedInOperation` floor, which regressed the item from
	// `rolledOver` and left its order permanently uncloseable.
	//
	// Placed after the `exception` short-circuit (a disrupted lineage is an
	// exception first) and before the roll over overlay (an item carrying both an
	// open and a resolved roll over is still `rolledOver`).
	if (
		liveAllocations.length === 0 &&
		livePackagedAllocations(snapshot).length === 0 &&
		openRollOvers.length === 0 &&
		snapshot.rollOvers.some((rollOver) => rollOver.status === "resolved")
	) {
		return "cancelled";
	}

	const openRollOverQuantity = sumQuantities(
		openRollOvers.map((rollOver) => rollOver.quantity),
	);
	const liveAllocatedQuantity = sumQuantities(
		liveAllocations.map((allocation) => allocation.quantity),
	);

	const stage = deriveStage(snapshot);

	if (openRollOverQuantity.greaterThan(zero())) {
		if (liveAllocatedQuantity.isZero()) return "rolledOver";
		if (fulfillmentStageRank(stage) < fulfillmentStageRank("packaged")) {
			return "partiallyRolledOver";
		}
	}

	return stage;
}
