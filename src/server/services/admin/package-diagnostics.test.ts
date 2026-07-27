import { expect, test } from "vitest";
import { Prisma } from "~/prisma/client";
import type { PackageSummaryRecord } from "./package.data";
import { calculatePackageDiagnostics } from "./package-diagnostics";

function decimal(value: string) {
	return new Prisma.Decimal(value);
}

type Line = PackageSummaryRecord["packageLotItems"][number];
type Allocation = Line["packageAllocations"][number];

/**
 * One packaged allocation and, inside its demand allocation, the full set of
 * packaged allocations the per-leg rule reads — including this one.
 */
function allocation(input: {
	id: number;
	quantity: string;
	demandId: number;
	demandQuantity: string;
	cartId?: number;
	ownLeg?: "inbound" | "outbound";
	ownPackageStatus?: string;
	siblings?: Array<{
		quantity: string;
		leg: "inbound" | "outbound";
		packageStatus?: string;
		lineStatus?: string;
	}>;
}): Allocation {
	const own = {
		quantity: decimal(input.quantity),
		packageLotItem: {
			status: "packed",
			package: {
				status: input.ownPackageStatus ?? "readyForShipment",
				leg: input.ownLeg ?? "inbound",
			},
		},
	};

	return {
		id: input.id,
		quantity: decimal(input.quantity),
		cartItemLotItem: {
			id: input.demandId,
			quantity: decimal(input.demandQuantity),
			cartItem: { cartId: input.cartId ?? 900 },
			packageAllocations: [
				own,
				...(input.siblings ?? []).map((sibling) => ({
					quantity: decimal(sibling.quantity),
					packageLotItem: {
						status: sibling.lineStatus ?? "packed",
						package: {
							status: sibling.packageStatus ?? "readyForShipment",
							leg: sibling.leg,
						},
					},
				})),
			],
		},
	} as unknown as Allocation;
}

function line(input: {
	id: number;
	quantity: string;
	status?: string;
	allocations?: Allocation[];
}): Line {
	return {
		id: input.id,
		status: input.status ?? "packed",
		quantity: decimal(input.quantity),
		packageAllocations: input.allocations ?? [],
	} as unknown as Line;
}

function pkg(input: {
	id?: number;
	status?: string;
	leg?: "inbound" | "outbound";
	shipment?: { id: number; deliveryMode?: string | null } | null;
	lines?: Line[];
}): PackageSummaryRecord {
	return {
		id: input.id ?? 1,
		name: "Paquete",
		trackingCode: null,
		status: input.status ?? "readyForShipment",
		leg: input.leg ?? "inbound",
		shipment: input.shipment === undefined ? { id: 1 } : input.shipment,
		packageLotItems: input.lines ?? [],
		createdAt: new Date("2026-07-01T00:00:00.000Z"),
		updatedAt: new Date("2026-07-01T00:00:00.000Z"),
	} as unknown as PackageSummaryRecord;
}

function codes(record: PackageSummaryRecord) {
	return calculatePackageDiagnostics(record).map(
		(diagnostic) => diagnostic.code,
	);
}

const healthyLine = line({
	id: 10,
	quantity: "6",
	allocations: [
		allocation({ id: 100, quantity: "6", demandId: 40, demandQuantity: "6" }),
	],
});

test("a healthy inbound package on a shipment reports nothing", () => {
	expect(codes(pkg({ lines: [healthyLine] }))).toEqual([]);
});

test("a cancelled line is skipped by both per-line rules", () => {
	// A written-off or received-at-zero line keeps its quantity as history, so
	// without the filter both rules fire on every correct write-off.
	const cancelled = line({ id: 11, quantity: "4", status: "cancelled" });

	expect(codes(pkg({ lines: [cancelled, healthyLine] }))).toEqual([]);
	expect(codes(pkg({ lines: [cancelled] }))).toEqual([]);
});

test("a live line without allocations or with a quantity mismatch still reports", () => {
	expect(codes(pkg({ lines: [line({ id: 12, quantity: "4" })] }))).toEqual([
		"package.line.noPackagedAllocations",
		"package.line.quantityMismatch",
	]);
});

test("per-leg conservation fires across two inbound packages sharing one demand", () => {
	const overPackaged = line({
		id: 13,
		quantity: "6",
		allocations: [
			allocation({
				id: 101,
				quantity: "6",
				demandId: 40,
				demandQuantity: "6",
				// A second inbound package already covers 3 of the same 6.
				siblings: [{ quantity: "3", leg: "inbound" }],
			}),
		],
	});

	expect(codes(pkg({ lines: [overPackaged] }))).toContain(
		"package.leg.overAllocated",
	);
});

test("per-leg conservation stays silent across legs", () => {
	// Fractionation packages the same demand again on the outbound leg; that is the
	// design, not a double-count (ADR 0004).
	const fractionated = line({
		id: 14,
		quantity: "6",
		allocations: [
			allocation({
				id: 102,
				quantity: "6",
				demandId: 40,
				demandQuantity: "6",
				siblings: [{ quantity: "6", leg: "outbound" }],
			}),
		],
	});

	expect(codes(pkg({ lines: [fractionated] }))).toEqual([]);
});

test("per-leg conservation ignores cancelled coverage", () => {
	const writtenOffSibling = line({
		id: 15,
		quantity: "6",
		allocations: [
			allocation({
				id: 103,
				quantity: "6",
				demandId: 40,
				demandQuantity: "6",
				siblings: [{ quantity: "3", leg: "inbound", lineStatus: "cancelled" }],
			}),
		],
	});

	expect(codes(pkg({ lines: [writtenOffSibling] }))).toEqual([]);
});

test("an inbound package without a shipment reports, an outbound one does not", () => {
	expect(
		codes(pkg({ leg: "inbound", shipment: null, lines: [healthyLine] })),
	).toEqual(["package.leg.missingShipment"]);

	// Depot pickup: goods handed over at the destination with no movement record.
	expect(
		codes(pkg({ leg: "outbound", shipment: null, lines: [healthyLine] })),
	).toEqual([]);
});

test("a cancelled inbound package is not asked for a shipment", () => {
	expect(
		codes(pkg({ status: "cancelled", shipment: null, lines: [] })),
	).toEqual([]);
});

test("a package in transit without a shipment still reports the movement rule", () => {
	expect(
		codes(pkg({ status: "inTransit", shipment: null, lines: [] })),
	).toEqual(["package.shipment.missing", "package.leg.missingShipment"]);
});

test("an aggregate ahead of its live lines reports", () => {
	const stillPacking = line({ id: 16, quantity: "6", status: "packing" });

	expect(
		codes(
			pkg({
				status: "received",
				lines: [
					{
						...stillPacking,
						packageAllocations: healthyLine.packageAllocations,
					},
				],
			}),
		),
	).toContain("package.status.aggregateAheadOfLines");
});

test("a packaged allocation above its own demand allocation reports", () => {
	const excessive = line({
		id: 17,
		quantity: "7",
		allocations: [
			allocation({ id: 104, quantity: "7", demandId: 40, demandQuantity: "6" }),
		],
	});

	expect(codes(pkg({ lines: [excessive] }))).toContain(
		"package.allocation.exceedsDemandAllocation",
	);
});

/** What `fractionate` writes: an outbound line over demand that already arrived. */
function fractionatedLine(input: {
	id: number;
	allocationId: number;
	quantity: string;
	demandId: number;
	cartId?: number;
	receivedQuantity?: string;
}) {
	return line({
		id: input.id,
		quantity: input.quantity,
		allocations: [
			allocation({
				id: input.allocationId,
				quantity: input.quantity,
				demandId: input.demandId,
				demandQuantity: input.quantity,
				cartId: input.cartId,
				ownLeg: "outbound",
				siblings: [
					{
						quantity: input.receivedQuantity ?? input.quantity,
						leg: "inbound",
						packageStatus: "received",
					},
				],
			}),
		],
	});
}

test("a correctly fractionated outbound package reports nothing", () => {
	expect(
		codes(
			pkg({
				leg: "outbound",
				shipment: null,
				lines: [
					fractionatedLine({
						id: 20,
						allocationId: 200,
						quantity: "6",
						demandId: 40,
					}),
				],
			}),
		),
	).toEqual([]);
});

test("outbound quantity above what arrived reports", () => {
	// Two units left on the outbound leg that never arrived on the inbound one.
	expect(
		codes(
			pkg({
				leg: "outbound",
				shipment: null,
				lines: [
					fractionatedLine({
						id: 21,
						allocationId: 201,
						quantity: "6",
						demandId: 40,
						receivedQuantity: "4",
					}),
				],
			}),
		),
	).toContain("package.outbound.exceedsReceived");
});

test("inbound quantity that has not arrived yet does not count as received", () => {
	const stillInTransit = line({
		id: 22,
		quantity: "6",
		allocations: [
			allocation({
				id: 202,
				quantity: "6",
				demandId: 40,
				demandQuantity: "6",
				ownLeg: "outbound",
				siblings: [
					{ quantity: "6", leg: "inbound", packageStatus: "inTransit" },
				],
			}),
		],
	});

	expect(
		codes(pkg({ leg: "outbound", shipment: null, lines: [stillInTransit] })),
	).toContain("package.outbound.exceedsReceived");
});

/** Two customers' demand in one outbound package. */
const multiCustomerLines = [
	fractionatedLine({
		id: 23,
		allocationId: 203,
		quantity: "6",
		demandId: 40,
		cartId: 900,
	}),
	fractionatedLine({
		id: 24,
		allocationId: 204,
		quantity: "4",
		demandId: 41,
		cartId: 901,
	}),
];

test("an outbound package spanning two customers reports a warning", () => {
	const codesReported = codes(
		pkg({ leg: "outbound", shipment: null, lines: multiCustomerLines }),
	);

	expect(codesReported).toEqual(["package.outbound.multiCustomer"]);
});

test("a pickup point is legitimately multi-customer, so it stays a warning", () => {
	const diagnostics = calculatePackageDiagnostics(
		pkg({
			leg: "outbound",
			shipment: { id: 1, deliveryMode: "pickupPoint" },
			lines: multiCustomerLines,
		}),
	);

	expect(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "package.outbound.multiCustomer",
		)?.severity,
	).toBe("warning");
});

test("the same package on a home delivery is critical — the commands refuse that shape", () => {
	const diagnostics = calculatePackageDiagnostics(
		pkg({
			leg: "outbound",
			shipment: { id: 1, deliveryMode: "homeDelivery" },
			lines: multiCustomerLines,
		}),
	);

	expect(
		diagnostics.find(
			(diagnostic) => diagnostic.code === "package.outbound.multiCustomer",
		)?.severity,
	).toBe("critical");
});

test("an inbound package spanning two customers is left alone", () => {
	// Inbound packages are multi-customer by construction: a dispatch covers every
	// payer of the line at once.
	expect(
		codes(
			pkg({
				lines: [
					line({
						id: 25,
						quantity: "10",
						allocations: [
							allocation({
								id: 205,
								quantity: "6",
								demandId: 40,
								demandQuantity: "6",
								cartId: 900,
							}),
							allocation({
								id: 206,
								quantity: "4",
								demandId: 41,
								demandQuantity: "4",
								cartId: 901,
							}),
						],
					}),
				],
			}),
		),
	).toEqual([]);
});

const STALE_BEFORE = new Date("2026-07-10T00:00:00.000Z");

function staleCodes(record: PackageSummaryRecord, staleBefore: Date | null) {
	return calculatePackageDiagnostics(record, { staleBefore }).map(
		(diagnostic) => diagnostic.code,
	);
}

test("a received inbound package nobody fractionated is flagged", () => {
	const arrived = pkg({
		status: "received",
		leg: "inbound",
		lines: [
			line({
				id: 20,
				quantity: "6",
				status: "received",
				allocations: [
					allocation({
						id: 200,
						quantity: "6",
						demandId: 40,
						demandQuantity: "6",
						ownLeg: "inbound",
						ownPackageStatus: "received",
					}),
				],
			}),
		],
	});

	expect(staleCodes(arrived, STALE_BEFORE)).toContain(
		"package.received.notFractionated",
	);
	expect(staleCodes(arrived, null)).not.toContain(
		"package.received.notFractionated",
	);
	expect(codes(arrived)).not.toContain("package.received.notFractionated");
});

test("a fully fractionated inbound package is silent however long it sits", () => {
	const emptied = pkg({
		status: "received",
		leg: "inbound",
		lines: [
			line({
				id: 21,
				quantity: "6",
				status: "received",
				allocations: [
					allocation({
						id: 201,
						quantity: "6",
						demandId: 41,
						demandQuantity: "6",
						ownLeg: "inbound",
						ownPackageStatus: "received",
						siblings: [{ quantity: "6", leg: "outbound" }],
					}),
				],
			}),
		],
	});

	expect(staleCodes(emptied, STALE_BEFORE)).not.toContain(
		"package.received.notFractionated",
	);
});

test("an outbound package nobody collected is flagged", () => {
	const waiting = pkg({
		status: "readyForShipment",
		leg: "outbound",
		shipment: null,
		lines: [
			line({
				id: 22,
				quantity: "6",
				allocations: [
					allocation({
						id: 202,
						quantity: "6",
						demandId: 42,
						demandQuantity: "6",
						ownLeg: "outbound",
						// The inbound ancestor, without which per-leg conservation would
						// (correctly) report a critical and drown the signal under test.
						siblings: [
							{ quantity: "6", leg: "inbound", packageStatus: "received" },
						],
					}),
				],
			}),
		],
	});

	expect(staleCodes(waiting, STALE_BEFORE)).toContain(
		"package.outbound.notCollected",
	);
	expect(staleCodes(waiting, null)).not.toContain(
		"package.outbound.notCollected",
	);
});

test("a delivered outbound package is not uncollected", () => {
	const delivered = pkg({
		status: "received",
		leg: "outbound",
		shipment: null,
		lines: [
			line({
				id: 23,
				quantity: "6",
				status: "received",
				allocations: [
					allocation({
						id: 203,
						quantity: "6",
						demandId: 43,
						demandQuantity: "6",
						ownLeg: "outbound",
						ownPackageStatus: "received",
						siblings: [
							{ quantity: "6", leg: "inbound", packageStatus: "received" },
						],
					}),
				],
			}),
		],
	});

	expect(staleCodes(delivered, STALE_BEFORE)).not.toContain(
		"package.outbound.notCollected",
	);
});
