import "server-only";

import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";
import { appLogger } from "~/server/services/logging/app-logger.service";
import type {
	AdminTrackingCartItemDetail,
	AdminTrackingListInput,
	AdminTrackingListOutput,
	AdminTrackingTimelineDetailItem,
	AdminTrackingTimelineItem,
	UserOrderItemTimeline,
	UserTrackingTimelineItem,
} from "~/shared/common/tracking.types";
import {
	type TrackingEventType,
	trackingEventLabelMap,
	type UserTrackingStageKey,
	userTrackingNoticeKindByEventType,
	userTrackingStageByEventType,
	userTrackingStageDefinitions,
} from "~/shared/common/tracking-display";
import type { Prisma } from "../~/prisma/client";
import { toPrismaInputJson } from "../admin/_base/prisma-json";
import type { TrackingCommand } from "./tracking-event-mapper";
import { TrackingStatusProjector } from "./tracking-status-projector";

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

const trackingUserSummarySelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const trackingCartItemSummarySelect = {
	id: true,
	code: true,
	quantity: true,
	status: true,
	fulfillmentStatus: true,
	deleted: true,
	productClientTerms: {
		select: {
			product: {
				select: {
					id: true,
					name: true,
					unit: true,
				},
			},
		},
	},
	cart: {
		select: {
			id: true,
			code: true,
			status: true,
			deleted: true,
			user: {
				select: trackingUserSummarySelect,
			},
		},
	},
	userOrderItems: {
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			userOrder: {
				select: {
					id: true,
					code: true,
					status: true,
				},
			},
		},
	},
} satisfies Prisma.CartItemSelect;

const adminTrackingListEventSelect = {
	...timelineTrackingEventSelect,
	actorUser: {
		select: trackingUserSummarySelect,
	},
	cartItem: {
		select: trackingCartItemSummarySelect,
	},
} satisfies Prisma.CartItemTrackingEventSelect;

const adminTrackingDetailEventSelect = {
	...timelineTrackingEventSelect,
	actorUser: {
		select: trackingUserSummarySelect,
	},
	operation: {
		select: {
			id: true,
			code: true,
			strategy: true,
		},
	},
	lot: {
		select: {
			id: true,
			code: true,
			status: true,
			supplier: {
				select: {
					name: true,
				},
			},
		},
	},
	lotItem: {
		select: {
			id: true,
			code: true,
			status: true,
			quantity: true,
			productSupplierTerms: {
				select: {
					product: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	},
	package: {
		select: {
			id: true,
			name: true,
			status: true,
			trackingCode: true,
		},
	},
	shipment: {
		select: {
			id: true,
			name: true,
			internalCode: true,
			status: true,
			type: true,
			trackingCode: true,
		},
	},
	rollOver: {
		select: {
			id: true,
			stage: true,
			status: true,
			quantity: true,
			reason: true,
		},
	},
	cartItemLotItem: {
		select: {
			id: true,
			quantity: true,
			lotItemId: true,
		},
	},
	packageAllocation: {
		select: {
			id: true,
			quantity: true,
		},
	},
} satisfies Prisma.CartItemTrackingEventSelect;

const adminTrackingCartItemDetailSelect = {
	...trackingCartItemSummarySelect,
	trackingEvents: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: adminTrackingDetailEventSelect,
	},
} satisfies Prisma.CartItemSelect;

type TimelineTrackingEventRecord = Prisma.CartItemTrackingEventGetPayload<{
	select: typeof timelineTrackingEventSelect;
}>;

type AdminTrackingListEventRecord = Prisma.CartItemTrackingEventGetPayload<{
	select: typeof adminTrackingListEventSelect;
}>;

type AdminTrackingDetailEventRecord = Prisma.CartItemTrackingEventGetPayload<{
	select: typeof adminTrackingDetailEventSelect;
}>;

type AdminTrackingCartItemDetailRecord = Prisma.CartItemGetPayload<{
	select: typeof adminTrackingCartItemDetailSelect;
}>;

const userStageIndexByKey = new Map(
	userTrackingStageDefinitions.map((stage, index) => [stage.key, index]),
);

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

function parseDateFilter(value: string | undefined, fieldName: string) {
	if (value === undefined) return undefined;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `${fieldName} no es una fecha valida.`,
		});
	}

	return date;
}

function safePositiveIntFromSearch(value: string | undefined) {
	if (!value || !/^\d+$/.test(value)) return null;

	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
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

function labelFor(eventType: string) {
	return trackingEventLabelMap[eventType as TrackingEventType] ?? eventType;
}

function toAdminRefs(record: TimelineTrackingEventRecord) {
	return {
		operationId: record.operationId,
		cartItemLotItemId: record.cartItemLotItemId,
		packageAllocationId: record.packageAllocationId,
		lotId: record.lotId,
		lotItemId: record.lotItemId,
		packageId: record.packageId,
		shipmentId: record.shipmentId,
		rollOverId: record.rollOverId,
	};
}

function toUserTimelineItem(
	record: TimelineTrackingEventRecord,
): UserTrackingTimelineItem {
	return {
		eventType: record.eventType,
		source: record.source,
		quantity: record.quantity?.toString(),
		createdAt: record.createdAt.toISOString(),
		label: labelFor(record.eventType),
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
		label: labelFor(record.eventType),
		refs: toAdminRefs(record),
		metadata: record.metadata,
		createdAt: record.createdAt.toISOString(),
	};
}

function toCartItemSummary(
	record:
		| AdminTrackingListEventRecord["cartItem"]
		| AdminTrackingCartItemDetailRecord,
) {
	return {
		id: record.id,
		code: record.code,
		quantity: record.quantity.toString(),
		status: record.status,
		fulfillmentStatus: record.fulfillmentStatus,
		deleted: record.deleted,
		product: record.productClientTerms.product,
		cart: record.cart,
		orders: record.userOrderItems.map((item) => item.userOrder),
	};
}

function toAdminTrackingListItem(record: AdminTrackingListEventRecord) {
	return {
		id: record.id,
		eventKey: record.eventKey,
		eventType: record.eventType,
		label: labelFor(record.eventType),
		source: record.source,
		actor: {
			userId: record.actorUserId,
			reference: record.actorReference,
			user: record.actorUser,
		},
		cartItem: toCartItemSummary(record.cartItem),
		quantity: record.quantity?.toString(),
		refs: toAdminRefs(record),
		createdAt: record.createdAt.toISOString(),
	};
}

function toRelated(record: AdminTrackingDetailEventRecord) {
	return {
		actorUser: record.actorUser,
		operation: record.operation
			? {
					id: record.operation.id,
					code: record.operation.code,
					strategy: record.operation.strategy,
				}
			: null,
		lot: record.lot
			? {
					id: record.lot.id,
					code: record.lot.code,
					status: record.lot.status,
					supplierName: record.lot.supplier.name,
				}
			: null,
		lotItem: record.lotItem
			? {
					id: record.lotItem.id,
					code: record.lotItem.code,
					status: record.lotItem.status,
					quantity: record.lotItem.quantity.toString(),
					productName: record.lotItem.productSupplierTerms.product.name,
				}
			: null,
		package: record.package
			? {
					id: record.package.id,
					name: record.package.name,
					status: record.package.status,
					trackingCode: record.package.trackingCode,
				}
			: null,
		shipment: record.shipment
			? {
					id: record.shipment.id,
					name: record.shipment.name,
					internalCode: record.shipment.internalCode,
					status: record.shipment.status,
					type: record.shipment.type,
					trackingCode: record.shipment.trackingCode,
				}
			: null,
		rollOver: record.rollOver
			? {
					id: record.rollOver.id,
					stage: record.rollOver.stage,
					status: record.rollOver.status,
					quantity: record.rollOver.quantity.toString(),
					reason: record.rollOver.reason,
				}
			: null,
		cartItemLotItem: record.cartItemLotItem
			? {
					id: record.cartItemLotItem.id,
					quantity: record.cartItemLotItem.quantity.toString(),
					lotItemId: record.cartItemLotItem.lotItemId,
				}
			: null,
		packageAllocation: record.packageAllocation
			? {
					id: record.packageAllocation.id,
					quantity: record.packageAllocation.quantity.toString(),
				}
			: null,
	};
}

function toAdminTrackingTimelineDetailItem(
	record: AdminTrackingDetailEventRecord,
): AdminTrackingTimelineDetailItem {
	return {
		...toAdminTimelineItem(record),
		related: toRelated(record),
	};
}

function toUserOrderItemTimeline(
	cartItemId: number,
	records: TimelineTrackingEventRecord[],
): UserOrderItemTimeline {
	const latestRecordByStage = new Map<
		UserTrackingStageKey,
		TimelineTrackingEventRecord
	>();
	const notices = [];

	for (const record of records) {
		const stageKey =
			userTrackingStageByEventType[record.eventType as TrackingEventType];
		if (stageKey) latestRecordByStage.set(stageKey, record);

		const noticeKind =
			userTrackingNoticeKindByEventType[record.eventType as TrackingEventType];
		if (noticeKind) {
			notices.push({
				eventType: record.eventType,
				kind: noticeKind,
				label: labelFor(record.eventType),
				quantity: record.quantity?.toString(),
				createdAt: record.createdAt.toISOString(),
			});
		}
	}

	const reachedStageIndexes = Array.from(latestRecordByStage.keys())
		.map((stageKey) => userStageIndexByKey.get(stageKey) ?? -1)
		.filter((index) => index >= 0);
	const currentStageIndex =
		reachedStageIndexes.length > 0 ? Math.max(...reachedStageIndexes) : -1;

	return {
		cartItemId,
		stages: userTrackingStageDefinitions.map((stage, index) => {
			const record = latestRecordByStage.get(stage.key);
			const status =
				currentStageIndex < 0
					? "pending"
					: index < currentStageIndex
						? "completed"
						: index === currentStageIndex
							? "current"
							: "pending";

			return {
				key: stage.key,
				label: stage.label,
				description: stage.description,
				status,
				eventType: record?.eventType,
				quantity: record?.quantity?.toString(),
				createdAt: record?.createdAt.toISOString(),
			};
		}),
		notices,
	};
}

function buildAdminTrackingWhere(
	input: AdminTrackingListInput,
): Prisma.CartItemTrackingEventWhereInput {
	const filters = input.filters;
	const and: Prisma.CartItemTrackingEventWhereInput[] = [];

	if (filters.eventType) and.push({ eventType: filters.eventType });
	if (filters.source) and.push({ source: filters.source });
	if (filters.actorUserId) and.push({ actorUserId: filters.actorUserId });
	if (filters.userId)
		and.push({ cartItem: { cart: { userId: filters.userId } } });
	if (filters.cartId) and.push({ cartItem: { cartId: filters.cartId } });
	if (filters.cartItemId) and.push({ cartItemId: filters.cartItemId });
	if (filters.orderId) {
		and.push({
			cartItem: {
				userOrderItems: { some: { userOrderId: filters.orderId } },
			},
		});
	}
	if (filters.operationId) and.push({ operationId: filters.operationId });
	if (filters.lotId) and.push({ lotId: filters.lotId });
	if (filters.lotItemId) and.push({ lotItemId: filters.lotItemId });
	if (filters.packageId) and.push({ packageId: filters.packageId });
	if (filters.shipmentId) and.push({ shipmentId: filters.shipmentId });
	if (filters.rollOverId) and.push({ rollOverId: filters.rollOverId });

	const createdFrom = parseDateFilter(filters.createdFrom, "createdFrom");
	const createdTo = parseDateFilter(filters.createdTo, "createdTo");
	if (createdFrom || createdTo) {
		and.push({
			createdAt: {
				gte: createdFrom,
				lte: createdTo,
			},
		});
	}

	if (filters.search) {
		const numericSearch = safePositiveIntFromSearch(filters.search);
		const searchOr: Prisma.CartItemTrackingEventWhereInput[] = [
			{ eventKey: { contains: filters.search } },
			{ actorReference: { contains: filters.search } },
			{ cartItem: { code: { contains: filters.search } } },
			{ cartItem: { cart: { code: { contains: filters.search } } } },
			{ cartItem: { cart: { user: { name: { contains: filters.search } } } } },
			{ cartItem: { cart: { user: { email: { contains: filters.search } } } } },
			{
				cartItem: {
					productClientTerms: {
						product: { name: { contains: filters.search } },
					},
				},
			},
		];

		if (numericSearch) {
			searchOr.push(
				{ id: numericSearch },
				{ cartItemId: numericSearch },
				{ cartItem: { cartId: numericSearch } },
				{
					cartItem: {
						userOrderItems: { some: { userOrderId: numericSearch } },
					},
				},
			);
		}

		and.push({ OR: searchOr });
	}

	return and.length > 0 ? { AND: and } : {};
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

	static async getUserOrderItemTimelines(
		userId: string,
		orderId: number,
	): Promise<UserOrderItemTimeline[]> {
		const order = await db.userOrder.findFirst({
			where: { id: orderId, userId },
			select: {
				items: {
					orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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

		const cartItemIds = Array.from(
			new Set(order.items.map((item) => item.sourceCartItemId)),
		);
		if (cartItemIds.length === 0) return [];

		const records = await db.cartItemTrackingEvent.findMany({
			where: { cartItemId: { in: cartItemIds } },
			select: timelineTrackingEventSelect,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});
		const recordsByCartItemId = new Map<
			number,
			TimelineTrackingEventRecord[]
		>();

		for (const record of records) {
			const current = recordsByCartItemId.get(record.cartItemId) ?? [];
			current.push(record);
			recordsByCartItemId.set(record.cartItemId, current);
		}

		return cartItemIds.map((cartItemId) =>
			toUserOrderItemTimeline(
				cartItemId,
				recordsByCartItemId.get(cartItemId) ?? [],
			),
		);
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

	static async listAdminEvents(
		input: AdminTrackingListInput,
	): Promise<AdminTrackingListOutput> {
		const pageSize = Math.min(input.pageSize, 100);
		const page = input.page;
		const where = buildAdminTrackingWhere(input);

		const [total, records] = await Promise.all([
			db.cartItemTrackingEvent.count({ where }),
			db.cartItemTrackingEvent.findMany({
				where,
				select: adminTrackingListEventSelect,
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
		]);

		return {
			items: records.map(toAdminTrackingListItem),
			page,
			pageSize,
			total,
			pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
		};
	}

	static async getAdminCartItemTimelineDetail(
		cartItemId: number,
	): Promise<AdminTrackingCartItemDetail> {
		const record = await db.cartItem.findUnique({
			where: { id: cartItemId },
			select: adminTrackingCartItemDetailSelect,
		});

		if (!record) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "No encontramos ese item de carrito.",
			});
		}

		return {
			cartItem: toCartItemSummary(record),
			timeline: record.trackingEvents.map(toAdminTrackingTimelineDetailItem),
		};
	}
}
