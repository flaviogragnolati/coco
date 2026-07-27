import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type {
	FulfillmentAllocationSnapshot,
	FulfillmentLineageSnapshot,
	FulfillmentPackagedAllocationSnapshot,
} from "./fulfillment-lineage.data";
import { deriveFulfillmentStatus } from "./fulfillment-status.derivation";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

function snapshot(
	overrides: Partial<FulfillmentLineageSnapshot> = {},
): FulfillmentLineageSnapshot {
	return {
		cartItem: { id: 1, deleted: false, status: "submitted" },
		rollOvers: [],
		allocations: [],
		...overrides,
	};
}

function allocation(
	overrides: Partial<FulfillmentAllocationSnapshot> = {},
): FulfillmentAllocationSnapshot {
	return {
		quantity: decimal("10"),
		lotItemStatus: "pending",
		lotStatus: "assembling",
		supplierOrderStatus: null,
		packagedAllocations: [],
		...overrides,
	};
}

function packaged(
	overrides: Partial<FulfillmentPackagedAllocationSnapshot> = {},
): FulfillmentPackagedAllocationSnapshot {
	return {
		quantity: decimal("10"),
		packageLineStatus: "packed",
		packageStatus: "packing",
		leg: "inbound",
		shipmentStatus: null,
		...overrides,
	};
}

/** Seed lineage: allocation → lot item `requested` → supplier order `requested`. */
const tomateSnapshot = snapshot({
	allocations: [
		allocation({
			quantity: decimal("80"),
			lotItemStatus: "requested",
			lotStatus: "requested",
			supplierOrderStatus: "requested",
		}),
	],
});

/** Seed lineage: outbound package `received` on a shipment `received`. */
const quesoSnapshot = snapshot({
	allocations: [
		allocation({
			quantity: decimal("20"),
			lotItemStatus: "completed",
			lotStatus: "completed",
			supplierOrderStatus: "completed",
			packagedAllocations: [
				packaged({
					quantity: decimal("20"),
					packageLineStatus: "received",
					packageStatus: "received",
					leg: "outbound",
					shipmentStatus: "received",
				}),
			],
		}),
	],
});

const dulceSnapshot = snapshot({
	allocations: [
		allocation({
			quantity: decimal("12"),
			lotItemStatus: "completed",
			lotStatus: "completed",
			supplierOrderStatus: "completed",
			packagedAllocations: [
				packaged({
					quantity: decimal("12"),
					packageLineStatus: "received",
					packageStatus: "received",
					leg: "outbound",
					shipmentStatus: "received",
				}),
			],
		}),
	],
});

/** Seed lineage: outbound package `delayed` on a shipment `delayed`. */
const manzanaSnapshot = snapshot({
	allocations: [
		allocation({
			quantity: decimal("50"),
			lotItemStatus: "readyForPackaging",
			lotStatus: "readyForPackaging",
			supplierOrderStatus: "readyForReceipt",
			packagedAllocations: [
				packaged({
					quantity: decimal("50"),
					packageLineStatus: "shipped",
					packageStatus: "delayed",
					leg: "outbound",
					shipmentStatus: "delayed",
				}),
			],
		}),
	],
});

/**
 * Seed lineage: inbound package `received` on a shipment `received`, plus an
 * open pre-allocation roll over of 4 against a live allocation of 6.
 */
const arrozSnapshot = snapshot({
	rollOvers: [{ status: "open", quantity: decimal("4") }],
	allocations: [
		allocation({
			quantity: decimal("6"),
			lotItemStatus: "readyForPackaging",
			lotStatus: "readyForPackaging",
			supplierOrderStatus: "readyForReceipt",
			packagedAllocations: [
				packaged({
					quantity: decimal("6"),
					packageLineStatus: "received",
					packageStatus: "received",
					leg: "inbound",
					shipmentStatus: "received",
				}),
			],
		}),
	],
});

test("a supplier-requested lineage derives requestedFromSupplier", () => {
	expect(deriveFulfillmentStatus(tomateSnapshot)).toBe("requestedFromSupplier");
});

test("an outbound received lineage derives delivered", () => {
	expect(deriveFulfillmentStatus(quesoSnapshot)).toBe("delivered");
	expect(deriveFulfillmentStatus(dulceSnapshot)).toBe("delivered");
});

test("a delayed outbound lineage derives exception", () => {
	expect(deriveFulfillmentStatus(manzanaSnapshot)).toBe("exception");
});

test("an inbound received lineage with an open roll over derives atWarehouse", () => {
	// The seed still stores `partiallyRolledOver` for this fixture; seeds are
	// realigned after all fulfillment phases land.
	expect(deriveFulfillmentStatus(arrozSnapshot)).toBe("atWarehouse");
});

test("a lineage with no backing record floors at awaitingAggregation", () => {
	expect(deriveFulfillmentStatus(snapshot())).toBe("awaitingAggregation");
});

test("a cancelled request outranks a fully delivered lineage", () => {
	expect(
		deriveFulfillmentStatus({
			...quesoSnapshot,
			cartItem: { id: 1, deleted: false, status: "cancelled" },
		}),
	).toBe("cancelled");
	expect(
		deriveFulfillmentStatus({
			...quesoSnapshot,
			cartItem: { id: 1, deleted: true, status: "submitted" },
		}),
	).toBe("cancelled");
});

test("an exception outranks an open roll over", () => {
	expect(
		deriveFulfillmentStatus({
			...manzanaSnapshot,
			rollOvers: [{ status: "open", quantity: decimal("5") }],
		}),
	).toBe("exception");
});

test("an open roll over below packaged derives partiallyRolledOver", () => {
	const supplierConfirmed = snapshot({
		rollOvers: [{ status: "open", quantity: decimal("4") }],
		allocations: [
			allocation({
				quantity: decimal("6"),
				lotItemStatus: "confirmed",
				lotStatus: "confirmed",
				supplierOrderStatus: "confirmed",
			}),
		],
	});

	expect(deriveFulfillmentStatus(supplierConfirmed)).toBe(
		"partiallyRolledOver",
	);

	const packagedInstead = snapshot({
		rollOvers: supplierConfirmed.rollOvers,
		allocations: [
			allocation({
				quantity: decimal("6"),
				lotItemStatus: "confirmed",
				lotStatus: "confirmed",
				supplierOrderStatus: "confirmed",
				packagedAllocations: [packaged({ quantity: decimal("6") })],
			}),
		],
	});

	expect(deriveFulfillmentStatus(packagedInstead)).toBe("packaged");
});

test("an open roll over with no live allocation derives rolledOver", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({ rollOvers: [{ status: "open", quantity: decimal("10") }] }),
		),
	).toBe("rolledOver");
});

test("a resolved roll over leaves the ladder untouched", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({
				rollOvers: [{ status: "rebatched", quantity: decimal("4") }],
				allocations: [
					allocation({
						lotItemStatus: "confirmed",
						lotStatus: "confirmed",
						supplierOrderStatus: "confirmed",
					}),
				],
			}),
		),
	).toBe("supplierConfirmed");
});

test("an exception clears once no delayed or failed record remains", () => {
	const resolved = snapshot({
		allocations: [
			allocation({
				quantity: decimal("50"),
				lotItemStatus: "readyForPackaging",
				lotStatus: "readyForPackaging",
				supplierOrderStatus: "readyForReceipt",
				packagedAllocations: [
					packaged({
						quantity: decimal("50"),
						packageLineStatus: "shipped",
						packageStatus: "inTransit",
						leg: "outbound",
						shipmentStatus: "inTransit",
					}),
				],
			}),
		],
	});

	expect(deriveFulfillmentStatus(resolved)).toBe("inEndUserShipment");
});

test("cancelled lot lines are ignored as evidence", () => {
	const cancelledLotItem = snapshot({
		allocations: [
			allocation({
				lotItemStatus: "cancelled",
				lotStatus: "requested",
				supplierOrderStatus: "requested",
			}),
		],
	});

	expect(deriveFulfillmentStatus(cancelledLotItem)).toBe("awaitingAggregation");

	const cancelledLot = snapshot({
		allocations: [
			allocation({
				lotItemStatus: "requested",
				lotStatus: "cancelled",
				supplierOrderStatus: "requested",
			}),
		],
	});

	expect(deriveFulfillmentStatus(cancelledLot)).toBe("awaitingAggregation");
});

test("cancelled package lines are ignored as evidence", () => {
	const cancelledPackage = snapshot({
		allocations: [
			allocation({
				lotItemStatus: "completed",
				lotStatus: "completed",
				supplierOrderStatus: "completed",
				packagedAllocations: [
					packaged({
						packageLineStatus: "cancelled",
						packageStatus: "received",
						leg: "outbound",
						shipmentStatus: "received",
					}),
				],
			}),
		],
	});

	expect(deriveFulfillmentStatus(cancelledPackage)).toBe("supplierConfirmed");
});

test("a lot item still pending falls back to its supplier order stage", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({
				allocations: [
					allocation({
						lotItemStatus: "pending",
						lotStatus: "requested",
						supplierOrderStatus: "requested",
					}),
				],
			}),
		),
	).toBe("requestedFromSupplier");

	expect(
		deriveFulfillmentStatus(
			snapshot({
				allocations: [
					allocation({
						lotItemStatus: "pending",
						lotStatus: "assembling",
						supplierOrderStatus: "pending",
					}),
				],
			}),
		),
	).toBe("allocatedToSupplierItem");
});

test("a roll over row with no live allocation derives includedInOperation", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({
				rollOvers: [{ status: "rebatched", quantity: decimal("10") }],
			}),
		),
	).toBe("includedInOperation");
});

function packagedLineage(
	overrides: Partial<FulfillmentPackagedAllocationSnapshot>,
) {
	return snapshot({
		allocations: [
			allocation({
				lotItemStatus: "readyForPackaging",
				lotStatus: "readyForPackaging",
				supplierOrderStatus: "readyForReceipt",
				packagedAllocations: [packaged(overrides)],
			}),
		],
	});
}

test.each([
	["inbound", "readyForShipment", null, "packaged"],
	["inbound", "readyForShipment", "inTransit", "inInternalShipment"],
	["inbound", "inTransit", null, "inInternalShipment"],
	["inbound", "received", null, "atWarehouse"],
	// A promoted or fractionated package that has not left is at the destination,
	// not back at `packaged` — that stage belongs to the inbound leg.
	["outbound", "readyForShipment", null, "atWarehouse"],
	["outbound", "inTransit", null, "inEndUserShipment"],
	// Depot pickup: an outbound package received without a shipment is delivered.
	["outbound", "received", null, "delivered"],
] as const)("a %s package at %s with shipment %s derives %s", (leg, packageStatus, shipmentStatus, expected) => {
	expect(
		deriveFulfillmentStatus(
			packagedLineage({
				leg,
				packageStatus,
				shipmentStatus,
				packageLineStatus: packageStatus === "received" ? "received" : "packed",
			}),
		),
	).toBe(expected);
});

test("the furthest packaged stage wins across legs", () => {
	// What fractionation produces: the inbound package stays as arrival history and
	// the outbound one carries the same demand. Neither is ahead of the other, and
	// the item must read `atWarehouse` — never `delivered`.
	const mixed = snapshot({
		allocations: [
			allocation({
				lotItemStatus: "readyForPackaging",
				lotStatus: "readyForPackaging",
				supplierOrderStatus: "readyForReceipt",
				packagedAllocations: [
					packaged({ leg: "inbound", packageStatus: "received" }),
					packaged({ leg: "outbound", packageStatus: "readyForShipment" }),
				],
			}),
		],
	});

	expect(deriveFulfillmentStatus(mixed)).toBe("atWarehouse");
});

test("a promoted package does not fabricate a delivery", () => {
	// Promotion keeps the package row and flips its leg, so the *only* thing
	// standing between it and `delivered` is `packagedStage`'s outbound fallback.
	const promoted = snapshot({
		allocations: [
			allocation({
				lotItemStatus: "readyForPackaging",
				lotStatus: "readyForPackaging",
				supplierOrderStatus: "completed",
				packagedAllocations: [
					packaged({
						leg: "outbound",
						packageStatus: "readyForShipment",
						packageLineStatus: "received",
					}),
				],
			}),
		],
	});

	expect(deriveFulfillmentStatus(promoted)).toBe("atWarehouse");
});

test("an outbound package moves the roll over overlay past its threshold", () => {
	// `atWarehouse` outranks `packaged`, so a partially rolled-over item with an
	// outbound package reads the ladder rather than `partiallyRolledOver`. That is
	// the intended rule — once the live part reaches `packaged` or beyond, the
	// ladder wins — and it changed the moment outbound-not-departed moved up.
	const partiallyRolledOver = snapshot({
		rollOvers: [{ status: "open", quantity: decimal("4") }],
		allocations: [
			allocation({
				quantity: decimal("6"),
				lotItemStatus: "readyForPackaging",
				lotStatus: "readyForPackaging",
				supplierOrderStatus: "completed",
				packagedAllocations: [
					packaged({
						quantity: decimal("6"),
						leg: "outbound",
						packageStatus: "readyForShipment",
					}),
				],
			}),
		],
	});

	expect(deriveFulfillmentStatus(partiallyRolledOver)).toBe("atWarehouse");
});

test("a departed package outranks an open roll over overlay", () => {
	// `inInternalShipment` sits above `packaged`, so the ladder wins and the open
	// roll over is communicated as a journey notice instead (architecture §11).
	const departedWithRollOver = {
		...packagedLineage({ leg: "inbound", packageStatus: "inTransit" }),
		rollOvers: [{ status: "open" as const, quantity: decimal("4") }],
	};

	expect(deriveFulfillmentStatus(departedWithRollOver)).toBe(
		"inInternalShipment",
	);
});

test("derivation is idempotent for the same snapshot", () => {
	for (const fixture of [
		tomateSnapshot,
		quesoSnapshot,
		manzanaSnapshot,
		arrozSnapshot,
	]) {
		expect(deriveFulfillmentStatus(fixture)).toBe(
			deriveFulfillmentStatus(fixture),
		);
	}
});

test("a fully compensated lineage falls back to awaiting aggregation", () => {
	// Compensation cancels the allocations and its own roll overs; nothing live
	// remains, so the item must re-enter the queue rather than stick in operation.
	expect(
		deriveFulfillmentStatus(
			snapshot({
				allocations: [
					allocation({
						lotItemStatus: "cancelled",
						lotStatus: "cancelled",
						supplierOrderStatus: "cancelled",
					}),
				],
				rollOvers: [{ status: "cancelled", quantity: decimal("2") }],
			}),
		),
	).toBe("awaitingAggregation");
});

test("a roll over reverted to open by a compensation reads as rolled over", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({
				allocations: [
					allocation({
						lotItemStatus: "cancelled",
						lotStatus: "cancelled",
						supplierOrderStatus: "cancelled",
					}),
				],
				rollOvers: [{ status: "open", quantity: decimal("5") }],
			}),
		),
	).toBe("rolledOver");
});

/** Nothing live left, and the only roll over was settled by an operator decision. */
const resolvedRollOverSnapshot = snapshot({
	allocations: [
		allocation({
			lotItemStatus: "cancelled",
			lotStatus: "cancelled",
			supplierOrderStatus: "cancelled",
		}),
	],
	rollOvers: [{ status: "resolved", quantity: decimal("5") }],
});

test("a resolved roll over with nothing live derives cancelled, not includedInOperation", () => {
	expect(deriveFulfillmentStatus(resolvedRollOverSnapshot)).toBe("cancelled");
});

test("an open roll over alongside a resolved one still reads as rolled over", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({
				...resolvedRollOverSnapshot,
				rollOvers: [
					{ status: "resolved", quantity: decimal("5") },
					{ status: "open", quantity: decimal("3") },
				],
			}),
		),
	).toBe("rolledOver");
});

test("a delivered lineage carrying an earlier resolved roll over is still delivered", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({
				allocations: [
					allocation({
						lotItemStatus: "completed",
						lotStatus: "completed",
						supplierOrderStatus: "completed",
						packagedAllocations: [
							packaged({ leg: "outbound", packageStatus: "received" }),
						],
					}),
				],
				rollOvers: [{ status: "resolved", quantity: decimal("2") }],
			}),
		),
	).toBe("delivered");
});

test("a disrupted lineage with a resolved roll over is an exception first", () => {
	expect(
		deriveFulfillmentStatus(
			snapshot({
				allocations: [
					allocation({
						packagedAllocations: [packaged({ packageStatus: "failed" })],
					}),
				],
				rollOvers: [{ status: "resolved", quantity: decimal("2") }],
			}),
		),
	).toBe("exception");
});

test("a pickup-point arrival keeps its packages in the end-user shipment", () => {
	// `shipment.deliver` marks only the shipment `received` on the pickup-point
	// path; each customer's `package.confirmDelivery` is what produces `delivered`
	// (§8). Reading the shipment as the arrival claimed a handover that has not
	// happened.
	const atPickupPoint = snapshot({
		allocations: [
			allocation({
				lotItemStatus: "readyForPackaging",
				lotStatus: "readyForPackaging",
				supplierOrderStatus: "completed",
				packagedAllocations: [
					packaged({
						leg: "outbound",
						packageLineStatus: "shipped",
						packageStatus: "inTransit",
						shipmentStatus: "received",
					}),
				],
			}),
		],
	});

	expect(deriveFulfillmentStatus(atPickupPoint)).toBe("inEndUserShipment");

	const collected = snapshot({
		allocations: [
			allocation({
				lotItemStatus: "readyForPackaging",
				lotStatus: "readyForPackaging",
				supplierOrderStatus: "completed",
				packagedAllocations: [
					packaged({
						leg: "outbound",
						packageLineStatus: "received",
						packageStatus: "received",
						shipmentStatus: "received",
					}),
				],
			}),
		],
	});

	expect(deriveFulfillmentStatus(collected)).toBe("delivered");
});
