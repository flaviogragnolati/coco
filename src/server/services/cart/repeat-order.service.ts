import "server-only";

import { TRPCError } from "@trpc/server";

import { repeatOrderPreviewSchema } from "~/schemas/repeat-order.schemas";
import { db } from "~/server/db";
import type {
	CartAddItemsOutput,
	RepeatOrderInput,
	RepeatOrderPreview,
	RepeatOrderPreviewLine,
} from "~/shared/common/cart.types";
import {
	calculateLineTotal,
	formatQuantity,
	normalizeCartQuantity,
} from "~/shared/common/commerce.helpers";
import { readSnapshotQuantityUnit } from "~/shared/common/product-snapshot";
import { termsToClientTerms } from "../_base/client-terms.mapper";
import {
	type CheckoutDbClient,
	findLiveOrderByCartId,
	findOrderByUserId,
	type OrderDetailRecord,
} from "../checkout/checkout.data";
import { findCurrentCartForMutationByUserId } from "./cart.data";
import {
	addItemsInTransaction,
	findCurrentTermsByProductId,
	readAddItemsOutput,
} from "./cart.service";
import {
	collectRepeatLines,
	decideRepeatGate,
	type RepeatLine,
} from "./repeat-order.decision";

export const REPEAT_ORDER_PENDING_MESSAGE =
	"Este pedido todavía espera el pago. Vas a poder repetirlo cuando se resuelva.";
export const REPEAT_BLOCKED_MESSAGE =
	"Tenés un pedido esperando el pago. Pagalo o volvé a editarlo antes de repetir otro.";
const ORDER_NOT_FOUND_MESSAGE = "No encontramos ese pedido en tu cuenta.";
const NOTHING_SELECTED_MESSAGE = "Elegí al menos un producto del pedido.";

/**
 * The order the customer's current cart is waiting to be paid for, if any.
 * Any live order blocks, even one whose failed attempt editing would release:
 * repeating must never cancel an order on the customer's behalf.
 */
async function findWaitingOrder(database: CheckoutDbClient, userId: string) {
	const cart = await findCurrentCartForMutationByUserId(database, userId);
	if (cart?.status !== "atCheckout") return null;
	return findLiveOrderByCartId(database, cart.id);
}

async function findRequiredOrder(
	database: CheckoutDbClient,
	userId: string,
	orderId: number,
) {
	const order = await findOrderByUserId(database, userId, orderId);
	if (!order) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: ORDER_NOT_FOUND_MESSAGE,
		});
	}
	return order;
}

function readRepeatLines(order: OrderDetailRecord) {
	return collectRepeatLines(
		order.items.map((item) => ({
			quantity: item.quantity.toString(),
			productSnapshot: item.productSnapshot,
		})),
	);
}

function unavailableLine(line: RepeatLine): RepeatOrderPreviewLine {
	const { unit, presentation } = readSnapshotQuantityUnit(line.productSnapshot);
	return {
		productId: line.productId,
		name: line.name,
		available: false,
		quantity: line.quantity,
		quantityLabel: formatQuantity(line.quantity, unit, presentation),
		lineTotal: null,
		currency: null,
	};
}

/**
 * What repeating an order would add, at today's terms. Quantities are the
 * order's own, fitted to today's terms; what the cart already holds is added
 * only when the customer confirms.
 */
export async function previewRepeat(
	userId: string,
	orderId: number,
): Promise<RepeatOrderPreview> {
	const order = await findRequiredOrder(db, userId, orderId);
	const waitingOrder = await findWaitingOrder(db, userId);
	const gate = decideRepeatGate({
		orderStatus: order.status,
		hasWaitingOrder: waitingOrder !== null,
	});

	if (gate === "orderPending") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: REPEAT_ORDER_PENDING_MESSAGE,
		});
	}

	if (gate === "waitingOrder" && waitingOrder) {
		const latestTransaction = waitingOrder.transactions[0];
		return repeatOrderPreviewSchema.parse({
			state: "blocked",
			waitingOrder: {
				id: waitingOrder.id,
				code: waitingOrder.code,
				totalAmount: latestTransaction?.amount.toString() ?? "0.00",
				currency: latestTransaction?.currency ?? null,
			},
		});
	}

	const lines = readRepeatLines(order);
	const termsByProductId = await findCurrentTermsByProductId(
		db,
		lines.flatMap((line) => (line.productId === null ? [] : [line.productId])),
		new Date(),
	);

	return repeatOrderPreviewSchema.parse({
		state: "ready",
		lines: lines.map((line): RepeatOrderPreviewLine => {
			const terms =
				line.productId === null
					? undefined
					: termsByProductId.get(line.productId);
			if (!terms) return unavailableLine(line);

			const clientTerms = termsToClientTerms(terms);
			const quantity = normalizeCartQuantity(line.quantity, clientTerms);
			return {
				productId: line.productId,
				name: terms.product.name,
				available: true,
				quantity,
				quantityLabel: formatQuantity(quantity, terms.product.unit, {
					presentationContainer: terms.product.presentationContainer,
					presentationSize: terms.product.presentationSize,
				}),
				lineTotal: calculateLineTotal(clientTerms, quantity),
				currency: clientTerms.currency,
			};
		}),
	});
}

/**
 * Adds the chosen products of an earlier order to the current cart. The order
 * itself is only read. Refused before the cart is touched while another order
 * waits for its payment, so the release that editing performs never runs.
 */
export async function repeat(
	userId: string,
	input: RepeatOrderInput,
): Promise<CartAddItemsOutput> {
	const now = new Date();

	const mutation = await db.$transaction(async (tx) => {
		const order = await findRequiredOrder(tx, userId, input.orderId);
		const waitingOrder = await findWaitingOrder(tx, userId);
		const gate = decideRepeatGate({
			orderStatus: order.status,
			hasWaitingOrder: waitingOrder !== null,
		});

		if (gate !== "allowed") {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					gate === "orderPending"
						? REPEAT_ORDER_PENDING_MESSAGE
						: REPEAT_BLOCKED_MESSAGE,
			});
		}

		const selected = new Set(input.productIds);
		const requests = readRepeatLines(order).flatMap((line) =>
			line.productId !== null && selected.has(line.productId)
				? [
						{
							productId: line.productId,
							quantity: line.quantity,
							name: line.name,
						},
					]
				: [],
		);

		if (requests.length === 0) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: NOTHING_SELECTED_MESSAGE,
			});
		}

		return addItemsInTransaction(tx, userId, requests, now);
	});

	return readAddItemsOutput(mutation);
}
