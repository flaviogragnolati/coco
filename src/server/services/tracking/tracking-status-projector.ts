import "server-only";

import type {
	CartItemFulfillmentStatus,
	CartItemTrackingEventType,
	Prisma,
} from "~/prisma/client";
import { appLogger } from "../logging/app-logger.service";
import type { TrackingCommand } from "./tracking-event-mapper";

const fulfillmentStatusByTrackingEvent: Partial<
	Record<CartItemTrackingEventType, CartItemFulfillmentStatus>
> = {
	submittedToOrder: "awaitingAggregation",
	includedInOperation: "includedInOperation",
	allocatedToLotItem: "allocatedToSupplierItem",
	includedInSupplierOrder: "requestedFromSupplier",
	supplierConfirmed: "supplierConfirmed",
	packaged: "packaged",
	movedInInternalShipment: "inInternalShipment",
	receivedAtWarehouse: "atWarehouse",
	movedInEndUserShipment: "inEndUserShipment",
	delivered: "delivered",
	rolledOverPreAllocation: "partiallyRolledOver",
	rolledOverPostAllocation: "partiallyRolledOver",
	cartItemCancelled: "cancelled",
	fulfillmentException: "exception",
};

function parsePositiveInt(value: string | undefined, fieldName: string) {
	if (value === undefined) return undefined;
	if (!/^\d+$/.test(value)) {
		throw new Error(`${fieldName} must be a positive integer string`);
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new Error(`${fieldName} must be a safe positive integer`);
	}

	return parsed;
}

async function countUserOrderItemEvidence(
	tx: Prisma.TransactionClient,
	command: TrackingCommand,
) {
	const userOrderItemId = parsePositiveInt(
		command.refs?.userOrderItemId,
		"userOrderItemId",
	);
	const orderId = parsePositiveInt(command.refs?.orderId, "orderId");
	const cartItemId = parsePositiveInt(command.cartItemId, "cartItemId");

	return tx.userOrderItem.count({
		where: {
			id: userOrderItemId,
			userOrderId: orderId,
			sourceCartItemId: cartItemId,
		},
	});
}

async function hasPackageAllocationEvidence(
	tx: Prisma.TransactionClient,
	command: TrackingCommand,
) {
	const cartItemId = parsePositiveInt(command.cartItemId, "cartItemId");
	const packageId = parsePositiveInt(command.refs?.packageId, "packageId");
	if (!packageId) return false;

	const count = await tx.packageAllocation.count({
		where: {
			cartItemLotItem: { cartItemId },
			packageLotItem: { packageId },
		},
	});

	return count > 0;
}

async function hasShipmentEvidence(
	tx: Prisma.TransactionClient,
	command: TrackingCommand,
) {
	const cartItemId = parsePositiveInt(command.cartItemId, "cartItemId");
	const shipmentId = parsePositiveInt(command.refs?.shipmentId, "shipmentId");
	if (!shipmentId) return false;

	const count = await tx.packageAllocation.count({
		where: {
			cartItemLotItem: { cartItemId },
			packageLotItem: {
				package: {
					shipmentId,
				},
			},
		},
	});

	return count > 0;
}

async function canProjectStatus(
	tx: Prisma.TransactionClient,
	command: TrackingCommand,
) {
	const cartItemId = parsePositiveInt(command.cartItemId, "cartItemId");

	switch (command.eventType) {
		case "submittedToOrder":
			return (await countUserOrderItemEvidence(tx, command)) > 0;

		case "includedInOperation": {
			const operationId = parsePositiveInt(
				command.refs?.operationId,
				"operationId",
			);
			if (!operationId) return false;
			return (await tx.operation.count({ where: { id: operationId } })) > 0;
		}

		case "allocatedToLotItem": {
			const lotItemId = parsePositiveInt(command.refs?.lotItemId, "lotItemId");
			if (!lotItemId) return false;
			return (
				(await tx.cartItemLotItem.count({
					where: { cartItemId, lotItemId },
				})) > 0
			);
		}

		case "includedInSupplierOrder": {
			const lotId = parsePositiveInt(command.refs?.lotId, "lotId");
			if (!lotId) return false;
			return (
				(await tx.lot.count({
					where: { id: lotId, supplierOrderId: { not: null } },
				})) > 0
			);
		}

		case "supplierConfirmed": {
			const lotItemId = parsePositiveInt(command.refs?.lotItemId, "lotItemId");
			if (!lotItemId) return false;
			return (
				(await tx.lotItem.count({
					where: { id: lotItemId, status: "confirmed" },
				})) > 0
			);
		}

		case "packaged":
			return hasPackageAllocationEvidence(tx, command);

		case "movedInInternalShipment":
		case "receivedAtWarehouse":
		case "movedInEndUserShipment":
		case "delivered":
			return hasShipmentEvidence(tx, command);

		case "rolledOverPreAllocation":
		case "rolledOverPostAllocation": {
			const rollOverId = parsePositiveInt(
				command.refs?.rolloverId,
				"rolloverId",
			);
			if (!rollOverId) return false;
			return (
				(await tx.rollOver.count({
					where: { id: rollOverId, cartItemId },
				})) > 0
			);
		}

		case "cartItemCancelled": {
			const cartItem = await tx.cartItem.findUnique({
				where: { id: cartItemId },
				select: { deleted: true, status: true },
			});

			return cartItem?.deleted === true || cartItem?.status === "cancelled";
		}

		case "fulfillmentException":
			return (
				(await tx.cartItem.count({
					where: { id: cartItemId },
				})) > 0
			);

		default:
			return false;
	}
}

// biome-ignore lint/complexity/noStaticOnlyClass: This class is a logical grouping of related functionality and is not expected to be instantiated or extended.
export class TrackingStatusProjector {
	static async project(
		tx: Prisma.TransactionClient,
		command: TrackingCommand,
	): Promise<void> {
		const targetStatus = fulfillmentStatusByTrackingEvent[command.eventType];
		if (!targetStatus) return;

		const cartItemId = parsePositiveInt(command.cartItemId, "cartItemId");
		const canProject = await canProjectStatus(tx, command);

		if (!canProject) {
			appLogger.warn("trackingStatusProjectionSkipped", {
				eventKey: command.eventKey,
				eventType: command.eventType,
				cartItemId,
				targetStatus,
			});
			return;
		}

		await tx.cartItem.updateMany({
			where: {
				id: cartItemId,
				fulfillmentStatus: { not: targetStatus },
			},
			data: {
				fulfillmentStatus: targetStatus,
			},
		});
	}
}
