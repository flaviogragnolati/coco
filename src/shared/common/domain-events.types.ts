import type { z } from "zod";

import type {
	domainActorSchema,
	domainEventSchema,
	domainEventTypeSchema,
} from "~/schemas/domain-events.schemas";

export type DomainActor = z.infer<typeof domainActorSchema>;
export type DomainEventInput = z.infer<typeof domainEventSchema>;
export type DomainEventType = z.infer<typeof domainEventTypeSchema>;
