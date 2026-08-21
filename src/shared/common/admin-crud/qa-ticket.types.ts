import type { z } from "zod";

import type {
	qaTicketClaimInputSchema,
	qaTicketCreateInputSchema,
	qaTicketDeleteInputSchema,
	qaTicketDetailSchema,
	qaTicketEvidenceMetadataSchema,
	qaTicketListInputSchema,
	qaTicketListItemSchema,
	qaTicketLogInputSchema,
	qaTicketLogSchema,
	qaTicketSaveResultInputSchema,
	qaTicketStatsSchema,
	qaTicketStatusSchema,
	qaTicketUpdateInputSchema,
} from "~/schemas/admin/qa-ticket.schemas";

export type QaTicketStatus = z.output<typeof qaTicketStatusSchema>;
export type QaTicketListInput = z.output<typeof qaTicketListInputSchema>;
export type QaTicketListItem = z.output<typeof qaTicketListItemSchema>;
export type QaTicketDetail = z.output<typeof qaTicketDetailSchema>;
export type QaTicketStats = z.output<typeof qaTicketStatsSchema>;
export type QaTicketCreateInput = z.output<typeof qaTicketCreateInputSchema>;
export type QaTicketUpdateInput = z.output<typeof qaTicketUpdateInputSchema>;
export type QaTicketDeleteInput = z.output<typeof qaTicketDeleteInputSchema>;
export type QaTicketSaveResultInput = z.output<
	typeof qaTicketSaveResultInputSchema
>;
export type QaTicketLogInput = z.output<typeof qaTicketLogInputSchema>;
export type QaTicketLog = z.output<typeof qaTicketLogSchema>;
export type QaTicketEvidenceMetadata = z.output<
	typeof qaTicketEvidenceMetadataSchema
>;
export type QaTicketClaimInput = z.output<typeof qaTicketClaimInputSchema>;
export type QaTicketDeleteResult = Pick<QaTicketDeleteInput, "id">;
export type QaTicketFormInput = z.input<typeof qaTicketCreateInputSchema>;
export type QaTicketFormValues = z.output<typeof qaTicketCreateInputSchema>;
