import "server-only";

import { TrackingDomainEventListener } from "~/server/services/tracking/tracking-domain-event.listener";
import type {
	DomainEventListener,
	ParsedPersistedDomainEvent,
} from "./domain-event.types";

export class DomainEventListenerRegistry {
	private readonly listeners: DomainEventListener[] = [];

	register(listener: DomainEventListener): void {
		this.listeners.push(listener);
	}

	getListenersFor(event: ParsedPersistedDomainEvent): DomainEventListener[] {
		return this.listeners.filter((listener) =>
			listener.supports(event.domainEvent),
		);
	}
}

export const domainEventListenerRegistry = new DomainEventListenerRegistry();

domainEventListenerRegistry.register(new TrackingDomainEventListener());
