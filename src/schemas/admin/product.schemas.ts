import { z } from "zod";
import { adminOptionsInputBase } from "~/schemas/admin/_options.schemas";
import {
	brandIdSchema,
	brandInlineCreateInputSchema,
} from "~/schemas/admin/brand.schemas";
import { categoryIdSchema } from "~/schemas/admin/category.schemas";
import { supplierIdSchema } from "~/schemas/admin/supplier.schemas";
import { cartItemSchema } from "~/schemas/cart.schemas";
import {
	catalogProductDetailSchema,
	productPresentationContainerSchema,
} from "~/schemas/catalog.schemas";
import { homeOfferSchema } from "~/schemas/home.schemas";
import { nullishText, optionalUrl, requiredText } from "./_crud-schema-helpers";

const imageUrlSchema = z.string().trim().url("Ingresá una URL válida");

const productReferenceBrandSchema = z.object({
	id: brandIdSchema,
	name: z.string(),
	deleted: z.boolean(),
});

const productReferenceCategorySchema = z.object({
	id: categoryIdSchema,
	name: z.string(),
	deleted: z.boolean(),
});

const productReferenceSupplierSchema = z.object({
	id: supplierIdSchema,
	name: z.string(),
	deleted: z.boolean(),
});

export const productIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const productUnitSchema = z.enum([
	"kg",
	"lb",
	"piece",
	"box",
	"gr",
	"other",
]);

export const productBrandAssignmentSchema = z.discriminatedUnion("mode", [
	z.object({
		mode: z.literal("none"),
	}),
	z.object({
		mode: z.literal("existing"),
		brandId: brandIdSchema,
	}),
	z.object({
		mode: z.literal("new"),
		brand: brandInlineCreateInputSchema,
	}),
]);

const productWeightUnits: ReadonlySet<string> = new Set(["kg", "gr", "lb"]);

/** The select's empty option means "no container". */
const optionalPresentationContainer = z
	.union([productPresentationContainerSchema, z.literal("")])
	.nullish()
	.transform((value) => (value ? value : undefined));

function validatePresentation(
	value: {
		unit: string;
		presentationContainer?: string;
		presentationSize?: string;
	},
	ctx: z.RefinementCtx,
) {
	if (productWeightUnits.has(value.unit)) {
		if (value.presentationContainer || value.presentationSize) {
			ctx.addIssue({
				code: "custom",
				message: "Los productos por peso no llevan presentación",
				path: ["presentationContainer"],
			});
		}
		return;
	}

	if (value.presentationSize && !value.presentationContainer) {
		ctx.addIssue({
			code: "custom",
			message: "Elegí el envase del tamaño",
			path: ["presentationContainer"],
		});
	}
}

const productInputFieldsSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	description: nullishText,
	cartImageUrl: optionalUrl,
	cardImageUrl: optionalUrl,
	images: z.array(imageUrlSchema).default([]),
	unit: productUnitSchema,
	presentationContainer: optionalPresentationContainer,
	presentationSize: nullishText,
	brandAssignment: productBrandAssignmentSchema,
	categoryId: z.number({ error: "Elegí una categoría" }).pipe(categoryIdSchema),
	defaultSupplierId: supplierIdSchema.optional(),
	active: z.boolean().default(true),
});

export const productCreateInputSchema =
	productInputFieldsSchema.superRefine(validatePresentation);

export const productUpdateInputSchema = productInputFieldsSchema
	.extend({
		id: productIdSchema,
	})
	.superRefine(validatePresentation);

export const productDeleteInputSchema = z.object({
	id: productIdSchema,
});

export const productListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const productOptionsInputSchema = adminOptionsInputBase.extend({
	selectedValue: z.string().optional(),
});

export const productListItemSchema = z.object({
	id: productIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	unit: productUnitSchema,
	presentationContainer: productPresentationContainerSchema.nullable(),
	presentationSize: z.string().nullable(),
	cartImageUrl: z.string().nullable(),
	brand: productReferenceBrandSchema.nullable(),
	category: productReferenceCategorySchema.nullable(),
	defaultSupplier: productReferenceSupplierSchema.nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const productDetailSchema = z.object({
	id: productIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	cartImageUrl: z.string().nullable(),
	cardImageUrl: z.string().nullable(),
	images: z.array(z.string()),
	unit: productUnitSchema,
	presentationContainer: productPresentationContainerSchema.nullable(),
	presentationSize: z.string().nullable(),
	brand: productReferenceBrandSchema.nullable(),
	category: productReferenceCategorySchema.nullable(),
	defaultSupplier: productReferenceSupplierSchema.nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const productStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const productPreviewSchema = z.object({
	adminProduct: productDetailSchema,
	catalogProduct: catalogProductDetailSchema.nullable(),
	cartItem: cartItemSchema.nullable(),
	homeOffer: homeOfferSchema.nullable(),
	warnings: z.array(z.string()),
});

export const productListOutputSchema = z.array(productListItemSchema);
