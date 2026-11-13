import "server-only";

import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";
import type { CartAddItemsOutput } from "~/shared/common/cart.types";
import { findActiveComboForCart } from "./cart.data";
import { addItems } from "./cart.service";

export const COMBO_UNAVAILABLE_MESSAGE = "Ese combo ya no está disponible.";

/**
 * Adds a combo's products as ordinary cart lines (ADR 0014). It reads the
 * combo and today's terms on the server and never trusts the card the
 * customer saw.
 */
export async function addCombo(
	userId: string,
	comboId: number,
): Promise<CartAddItemsOutput> {
	const combo = await findActiveComboForCart(db, comboId);
	if (!combo) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: COMBO_UNAVAILABLE_MESSAGE,
		});
	}

	return addItems(
		userId,
		combo.items.map((item) => ({
			productId: item.productId,
			quantity: item.quantity.toString(),
			name: item.product.name,
		})),
	);
}
