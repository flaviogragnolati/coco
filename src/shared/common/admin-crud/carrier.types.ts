import type { z } from "zod";

import type {
	carrierAddressSchema,
	carrierContactInfoSchema,
	carrierCreateInputSchema,
	carrierDeleteInputSchema,
	carrierDetailSchema,
	carrierListInputSchema,
	carrierListItemSchema,
	carrierStatsSchema,
	carrierUpdateInputSchema,
} from "~/schemas/admin/carrier.schemas";

export type CarrierAddress = z.infer<typeof carrierAddressSchema>;
export type CarrierContactInfo = z.infer<typeof carrierContactInfoSchema>;
export type CarrierListInput = z.output<typeof carrierListInputSchema>;
export type CarrierListItem = z.output<typeof carrierListItemSchema>;
export type CarrierDetail = z.output<typeof carrierDetailSchema>;
export type CarrierStats = z.output<typeof carrierStatsSchema>;
export type CarrierCreateInput = z.output<typeof carrierCreateInputSchema>;
export type CarrierUpdateInput = z.output<typeof carrierUpdateInputSchema>;
export type CarrierDeleteInput = z.output<typeof carrierDeleteInputSchema>;
export type CarrierDeleteResult = Pick<CarrierDeleteInput, "id">;
export type CarrierFormInput = z.input<typeof carrierCreateInputSchema>;
export type CarrierFormValues = z.output<typeof carrierCreateInputSchema>;
