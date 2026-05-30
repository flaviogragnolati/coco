import type { z } from "zod";

import type {
	productLocalConstraintsCreateInputSchema,
	productLocalConstraintsDeleteInputSchema,
	productLocalConstraintsDetailSchema,
	productLocalConstraintsIdSchema,
	productLocalConstraintsListInputSchema,
	productLocalConstraintsListItemSchema,
	productLocalConstraintsStatsSchema,
	productLocalConstraintsUpdateInputSchema,
	productLocalConstraintTypeSchema,
} from "~/schemas/admin/product-local-constraints.schemas";

export type ProductLocalConstraintType = z.output<
	typeof productLocalConstraintTypeSchema
>;
export type ProductLocalConstraintsId = z.output<
	typeof productLocalConstraintsIdSchema
>;
export type ProductLocalConstraintsListInput = z.output<
	typeof productLocalConstraintsListInputSchema
>;
export type ProductLocalConstraintsListItem = z.output<
	typeof productLocalConstraintsListItemSchema
>;
export type ProductLocalConstraintsDetail = z.output<
	typeof productLocalConstraintsDetailSchema
>;
export type ProductLocalConstraintsStats = z.output<
	typeof productLocalConstraintsStatsSchema
>;
export type ProductLocalConstraintsCreateInput = z.output<
	typeof productLocalConstraintsCreateInputSchema
>;
export type ProductLocalConstraintsUpdateInput = z.output<
	typeof productLocalConstraintsUpdateInputSchema
>;
export type ProductLocalConstraintsDeleteInput = z.output<
	typeof productLocalConstraintsDeleteInputSchema
>;
export type ProductLocalConstraintsDeleteResult = Pick<
	ProductLocalConstraintsDeleteInput,
	"id"
>;
export type ProductLocalConstraintsFormInput = z.input<
	typeof productLocalConstraintsCreateInputSchema
>;
export type ProductLocalConstraintsFormValues = z.output<
	typeof productLocalConstraintsCreateInputSchema
>;
