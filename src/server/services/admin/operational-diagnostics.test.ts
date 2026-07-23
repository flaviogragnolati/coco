import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type { LotDetailRecord } from "./lot.data";
import { calculateLotDiagnostics } from "./lot-diagnostics";
import {
	DIAGNOSTIC_SCAN_LIMIT,
	paginate,
	resolveDiagnosticListPage,
} from "./operational-diagnostics.types";
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

	expect(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "lot.item.quantityMismatch",
		)?.severity,
	).toBe("critical");
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

	expect(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "package.line.quantityMismatch",
		)?.severity,
	).toBe("critical");
	expect(
		diagnostics.find(
			(diagnostic) =>
				diagnostic.code === "package.allocation.exceedsDemandAllocation",
		)?.severity,
	).toBe("critical");
});

test("package diagnostics warn when advanced package has no shipment", () => {
	const pkg = {
		id: 3,
		status: "inTransit",
		shipment: null,
		packageLotItems: [],
	} as unknown as PackageDetailRecord;

	const diagnostics = calculatePackageDiagnostics(pkg);

	expect(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "package.shipment.missing",
		)?.severity,
	).toBe("warning");
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

	expect(
		diagnostics.find(
			(diagnostic) =>
				diagnostic.code === "shipment.status.aggregateAheadOfPackages",
		)?.severity,
	).toBe("critical");
	expect(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "shipment.packageLine.statusMismatch",
		)?.severity,
	).toBe("critical");
	expect(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "shipment.trackingEvents.missing",
		)?.severity,
	).toBe("warning");
});

test("resolveDiagnosticListPage flags truncation at the scan cap", () => {
	const items = [{ diagnosticCount: 0 }, { diagnosticCount: 2 }];
	const input = { page: 1, pageSize: 25, diagnosticState: "all" as const };

	expect(
		resolveDiagnosticListPage(items, input, DIAGNOSTIC_SCAN_LIMIT - 1)
			.truncated,
	).toBe(false);
	expect(
		resolveDiagnosticListPage(items, input, DIAGNOSTIC_SCAN_LIMIT).truncated,
	).toBe(true);
});

test("resolveDiagnosticListPage filters by diagnostic state", () => {
	const items = [
		{ diagnosticCount: 0 },
		{ diagnosticCount: 3 },
		{ diagnosticCount: 0 },
	];

	const withoutDiagnostics = resolveDiagnosticListPage(
		items,
		{ page: 1, pageSize: 25, diagnosticState: "withoutDiagnostics" },
		items.length,
	);
	expect(
		withoutDiagnostics.items.every((item) => item.diagnosticCount === 0),
	).toBe(true);
	expect(withoutDiagnostics.total).toBe(2);

	const withDiagnostics = resolveDiagnosticListPage(
		items,
		{ page: 1, pageSize: 25, diagnosticState: "withDiagnostics" },
		items.length,
	);
	expect(withDiagnostics.items.every((item) => item.diagnosticCount > 0)).toBe(
		true,
	);
	expect(withDiagnostics.total).toBe(1);
});

test("resolveDiagnosticListPage pageCount matches paginate", () => {
	const items = Array.from({ length: 30 }, () => ({ diagnosticCount: 1 }));
	const input = { page: 1, pageSize: 25, diagnosticState: "all" as const };

	const resolved = resolveDiagnosticListPage(items, input, items.length);
	const paginated = paginate(items, input);

	expect(resolved.pageCount).toBe(paginated.pageCount);
	expect(resolved.total).toBe(paginated.total);
	expect(resolved.items.length).toBe(paginated.items.length);
});
