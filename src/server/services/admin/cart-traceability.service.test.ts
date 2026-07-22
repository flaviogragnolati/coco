import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import { cartTraceabilityDetailSchema } from "~/schemas/admin/cart-traceability.schemas";
import type { AdminTrackingTimelineItem } from "~/shared/common/tracking.types";
import {
	assembleCartTraceability,
	type CartTraceabilityDiagnosticsMaps,
	type CartTraceabilityTimelines,
} from "./cart-traceability.assembler";
import type { CartTraceabilityRecord } from "./cart-traceability.data";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

function emptyRefs() {
	return {
		operationId: null,
		cartItemLotItemId: null,
		packageAllocationId: null,
		lotId: null,
		lotItemId: null,
		packageId: null,
		shipmentId: null,
		rollOverId: null,
	};
}

function timelineItem(
	id: number,
	cartItemId: number,
): AdminTrackingTimelineItem {
	return {
		id,
		eventKey: `EK-${id}`,
		cartItemId,
		eventType: "packaged",
		source: "system",
		actor: { userId: null, reference: null },
		label: "Empaquetado",
		refs: emptyRefs(),
		metadata: null,
		createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
	};
}

// Cart with two items: item A fans out to lot 1 / package 1 / shipment 1,
// item B fans out to lot 2 (and a package/shipment with no diagnostics).
function buildRecord(): CartTraceabilityRecord {
	const baseDate = new Date("2026-01-01T00:00:00.000Z");

	return {
		id: 100,
		code: "CART-100",
		status: "submitted",
		deleted: false,
		createdAt: baseDate,
		updatedAt: baseDate,
		user: {
			id: "user-1",
			name: "Ada Lovelace",
			email: "ada@example.com",
			role: "user",
			deleted: false,
		},
		cartItems: [
			{
				id: 1,
				code: "CITEM-1",
				quantity: decimal("10"),
				status: "submitted",
				fulfillmentStatus: "packaged",
				deleted: false,
				createdAt: baseDate,
				updatedAt: baseDate,
				productClientTerms: {
					product: { id: 11, name: "Producto A", unit: "kg" },
				},
				cartItemLotItems: [
					{
						id: 1001,
						quantity: decimal("10"),
						lotItem: {
							id: 201,
							code: "LI-201",
							status: "confirmed",
							quantity: decimal("10"),
							productSupplierTerms: { product: { name: "Producto A" } },
							lot: {
								id: 1,
								code: "LOT-1",
								status: "confirmed",
								supplier: { name: "Proveedor 1" },
								operation: {
									id: 301,
									code: "OP-301",
									status: "running",
									strategy: "fifo",
								},
							},
						},
						packageAllocations: [
							{
								id: 5001,
								quantity: decimal("10"),
								packageLotItem: {
									id: 401,
									quantity: decimal("10"),
									status: "packed",
									package: {
										id: 1,
										name: "PKG-1",
										status: "readyForShipment",
										trackingCode: "TC-1",
										shipment: {
											id: 1,
											name: "Envio 1",
											internalCode: "SHIP-1",
											status: "inTransit",
											type: "internalTransfer",
											trackingCode: "STC-1",
										},
									},
								},
							},
						],
					},
				],
				rollOvers: [
					{
						id: 9001,
						stage: "preAllocation",
						status: "open",
						quantity: decimal("2"),
						reason: "Sin stock",
						operation: { id: 301, code: "OP-301", status: "running" },
					},
				],
			},
			{
				id: 2,
				code: "CITEM-2",
				quantity: decimal("5"),
				status: "submitted",
				fulfillmentStatus: "includedInOperation",
				deleted: false,
				createdAt: baseDate,
				updatedAt: baseDate,
				productClientTerms: {
					product: { id: 12, name: "Producto B", unit: "piece" },
				},
				cartItemLotItems: [
					{
						id: 1002,
						quantity: decimal("5"),
						lotItem: {
							id: 202,
							code: "LI-202",
							status: "requested",
							quantity: decimal("5"),
							productSupplierTerms: { product: { name: "Producto B" } },
							lot: {
								id: 2,
								code: "LOT-2",
								status: "requested",
								supplier: { name: "Proveedor 2" },
								operation: {
									id: 302,
									code: "OP-302",
									status: "running",
									strategy: "fifo",
								},
							},
						},
						packageAllocations: [],
					},
				],
				rollOvers: [],
			},
		],
		userOrders: [
			{
				id: 700,
				code: "ORD-700",
				status: "processing",
				createdAt: baseDate,
				updatedAt: baseDate,
				transactions: [
					{
						id: 800,
						amount: decimal("100.50"),
						currency: "ARS",
						status: "completed",
						provider: "mock",
						createdAt: baseDate,
						updatedAt: baseDate,
						paymentMethod: { type: "mercadopago" },
					},
				],
			},
		],
	} as unknown as CartTraceabilityRecord;
}

const lotDiagnostic1: OperationalDiagnostic = {
	code: "lot.item.quantityMismatch",
	severity: "critical",
	message: "Lote 1 con discrepancia",
	refs: { lotId: 1 },
};
const lotDiagnostic2: OperationalDiagnostic = {
	code: "lot.supplierOrder.missing",
	severity: "warning",
	message: "Lote 2 sin orden",
	refs: { lotId: 2 },
};
const packageDiagnostic1: OperationalDiagnostic = {
	code: "package.line.noPackagedAllocations",
	severity: "warning",
	message: "Paquete 1 sin asignaciones",
	refs: { packageId: 1 },
};
const shipmentDiagnostic1: OperationalDiagnostic = {
	code: "shipment.status.aggregateAheadOfPackages",
	severity: "critical",
	message: "Envio 1 adelantado",
	refs: { shipmentId: 1 },
};

function buildDiagnostics(): CartTraceabilityDiagnosticsMaps {
	return {
		lot: new Map([
			[1, [lotDiagnostic1]],
			[2, [lotDiagnostic2]],
		]),
		package: new Map([[1, [packageDiagnostic1]]]),
		shipment: new Map([[1, [shipmentDiagnostic1]]]),
	};
}

function buildTimelines(): CartTraceabilityTimelines {
	return {
		cart: [timelineItem(10, 1), timelineItem(11, 2)],
		byItemId: new Map([[1, [timelineItem(10, 1)]]]),
	};
}

test("cart traceability assembles per-item lineage across lots and shipments", () => {
	const detail = assembleCartTraceability(
		buildRecord(),
		buildDiagnostics(),
		buildTimelines(),
	);

	expect(detail.items.length).toBe(2);

	const [itemA, itemB] = detail.items;
	const allocationA = itemA?.allocations[0];
	expect(allocationA?.lotItem.lot.code).toBe("LOT-1");
	expect(allocationA?.lotItem.lot.operation.code).toBe("OP-301");
	expect(allocationA?.packaging[0]?.package.name).toBe("PKG-1");
	expect(allocationA?.packaging[0]?.shipment?.internalCode).toBe("SHIP-1");

	// item B reaches a lot but has no packaging yet.
	expect(itemB?.allocations[0]?.lotItem.lot.code).toBe("LOT-2");
	expect(itemB?.allocations[0]?.packaging.length).toBe(0);
});

test("cart traceability attributes diagnostics to the items whose lineage touches them", () => {
	const detail = assembleCartTraceability(
		buildRecord(),
		buildDiagnostics(),
		buildTimelines(),
	);

	const [itemA, itemB] = detail.items;

	expect(
		itemA?.diagnostics.map((diagnostic) => diagnostic.code).sort(),
	).toStrictEqual([
		"lot.item.quantityMismatch",
		"package.line.noPackagedAllocations",
		"shipment.status.aggregateAheadOfPackages",
	]);
	expect(itemA?.highestDiagnosticSeverity).toBe("critical");

	expect(itemB?.diagnostics.map((diagnostic) => diagnostic.code)).toStrictEqual(
		["lot.supplierOrder.missing"],
	);
	expect(itemB?.highestDiagnosticSeverity).toBe("warning");

	// Cart-level rollup contains every distinct diagnostic in the lineage.
	expect(detail.diagnostics.length).toBe(4);
	expect(detail.highestDiagnosticSeverity).toBe("critical");
});

test("cart traceability populates timelines, orders, rollovers and aggregate", () => {
	const detail = assembleCartTraceability(
		buildRecord(),
		buildDiagnostics(),
		buildTimelines(),
	);

	expect(detail.cartTimeline.length).toBe(2);
	expect(detail.items[0]?.timeline.length).toBe(1);
	expect(detail.items[1]?.timeline.length).toBe(0);

	expect(detail.items[0]?.rollOvers.length).toBe(1);
	expect(detail.orders[0]?.payments[0]?.amount).toBe("100.5");
	expect(detail.orders[0]?.payments[0]?.paymentMethodType).toBe("mercadopago");

	expect(detail.aggregate.itemCount).toBe(2);
	expect(detail.aggregate.fulfillmentSummary.length).toBe(2);
});

test("assembled cart traceability satisfies the output schema", () => {
	const detail = assembleCartTraceability(
		buildRecord(),
		buildDiagnostics(),
		buildTimelines(),
	);

	expect(() => cartTraceabilityDetailSchema.parse(detail)).not.toThrow();
});
