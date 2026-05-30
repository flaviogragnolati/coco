import type { z } from "zod";

import type {
	supplierAddressSchema,
	supplierContactInfoSchema,
	supplierCreateInputSchema,
	supplierDeleteInputSchema,
	supplierDetailSchema,
	supplierListInputSchema,
	supplierListItemSchema,
	supplierStatsSchema,
	supplierUpdateInputSchema,
} from "~/schemas/admin/supplier.schemas";

export type SupplierAddress = z.infer<typeof supplierAddressSchema>;
export type SupplierContactInfo = z.infer<typeof supplierContactInfoSchema>;
export type SupplierListInput = z.infer<typeof supplierListInputSchema>;
export type SupplierListItem = z.infer<typeof supplierListItemSchema>;
export type SupplierDetail = z.infer<typeof supplierDetailSchema>;
export type SupplierStats = z.infer<typeof supplierStatsSchema>;
export type SupplierCreateInput = z.infer<typeof supplierCreateInputSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateInputSchema>;
export type SupplierDeleteInput = z.infer<typeof supplierDeleteInputSchema>;
export type SupplierDeleteResult = Pick<SupplierDeleteInput, "id">;
export type SupplierFormValues = SupplierCreateInput;
export type SupplierFormInput = z.input<typeof supplierCreateInputSchema>;
