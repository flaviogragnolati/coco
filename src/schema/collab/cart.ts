import { z } from "zod";

import { CartStatusSchema } from "./enums";

export const CartItemContributionSchema = z.object({
  userId: z.string().min(1),
  quantity: z.number().nonnegative(),
});

export const CartItemSchema = z
  .object({
    id: z.string().min(1),
    cartId: z.string().min(1),
    productId: z.string().min(1),
    quantity: z.number().positive(),
  })
  .superRefine((item, ctx) => {
    if (!Number.isInteger(item.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad debe ser un entero",
        path: ["quantity"],
      });
    }
  });

export const CartSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  status: CartStatusSchema,
  paidAt: z.coerce.date().optional().nullable(),
  items: z.array(CartItemSchema),
});

export type Cart = z.infer<typeof CartSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
