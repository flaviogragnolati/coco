import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import {
	fractionableQuantity,
	outboundPackagedQuantity,
	type PackagedAllocationRecord,
	packagedAllocationFractionableQuantity,
	receivedInboundQuantity,
} from "./package.data";

function packaged(input: {
	quantity: string;
	leg: "inbound" | "outbound";
	packageStatus: string;
	lineStatus?: string;
	sourcePackageId?: number | null;
	packageId?: number;
}): PackagedAllocationRecord {
	return {
		quantity: new Prisma.Decimal(input.quantity),
		sourcePackageId: input.sourcePackageId ?? null,
		packageLotItem: {
			status: (input.lineStatus ??
				"received") as PackagedAllocationRecord["packageLotItem"]["status"],
			package: {
				id: input.packageId ?? 0,
				status:
					input.packageStatus as PackagedAllocationRecord["packageLotItem"]["package"]["status"],
				leg: input.leg,
			},
		},
	};
}

test("only received inbound packaging counts as arrived", () => {
	const allocation = {
		packageAllocations: [
			packaged({ quantity: "10", leg: "inbound", packageStatus: "received" }),
			packaged({ quantity: "4", leg: "inbound", packageStatus: "inTransit" }),
		],
	};

	expect(receivedInboundQuantity(allocation).toString()).toBe("10");
});

test("cancelled packages and cancelled lines are excluded on both legs", () => {
	const allocation = {
		packageAllocations: [
			packaged({ quantity: "10", leg: "inbound", packageStatus: "received" }),
			packaged({ quantity: "5", leg: "inbound", packageStatus: "cancelled" }),
			packaged({
				quantity: "5",
				leg: "inbound",
				packageStatus: "received",
				lineStatus: "cancelled",
			}),
			packaged({
				quantity: "3",
				leg: "outbound",
				packageStatus: "readyForShipment",
			}),
			packaged({ quantity: "6", leg: "outbound", packageStatus: "cancelled" }),
			packaged({
				quantity: "6",
				leg: "outbound",
				packageStatus: "readyForShipment",
				lineStatus: "cancelled",
			}),
		],
	};

	expect(receivedInboundQuantity(allocation).toString()).toBe("10");
	expect(outboundPackagedQuantity(allocation).toString()).toBe("3");
	expect(fractionableQuantity(allocation).toString()).toBe("7");
});

test("outbound packaging counts at any live status", () => {
	const allocation = {
		packageAllocations: [
			packaged({
				quantity: "2",
				leg: "outbound",
				packageStatus: "readyForShipment",
			}),
			packaged({ quantity: "3", leg: "outbound", packageStatus: "inTransit" }),
			packaged({ quantity: "4", leg: "outbound", packageStatus: "received" }),
		],
	};

	expect(outboundPackagedQuantity(allocation).toString()).toBe("9");
	expect(receivedInboundQuantity(allocation).toString()).toBe("0");
});

test("nothing packaged out leaves the whole received quantity fractionable", () => {
	const allocation = {
		packageAllocations: [
			packaged({ quantity: "12.5", leg: "inbound", packageStatus: "received" }),
		],
	};

	expect(fractionableQuantity(allocation).toString()).toBe("12.5");
});

test("fractionable quantity floors at zero when outbound exceeds received", () => {
	const allocation = {
		packageAllocations: [
			packaged({ quantity: "4", leg: "inbound", packageStatus: "received" }),
			packaged({
				quantity: "9",
				leg: "outbound",
				packageStatus: "readyForShipment",
			}),
		],
	};

	expect(fractionableQuantity(allocation).toString()).toBe("0");
});

test("an allocation with no packaging derives zero everywhere", () => {
	const allocation = { packageAllocations: [] };

	expect(receivedInboundQuantity(allocation).toString()).toBe("0");
	expect(outboundPackagedQuantity(allocation).toString()).toBe("0");
	expect(fractionableQuantity(allocation).toString()).toBe("0");
});

/**
 * One demand allocation covered by two received inbound packages,
 * A (id 1, 30) and B (id 2, 40). The inbound rows share the demand's packaging
 * list, as they do when read from the database.
 */
function twoSourceDemand(outbound: PackagedAllocationRecord[]) {
	const demand: { packageAllocations: PackagedAllocationRecord[] } = {
		packageAllocations: [],
	};
	const fromA = {
		quantity: new Prisma.Decimal("30"),
		cartItemLotItem: demand,
	};
	const fromB = {
		quantity: new Prisma.Decimal("40"),
		cartItemLotItem: demand,
	};
	demand.packageAllocations = [
		packaged({ quantity: "30", leg: "inbound", packageStatus: "received" }),
		packaged({ quantity: "40", leg: "inbound", packageStatus: "received" }),
		...outbound,
	];
	return { fromA, fromB };
}

test("fractionating one source fully leaves the other source's share offered", () => {
	const { fromA, fromB } = twoSourceDemand([
		packaged({
			quantity: "40",
			leg: "outbound",
			packageStatus: "readyForShipment",
			sourcePackageId: 2,
		}),
	]);

	expect(packagedAllocationFractionableQuantity(fromB, 2).toString()).toBe("0");
	expect(packagedAllocationFractionableQuantity(fromA, 1).toString()).toBe(
		"30",
	);
});

test("a partial fractionation charges only its own source", () => {
	const { fromA, fromB } = twoSourceDemand([
		packaged({
			quantity: "25",
			leg: "outbound",
			packageStatus: "readyForShipment",
			sourcePackageId: 2,
		}),
	]);

	expect(packagedAllocationFractionableQuantity(fromB, 2).toString()).toBe(
		"15",
	);
	expect(packagedAllocationFractionableQuantity(fromA, 1).toString()).toBe(
		"30",
	);
});

test("outbound rows without a recorded source keep the per-demand cap", () => {
	const { fromA, fromB } = twoSourceDemand([
		packaged({
			quantity: "40",
			leg: "outbound",
			packageStatus: "readyForShipment",
		}),
	]);

	// The numbers before sources were recorded: each capped at the 30 left.
	expect(packagedAllocationFractionableQuantity(fromB, 2).toString()).toBe(
		"30",
	);
	expect(packagedAllocationFractionableQuantity(fromA, 1).toString()).toBe(
		"30",
	);
});

test("a cancelled outbound row no longer charges its source", () => {
	const { fromB } = twoSourceDemand([
		packaged({
			quantity: "40",
			leg: "outbound",
			packageStatus: "cancelled",
			sourcePackageId: 2,
		}),
	]);

	expect(packagedAllocationFractionableQuantity(fromB, 2).toString()).toBe(
		"40",
	);
});

// Demand of 10 received as A (id 1, 5) and B (id 2, 5); A is then promoted.
test("a promoted package keeps counting as arrived, so its sibling stays fractionable", () => {
	const demand: { packageAllocations: PackagedAllocationRecord[] } = {
		packageAllocations: [
			packaged({
				quantity: "5",
				leg: "outbound",
				packageStatus: "readyForShipment",
				packageId: 1,
				sourcePackageId: 1,
			}),
			packaged({
				quantity: "5",
				leg: "inbound",
				packageStatus: "received",
				packageId: 2,
			}),
		],
	};
	const fromB = { quantity: new Prisma.Decimal("5"), cartItemLotItem: demand };

	expect(receivedInboundQuantity(demand).toString()).toBe("10");
	expect(fractionableQuantity(demand).toString()).toBe("5");
	expect(packagedAllocationFractionableQuantity(fromB, 2).toString()).toBe("5");
});

test("a fractionated outbound package is not arrival evidence", () => {
	const demand = {
		packageAllocations: [
			packaged({
				quantity: "5",
				leg: "outbound",
				packageStatus: "readyForShipment",
				packageId: 9,
				sourcePackageId: 2,
			}),
		],
	};

	expect(receivedInboundQuantity(demand).toString()).toBe("0");
});
