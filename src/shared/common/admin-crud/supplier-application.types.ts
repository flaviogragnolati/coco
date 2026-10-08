import type { z } from "zod";

import type {
	supplierApplicationListInputSchema,
	supplierApplicationListItemSchema,
	supplierApplicationMarkContactedInputSchema,
	supplierApplicationStatusSchema,
} from "~/schemas/admin/supplier-application.schemas";

export type SupplierApplicationStatus = z.output<
	typeof supplierApplicationStatusSchema
>;
export type SupplierApplicationListInput = z.output<
	typeof supplierApplicationListInputSchema
>;
export type SupplierApplicationListItem = z.output<
	typeof supplierApplicationListItemSchema
>;
export type SupplierApplicationMarkContactedInput = z.output<
	typeof supplierApplicationMarkContactedInputSchema
>;
