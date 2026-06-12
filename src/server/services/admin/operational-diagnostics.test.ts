import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "~/prisma/client";
import type { LotDetailRecord } from "./lot.data";
import { calculateLotDiagnostics } from "./lot-diagnostics";
import type { PackageDetailRecord } from "./package.data";
import { calculatePackageDiagnostics } from "./package-diagnostics";
import type { ShipmentDetailRecord } from "./shipment.data";
import { calculateShipmentDiagnostics } from "./shipment-diagnostics";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

test("lot diagnostics classify quantity mismatch as critical", () => {
	const lot = {
		id: 1,
		status: "requested",
		supplierOrder: { id: 1 },
		lotItems: [
			{
				id: 10,
				code: "LI-10",
				status: "requested",
				quantity: decimal("10"),
				cartItemLotItems: [
					{
						quantity: decimal("7"),
						cartItem: { fulfillmentStatus: "allocatedToSupplierItem" },
					},
				],
			},
		],
	} as unknown as LotDetailRecord;

	const diagnostics = calculateLotDiagnostics(lot);

	assert.equal(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "lot.item.quantityMismatch",
		)?.severity,
		"critical",
	);
});

test("package diagnostics classify allocation conservation failures as critical", () => {
	const pkg = {
		id: 2,
		status: "readyForShipment",
		shipment: { id: 1 },
		packageLotItems: [
			{
				id: 20,
				status: "packed",
				quantity: decimal("5"),
				packageAllocations: [
					{
						id: 30,
						quantity: decimal("7"),
						cartItemLotItem: {
							id: 40,
							quantity: decimal("6"),
						},
					},
				],
			},
		],
	} as unknown as PackageDetailRecord;

	const diagnostics = calculatePackageDiagnostics(pkg);

	assert.equal(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "package.line.quantityMismatch",
		)?.severity,
		"critical",
	);
	assert.equal(
		diagnostics.find(
			(diagnostic) =>
				diagnostic.code === "package.allocation.exceedsDemandAllocation",
		)?.severity,
		"critical",
	);
});

test("package diagnostics warn when advanced package has no shipment", () => {
	const pkg = {
		id: 3,
		status: "inTransit",
		shipment: null,
		packageLotItems: [],
	} as unknown as PackageDetailRecord;

	const diagnostics = calculatePackageDiagnostics(pkg);

	assert.equal(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "package.shipment.missing",
		)?.severity,
		"warning",
	);
});

test("shipment diagnostics classify aggregate status mismatches as critical", () => {
	const shipment = {
		id: 4,
		status: "received",
		trackingCode: "TRK-1",
		carrierOrder: null,
		packages: [
			{
				status: "inTransit",
				packageLotItems: [
					{
						status: "shipped",
					},
				],
			},
		],
	} as unknown as ShipmentDetailRecord;

	const diagnostics = calculateShipmentDiagnostics(shipment, false);

	assert.equal(
		diagnostics.find(
			(diagnostic) =>
				diagnostic.code === "shipment.status.aggregateAheadOfPackages",
		)?.severity,
		"critical",
	);
	assert.equal(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "shipment.packageLine.statusMismatch",
		)?.severity,
		"critical",
	);
	assert.equal(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "shipment.trackingEvents.missing",
		)?.severity,
		"warning",
	);
});
