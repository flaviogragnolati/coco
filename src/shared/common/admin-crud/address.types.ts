import type { z } from "zod";

import type {
	addressCreateInputSchema,
	addressDeleteInputSchema,
	addressDetailSchema,
	addressEmbeddedDetailSchema,
	addressEmbeddedInputSchema,
	addressListInputSchema,
	addressListItemSchema,
	addressStatsSchema,
	addressTypeSchema,
	addressUpdateInputSchema,
	addressUserSummarySchema,
} from "~/schemas/admin/address.schemas";

export type AddressType = z.output<typeof addressTypeSchema>;
export type AddressUserSummary = z.output<typeof addressUserSummarySchema>;
export type AddressEmbeddedInput = z.output<typeof addressEmbeddedInputSchema>;
export type AddressEmbeddedDetail = z.output<
	typeof addressEmbeddedDetailSchema
>;
export type AddressListInput = z.output<typeof addressListInputSchema>;
export type AddressListItem = z.output<typeof addressListItemSchema>;
export type AddressDetail = z.output<typeof addressDetailSchema>;
export type AddressStats = z.output<typeof addressStatsSchema>;
export type AddressCreateInput = z.output<typeof addressCreateInputSchema>;
export type AddressUpdateInput = z.output<typeof addressUpdateInputSchema>;
export type AddressDeleteInput = z.output<typeof addressDeleteInputSchema>;
export type AddressDeleteResult = Pick<AddressDeleteInput, "id">;
export type AddressFormInput = z.input<typeof addressCreateInputSchema>;
export type AddressFormValues = z.output<typeof addressCreateInputSchema>;
