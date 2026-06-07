import "server-only";

import { db } from "~/server/db";
import { AuditLogService } from "~/server/services/audit/audit-log.service";
import { appLogger } from "~/server/services/logging/app-logger.service";
import {
	type ParsedPersistedDomainEvent,
	type PersistedDomainEvent,
	parsePersistedDomainEvent,
} from "./domain-event.types";
import { domainEventListenerRegistry } from "./domain-event-listener.registry";

const MAX_ATTEMPTS = 5;
const DEFAULT_BATCH_SIZE = 50;
const STALE_LOCK_MS = 5 * 60 * 1000;

const domainEventOutboxSelect = {
	id: true,
	eventKey: true,
	eventType: true,
	aggregateType: true,
	aggregateId: true,
	payload: true,
	actor: true,
	attempts: true,
	createdAt: true,
} as const;

class ListenerDispatchError extends Error {
	constructor(
		readonly listenerName: string,
		readonly originalError: unknown,
	) {
		super(formatErrorMessage(originalError));
		this.name = "ListenerDispatchError";
	}
}

function formatErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Unknown domain event dispatch error";
}

type ErrorLogContext = {
	message: string;
	name?: string;
	stack?: string;
	listenerName?: string;
	originalError?: ErrorLogContext;
};

function formatErrorContext(error: unknown): ErrorLogContext {
	if (error instanceof ListenerDispatchError) {
		return {
			message: error.message,
			listenerName: error.listenerName,
			originalError: formatErrorContext(error.originalError),
		};
	}

	if (error instanceof Error) {
		return {
			message: error.message,
			name: error.name,
			stack: error.stack,
		};
	}

	return {
		message: formatErrorMessage(error),
	};
}

function toPersistedDomainEvent(
	record: PersistedDomainEvent,
): PersistedDomainEvent {
	return record;
}

// biome-ignore lint/complexity/noStaticOnlyClass: This class is a logical grouping of related functionality and is not expected to be instantiated or extended.
export class DomainEventDispatcher {
	static async wake(options: { batchSize?: number } = {}): Promise<void> {
		const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
		const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
		const records = await db.domainEventOutbox.findMany({
			where: {
				OR: [
					{ status: "pending" },
					{ status: "processing", lockedAt: { lt: staleBefore } },
				],
			},
			select: domainEventOutboxSelect,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: batchSize,
		});

		if (records.length === 0) return;

		appLogger.outboxDispatchStarted({
			count: records.length,
			batchSize,
		});

		for (const record of records.map(toPersistedDomainEvent)) {
			const claimed = await DomainEventDispatcher.claim(record.id, staleBefore);
			if (!claimed) continue;

			await DomainEventDispatcher.processClaimedEvent(record);
		}

		appLogger.outboxDispatchCompleted({
			count: records.length,
		});
	}

	private static async claim(id: string, staleBefore: Date): Promise<boolean> {
		const result = await db.domainEventOutbox.updateMany({
			where: {
				id,
				OR: [
					{ status: "pending" },
					{ status: "processing", lockedAt: { lt: staleBefore } },
				],
			},
			data: {
				status: "processing",
				lockedAt: new Date(),
				lastError: null,
			},
		});

		return result.count === 1;
	}

	private static async processClaimedEvent(
		event: PersistedDomainEvent,
	): Promise<void> {
		try {
			const domainEvent = parsePersistedDomainEvent(event);
			const parsedEvent: ParsedPersistedDomainEvent = {
				...event,
				domainEvent,
			};
			const listeners =
				domainEventListenerRegistry.getListenersFor(parsedEvent);

			for (const listener of listeners) {
				try {
					await listener.handle(parsedEvent);
				} catch (error) {
					throw new ListenerDispatchError(listener.name, error);
				}
			}

			await db.domainEventOutbox.update({
				where: { id: event.id },
				data: {
					status: "processed",
					processedAt: new Date(),
					lockedAt: null,
					lastError: null,
				},
			});
		} catch (error) {
			await DomainEventDispatcher.handleFailure(event, error);
		}
	}

	private static async handleFailure(
		event: PersistedDomainEvent,
		error: unknown,
	): Promise<void> {
		const attempts = event.attempts + 1;
		const exhausted = attempts >= MAX_ATTEMPTS;
		const errorMessage = formatErrorMessage(error);
		const errorContext = formatErrorContext(error);
		const listenerName =
			error instanceof ListenerDispatchError ? error.listenerName : undefined;

		await db.$transaction(async (tx) => {
			await tx.domainEventOutbox.update({
				where: { id: event.id },
				data: {
					status: exhausted ? "failed" : "pending",
					attempts: { increment: 1 },
					lastError: errorMessage,
					lockedAt: null,
					processedAt: null,
				},
			});

			if (exhausted) {
				await AuditLogService.writePermanentListenerFailure(tx, {
					eventId: event.id,
					eventKey: event.eventKey,
					eventType: event.eventType,
					listenerName,
					failureReason: errorMessage,
					attempts,
				});
			}
		});

		const logContext = {
			domainEventId: event.id,
			eventKey: event.eventKey,
			eventType: event.eventType,
			attempts,
			maxAttempts: MAX_ATTEMPTS,
			exhausted,
			error: errorContext,
		};

		if (exhausted) {
			appLogger.trackingRetryExhausted(logContext);
			return;
		}

		appLogger.trackingRetryScheduled(logContext);
	}
}
