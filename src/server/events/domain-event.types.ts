import "server-only";

import { domainEventSchema } from "~/schemas/domain-events.schemas";
import type { DomainEventInput } from "~/shared/common/domain-events.types";

export type PersistedDomainEvent = {
	id: string;
	eventKey: string;
	eventType: string;
	aggregateType: string;
	aggregateId: string;
	payload: unknown;
	actor: unknown | null;
	attempts: number;
	createdAt: Date;
};

export type ParsedPersistedDomainEvent = PersistedDomainEvent & {
	domainEvent: DomainEventInput;
};

export interface DomainEventListener {
	name: string;
	supports(event: DomainEventInput): boolean;
	handle(event: ParsedPersistedDomainEvent): Promise<void>;
}

export function parsePersistedDomainEvent(
	event: PersistedDomainEvent,
): DomainEventInput {
	return domainEventSchema.parse({
		type: event.eventType,
		eventKey: event.eventKey,
		aggregateType: event.aggregateType,
		aggregateId: event.aggregateId,
		actor: event.actor ?? undefined,
		payload: event.payload,
	});
}
