import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import {
	fractionableQuantity,
	outboundPackagedQuantity,
	type PackagedAllocationRecord,
	receivedInboundQuantity,
} from "./package.data";

function packaged(input: {
	quantity: string;
	leg: "inbound" | "outbound";
	packageStatus: string;
	lineStatus?: string;
}): PackagedAllocationRecord {
	return {
		quantity: new Prisma.Decimal(input.quantity),
		packageLotItem: {
			status: (input.lineStatus ??
				"received") as PackagedAllocationRecord["packageLotItem"]["status"],
			package: {
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
