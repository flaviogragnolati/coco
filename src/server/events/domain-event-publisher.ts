import "server-only";

import type { Prisma } from "~/prisma/client";
import { domainEventSchema } from "~/schemas/domain-events.schemas";
import { appLogger } from "~/server/services/logging/app-logger.service";
import type { DomainEventInput } from "~/shared/common/domain-events.types";
import { toPrismaInputJson } from "../services/admin/_base/prisma-json";

export class DomainEventPublisher {
	static async publish(
		tx: Prisma.TransactionClient,
		event: DomainEventInput,
	): Promise<void> {
		const parsed = domainEventSchema.parse(event);

		await tx.domainEventOutbox.upsert({
			where: { eventKey: parsed.eventKey },
			update: {},
			create: {
				eventKey: parsed.eventKey,
				eventType: parsed.type,
				aggregateType: parsed.aggregateType,
				aggregateId: parsed.aggregateId,
				payload: toPrismaInputJson(parsed.payload),
				actor:
					parsed.actor === undefined
						? undefined
						: toPrismaInputJson(parsed.actor),
				status: "pending",
			},
		});

		appLogger.domainEventPublished({
			eventKey: parsed.eventKey,
			eventType: parsed.type,
			aggregateType: parsed.aggregateType,
			aggregateId: parsed.aggregateId,
		});
	}

	static async publishMany(
		tx: Prisma.TransactionClient,
		events: DomainEventInput[],
	): Promise<void> {
		if (events.length === 0) return;

		const parsedEvents = events.map((event) => domainEventSchema.parse(event));

		await tx.domainEventOutbox.createMany({
			data: parsedEvents.map((event) => ({
				eventKey: event.eventKey,
				eventType: event.type,
				aggregateType: event.aggregateType,
				aggregateId: event.aggregateId,
				payload: toPrismaInputJson(event.payload),
				actor:
					event.actor === undefined
						? undefined
						: toPrismaInputJson(event.actor),
				status: "pending" as const,
			})),
			skipDuplicates: true,
		});

		appLogger.domainEventPublished({
			count: parsedEvents.length,
			eventKeys: parsedEvents.map((event) => event.eventKey),
			eventTypes: Array.from(new Set(parsedEvents.map((event) => event.type))),
		});
	}
}
