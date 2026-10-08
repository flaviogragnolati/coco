import type { z } from "zod";

import type { supplierApplicationSubmitInputSchema } from "~/schemas/supplier-application.schemas";

export type SupplierApplicationSubmitInput = z.output<
	typeof supplierApplicationSubmitInputSchema
>;
export type SupplierApplicationFormInput = z.input<
	typeof supplierApplicationSubmitInputSchema
>;
