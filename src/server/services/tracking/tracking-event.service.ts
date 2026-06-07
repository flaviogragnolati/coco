import "server-only";

import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";
import { appLogger } from "~/server/services/logging/app-logger.service";
import type {
	AdminTrackingTimelineItem,
	UserTrackingTimelineItem,
} from "~/shared/common/tracking.types";
import type { Prisma } from "../../../../generated/prisma/client";
import { toPrismaInputJson } from "../admin/_base/prisma-json";
import type { TrackingCommand } from "./tracking-event-mapper";
import { TrackingStatusProjector } from "./tracking-status-projector";

const trackingEventLabelMap: Record<string, string> = {
	addedToCart: "Producto agregado al carrito",
	submittedToOrder: "Pedido confirmado",
	cartItemQuantityChanged: "Cantidad actualizada",
	cartItemRemoved: "Producto removido",
	cartItemCancelled: "Producto cancelado",
	fulfillmentException: "Incidencia de fulfillment",
	exceptionResolved: "Incidencia resuelta",
	includedInOperation: "Incluido en operacion",
	allocatedToLotItem: "Asignado a lote de proveedor",
	includedInSupplierOrder: "Pedido al proveedor",
	supplierConfirmed: "Confirmado por proveedor",
	packaged: "Empaquetado",
	movedInInternalShipment: "En envio interno",
	receivedAtWarehouse: "Recibido en deposito",
	movedInEndUserShipment: "En envio al cliente",
	delivered: "Entregado",
	rolledOverPreAllocation: "Reprogramado antes de asignacion",
	rolledOverPostAllocation: "Reprogramado despues de asignacion",
};

const timelineTrackingEventSelect = {
	id: true,
	eventKey: true,
	cartItemId: true,
	eventType: true,
	source: true,
	actorUserId: true,
	actorReference: true,
	operationId: true,
	cartItemLotItemId: true,
	packageAllocationId: true,
	lotId: true,
	lotItemId: true,
	packageId: true,
	shipmentId: true,
	rollOverId: true,
	quantity: true,
	metadata: true,
	createdAt: true,
} satisfies Prisma.CartItemTrackingEventSelect;

type TimelineTrackingEventRecord = Prisma.CartItemTrackingEventGetPayload<{
	select: typeof timelineTrackingEventSelect;
}>;

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

function actorUserIdForCommand(command: TrackingCommand) {
	if (command.source !== "user" && command.source !== "admin") return undefined;
	return command.actorId;
}

function trackingMetadata(command: TrackingCommand) {
	return toPrismaInputJson({
		...(command.metadata ?? {}),
		refs: command.refs ?? {},
	});
}

function toUserTimelineItem(
	record: TimelineTrackingEventRecord,
): UserTrackingTimelineItem {
	return {
		eventType: record.eventType,
		source: record.source,
		quantity: record.quantity?.toString(),
		createdAt: record.createdAt.toISOString(),
		label: trackingEventLabelMap[record.eventType] ?? record.eventType,
	};
}

function toAdminTimelineItem(
	record: TimelineTrackingEventRecord,
): AdminTrackingTimelineItem {
	return {
		id: record.id,
		eventKey: record.eventKey,
		cartItemId: record.cartItemId,
		eventType: record.eventType,
		source: record.source,
		actor: {
			userId: record.actorUserId,
			reference: record.actorReference,
		},
		quantity: record.quantity?.toString(),
		refs: {
			operationId: record.operationId,
			cartItemLotItemId: record.cartItemLotItemId,
			packageAllocationId: record.packageAllocationId,
			lotId: record.lotId,
			lotItemId: record.lotItemId,
			packageId: record.packageId,
			shipmentId: record.shipmentId,
			rollOverId: record.rollOverId,
		},
		metadata: record.metadata,
		createdAt: record.createdAt.toISOString(),
	};
}

// biome-ignore lint/complexity/noStaticOnlyClass: This class is a logical grouping of related functionality and is not expected to be instantiated or extended.
export class TrackingEventService {
	static async recordFromCommand(
		tx: Prisma.TransactionClient,
		command: TrackingCommand,
	) {
		const cartItemId = parsePositiveInt(command.cartItemId, "cartItemId");
		if (!cartItemId) throw new Error("cartItemId is required");

		const cartItemExists = await tx.cartItem.count({
			where: { id: cartItemId },
		});

		if (cartItemExists === 0) {
			throw new Error(`CartItem ${cartItemId} does not exist`);
		}

		const trackingEvent = await tx.cartItemTrackingEvent.upsert({
			where: { eventKey: command.eventKey },
			update: {},
			create: {
				eventKey: command.eventKey,
				cartItemId,
				eventType: command.eventType,
				source: command.source,
				actorUserId: actorUserIdForCommand(command),
				actorReference: command.actorReference ?? command.actorId,
				operationId: parsePositiveInt(command.refs?.operationId, "operationId"),
				lotId: parsePositiveInt(command.refs?.lotId, "lotId"),
				lotItemId: parsePositiveInt(command.refs?.lotItemId, "lotItemId"),
				packageId: parsePositiveInt(command.refs?.packageId, "packageId"),
				shipmentId: parsePositiveInt(command.refs?.shipmentId, "shipmentId"),
				rollOverId: parsePositiveInt(command.refs?.rolloverId, "rolloverId"),
				quantity: command.quantity,
				metadata: trackingMetadata(command),
			},
		});

		await TrackingStatusProjector.project(tx, command);

		appLogger.trackingEventRecorded({
			eventKey: command.eventKey,
			eventType: command.eventType,
			cartItemId,
			trackingEventId: trackingEvent.id,
		});

		return trackingEvent;
	}

	static async recordManyFromCommands(
		tx: Prisma.TransactionClient,
		commands: TrackingCommand[],
	) {
		const records = [];

		for (const command of commands) {
			records.push(await TrackingEventService.recordFromCommand(tx, command));
		}

		return records;
	}

	static async getUserOrderTimeline(
		userId: string,
		orderId: number,
	): Promise<UserTrackingTimelineItem[]> {
		const order = await db.userOrder.findFirst({
			where: { id: orderId, userId },
			select: {
				items: {
					select: {
						sourceCartItemId: true,
					},
				},
			},
		});

		if (!order) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "No encontramos ese pedido en tu cuenta.",
			});
		}

		const cartItemIds = order.items.map((item) => item.sourceCartItemId);
		if (cartItemIds.length === 0) return [];

		const records = await db.cartItemTrackingEvent.findMany({
			where: { cartItemId: { in: cartItemIds } },
			select: timelineTrackingEventSelect,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		return records.map(toUserTimelineItem);
	}

	static async getAdminCartTimeline(
		cartId: number,
	): Promise<AdminTrackingTimelineItem[]> {
		const records = await db.cartItemTrackingEvent.findMany({
			where: { cartItem: { cartId } },
			select: timelineTrackingEventSelect,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		return records.map(toAdminTimelineItem);
	}

	static async getAdminCartItemTimeline(
		cartItemId: number,
	): Promise<AdminTrackingTimelineItem[]> {
		const records = await db.cartItemTrackingEvent.findMany({
			where: { cartItemId },
			select: timelineTrackingEventSelect,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		return records.map(toAdminTimelineItem);
	}
}
