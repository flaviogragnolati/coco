import { packageStatusLineCompatibility } from "~/shared/common/fulfillment-transitions";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { decimal, sumDecimals } from "./operational-diagnostics.types";
import {
	type PackageSummaryRecord,
	receivedInboundQuantity,
} from "./package.data";

type PackageLine = PackageSummaryRecord["packageLotItems"][number];

/**
 * Per-leg conservation (ADR 0004): Σ of a demand allocation's live packaged
 * allocations **on one leg** must not exceed the allocation's own quantity. The
 * legs are counted separately on purpose — destination fractionation packages the
 * same demand a second time on the outbound leg, and that is correct, not a
 * double-count.
 */
function packagedOnLeg(
	allocation: PackageLine["packageAllocations"][number],
	leg: "inbound" | "outbound",
) {
	return sumDecimals(
		allocation.cartItemLotItem.packageAllocations
			.filter(
				(packaged) =>
					packaged.packageLotItem.package.leg === leg &&
					packaged.packageLotItem.package.status !== "cancelled" &&
					packaged.packageLotItem.status !== "cancelled",
			)
			.map((packaged) => packaged.quantity),
	);
}

export function calculatePackageDiagnostics(
	pkg: PackageSummaryRecord,
): OperationalDiagnostic[] {
	const diagnostics: OperationalDiagnostic[] = [];
	// Cancelled lines are written-off or received-at-zero history. The per-line
	// rules below would fire on every one of them by construction — the same
	// correction Phase 1 made when cancelled lot items first reached runtime.
	const liveLines = pkg.packageLotItems.filter(
		(line) => line.status !== "cancelled",
	);

	// A `received` package without a shipment is legitimate: goods can be handed
	// over without a movement record (depot pickup). Only movement needs one.
	if (pkg.status === "inTransit" && !pkg.shipment) {
		diagnostics.push({
			code: "package.shipment.missing",
			severity: "warning",
			message: "El paquete esta en transito pero no tiene envio.",
			refs: { packageId: pkg.id },
		});
	}

	// An outbound package with no shipment is depot pickup; an inbound one has no
	// such story — goods reach the destination on a movement record or not at all.
	if (pkg.leg === "inbound" && !pkg.shipment && pkg.status !== "cancelled") {
		diagnostics.push({
			code: "package.leg.missingShipment",
			severity: "warning",
			message: "El paquete de entrada no tiene envio asociado.",
			refs: { packageId: pkg.id },
		});
	}

	const compatibleStatuses = packageStatusLineCompatibility[pkg.status];
	if (compatibleStatuses) {
		const incompatible = liveLines.filter(
			(line) => !compatibleStatuses.has(line.status),
		);
		if (incompatible.length > 0) {
			diagnostics.push({
				code: "package.status.aggregateAheadOfLines",
				severity: "warning",
				message:
					"El estado agregado del paquete esta por delante de sus lineas.",
				refs: { packageId: pkg.id, packageLineCount: incompatible.length },
			});
		}
	}

	for (const line of liveLines) {
		const allocationQuantity = sumDecimals(
			line.packageAllocations.map((allocation) => allocation.quantity),
		);

		if (line.packageAllocations.length === 0) {
			diagnostics.push({
				code: "package.line.noPackagedAllocations",
				severity: "warning",
				message: `La linea de paquete #${line.id} no tiene asignaciones.`,
				refs: { packageId: pkg.id, packageLotItemId: line.id },
			});
		}

		if (!decimal(line.quantity).equals(allocationQuantity)) {
			diagnostics.push({
				code: "package.line.quantityMismatch",
				severity: "critical",
				message: `La cantidad de la linea #${line.id} no coincide con sus asignaciones.`,
				refs: { packageId: pkg.id, packageLotItemId: line.id },
			});
		}

		for (const allocation of line.packageAllocations) {
			if (
				decimal(allocation.quantity).greaterThan(
					allocation.cartItemLotItem.quantity,
				)
			) {
				diagnostics.push({
					code: "package.allocation.exceedsDemandAllocation",
					severity: "critical",
					message: `La asignacion empaquetada #${allocation.id} excede su demanda origen.`,
					refs: {
						packageId: pkg.id,
						packageAllocationId: allocation.id,
						cartItemLotItemId: allocation.cartItemLotItem.id,
					},
				});
			}

			if (
				packagedOnLeg(allocation, pkg.leg).greaterThan(
					allocation.cartItemLotItem.quantity,
				)
			) {
				diagnostics.push({
					code: "package.leg.overAllocated",
					severity: "critical",
					message: `La demanda #${allocation.cartItemLotItem.id} esta empaquetada de mas en la pata ${pkg.leg}.`,
					refs: {
						packageId: pkg.id,
						packageAllocationId: allocation.id,
						cartItemLotItemId: allocation.cartItemLotItem.id,
					},
				});
			}

			// The independent monitor of 4a's new invariant: goods cannot leave on the
			// outbound leg before they arrived on the inbound one. Named per leg on
			// purpose — a check without the filter fires on every correct fractionation.
			if (
				pkg.leg === "outbound" &&
				packagedOnLeg(allocation, "outbound").greaterThan(
					receivedInboundQuantity(allocation.cartItemLotItem),
				)
			) {
				diagnostics.push({
					code: "package.outbound.exceedsReceived",
					severity: "critical",
					message: `La demanda #${allocation.cartItemLotItem.id} esta empaquetada de salida antes de haber llegado.`,
					refs: {
						packageId: pkg.id,
						packageAllocationId: allocation.id,
						cartItemLotItemId: allocation.cartItemLotItem.id,
					},
				});
			}
		}
	}

	// Fractionation produces one package per customer, so a multi-customer outbound
	// package usually means an accidental grouping — a warning, because a group
	// pickup point is legitimately multi-customer.
	//
	// On a **home delivery** it is critical instead: `destinationAddressSnapshot` is
	// a single address, `createEndUser`/`addPackages` refuse the shape outright, and
	// so its existence means hand-edited data, not an operator mistake.
	if (pkg.leg === "outbound") {
		const cartIds = new Set(
			liveLines.flatMap((line) =>
				line.packageAllocations.map(
					(allocation) => allocation.cartItemLotItem.cartItem.cartId,
				),
			),
		);
		if (cartIds.size > 1) {
			const onHomeDelivery = pkg.shipment?.deliveryMode === "homeDelivery";
			diagnostics.push({
				code: "package.outbound.multiCustomer",
				severity: onHomeDelivery ? "critical" : "warning",
				message: onHomeDelivery
					? "El paquete de un envio a domicilio agrupa demanda de varios clientes."
					: "El paquete de salida agrupa demanda de varios clientes.",
				refs: { packageId: pkg.id, cartCount: cartIds.size },
			});
		}
	}

	return diagnostics;
}
