import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "~/prisma/client";
import {
	calculateAssignableQuantity,
	type OperationSupplierTermCandidate,
	resolveSupplierTermForProduct,
} from "./operation-assignment.helpers";

const now = new Date("2026-06-08T12:00:00.000Z");

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

function term(
	input: Partial<OperationSupplierTermCandidate> = {},
): OperationSupplierTermCandidate {
	const supplierId = input.supplierId ?? 1;

	return {
		id: input.id ?? supplierId,
		supplierId,
		moq: input.moq ?? decimal("10.0000"),
		step: input.step === undefined ? decimal("5.0000") : input.step,
		max: input.max === undefined ? null : input.max,
		fromDate: input.fromDate ?? new Date("2026-01-01T00:00:00.000Z"),
		toDate: input.toDate === undefined ? null : input.toDate,
		active: input.active ?? true,
		deleted: input.deleted ?? false,
		supplier: input.supplier ?? {
			id: supplierId,
			name: `Proveedor ${supplierId}`,
			active: true,
			deleted: false,
		},
	};
}

test("calculateAssignableQuantity rolls over quantities below supplier MOQ", () => {
	const assigned = calculateAssignableQuantity({
		quantity: "9.0000",
		moq: "10.0000",
		step: "5.0000",
		max: null,
	});

	assert.equal(assigned.toString(), "0");
});

test("calculateAssignableQuantity floors to the largest valid supplier step", () => {
	const assigned = calculateAssignableQuantity({
		quantity: "18.0000",
		moq: "10.0000",
		step: "5.0000",
		max: null,
	});

	assert.equal(assigned.toString(), "15");
});

test("calculateAssignableQuantity respects supplier max before step alignment", () => {
	const assigned = calculateAssignableQuantity({
		quantity: "42.0000",
		moq: "10.0000",
		step: "5.0000",
		max: "32.0000",
	});

	assert.equal(assigned.toString(), "30");
});

test("resolveSupplierTermForProduct selects the active default supplier term", () => {
	const selected = resolveSupplierTermForProduct(
		{
			name: "Arroz",
			defaultSupplierId: 2,
			supplierTerms: [term({ supplierId: 1 }), term({ supplierId: 2 })],
		},
		now,
	);

	assert.equal(selected.term?.supplierId, 2);
});

test("resolveSupplierTermForProduct falls back to one deterministic active term", () => {
	const selected = resolveSupplierTermForProduct(
		{
			name: "Tomate",
			defaultSupplierId: 99,
			supplierTerms: [term({ supplierId: 3 })],
		},
		now,
	);

	assert.equal(selected.term?.supplierId, 3);
});

test("resolveSupplierTermForProduct fails closed on supplier ambiguity", () => {
	const selected = resolveSupplierTermForProduct(
		{
			name: "Queso",
			defaultSupplierId: null,
			supplierTerms: [term({ supplierId: 1 }), term({ supplierId: 2 })],
		},
		now,
	);

	assert.equal(selected.term, null);
	assert.match(selected.reason ?? "", /Proveedor ambiguo/);
});

test("resolveSupplierTermForProduct ignores inactive or expired terms", () => {
	const selected = resolveSupplierTermForProduct(
		{
			name: "Dulce",
			defaultSupplierId: null,
			supplierTerms: [
				term({ supplierId: 1, active: false }),
				term({
					supplierId: 2,
					fromDate: new Date("2025-01-01T00:00:00.000Z"),
					toDate: new Date("2025-12-31T23:59:59.000Z"),
				}),
			],
		},
		now,
	);

	assert.equal(selected.term, null);
	assert.match(selected.reason ?? "", /Sin termino de proveedor/);
});
