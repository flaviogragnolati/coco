import { z } from "zod";
import type { Prisma } from "~/prisma/client";
import { formatQuantity } from "~/shared/common/commerce.helpers";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { deliveryPreferenceLabelMap } from "~/shared/common/delivery-display";
import {
	readSnapshotProduct,
	readSnapshotQuantityUnit,
} from "~/shared/common/product-snapshot";
import type { PaymentNotice } from "./customer-email.data";
import type { EmailConfig } from "./email-config";
import {
	logisticsNoticeSchema,
	renderLogisticsNotice,
} from "./logistics-content";

const paymentNoticeSchema = z.object({
	kind: z.enum(["confirmed", "rejected", "transfer"]),
	attemptId: z.number().int().positive(),
});
const noticeSchema = z.intersection(
	z.object({ version: z.literal(1) }),
	z.union([paymentNoticeSchema, logisticsNoticeSchema]),
);

async function renderPayment(
	tx: Prisma.TransactionClient,
	orderId: number,
	notice: PaymentNotice,
) {
	const order = await tx.userOrder.findUniqueOrThrow({
		where: { id: orderId },
		select: {
			code: true,
			cartId: true,
			userId: true,
			status: true,
			deliveryPreference: true,
			items: {
				orderBy: { id: "asc" },
				select: { productSnapshot: true, quantity: true },
			},
			transactions: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					status: true,
					provider: true,
					amount: true,
					currency: true,
					expiresAt: true,
					declaredReceiptAt: true,
				},
			},
		},
	});
	const attempt = order.transactions.find((t) => t.id === notice.attemptId);
	if (!attempt) return null;
	const amount = new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: attempt.currency,
		currencyDisplay: "code",
	}).format(Number(attempt.amount));
	const method =
		attempt.provider === "external" ? "Transferencia" : "Mercado Pago";
	if (notice.kind === "confirmed") {
		if (
			attempt.status !== "completed" ||
			!["processing", "completed"].includes(order.status)
		)
			return null;
		const lines = [`Recibimos tu pago de ${amount} por ${method}.`];
		for (const item of order.items) {
			const { unit, presentation } = readSnapshotQuantityUnit(
				item.productSnapshot,
			);
			lines.push(
				`${readSnapshotProduct(item.productSnapshot).name} · ${formatQuantity(item.quantity.toString(), unit, presentation)}`,
			);
		}
		if (order.deliveryPreference)
			lines.push(
				`Entrega: ${deliveryPreferenceLabelMap[order.deliveryPreference]}.`,
			);
		return { title: `Confirmamos tu pedido ${order.code}`, lines };
	}
	if (
		!["pending", "failed"].includes(order.status) ||
		order.transactions[0]?.id !== attempt.id ||
		order.transactions.some((t) =>
			["completed", "refunded", "chargedBack", "inProcess"].includes(t.status),
		)
	)
		return null;
	if (notice.kind === "rejected") {
		if (attempt.status !== "failed") return null;
		// Retrying after an external rejection can create a new order on the same cart.
		if (order.status === "failed") {
			const replacement = await tx.userOrder.findFirst({
				where: {
					id: { gt: orderId },
					cartId: order.cartId,
					userId: order.userId,
					transactions: {
						some: {
							status: {
								in: [
									"pending",
									"inProcess",
									"completed",
									"refunded",
									"chargedBack",
								],
							},
						},
					},
				},
				select: { id: true },
			});
			if (replacement) return null;
		}
		return {
			title: `Se rechazó el pago de tu pedido ${order.code}`,
			lines: [`Medio de pago: ${method}.`, "Revisá el estado en Mis pedidos."],
		};
	}
	if (
		order.status !== "pending" ||
		attempt.provider !== "external" ||
		attempt.status !== "pending" ||
		attempt.declaredReceiptAt ||
		!attempt.expiresAt ||
		attempt.expiresAt.getTime() <= Date.now()
	)
		return null;
	return {
		title: `Tu pedido ${order.code} está pendiente de transferencia`,
		lines: [
			`Importe a transferir: ${amount}.`,
			`Vence el ${formatDateTimeShort(attempt.expiresAt)} (hora argentina).`,
			"En Mis pedidos podés consultar los datos bancarios y declarar el comprobante.",
		],
	};
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export async function buildEmailRequest(
	tx: Prisma.TransactionClient,
	orderId: number,
	raw: unknown,
	config: EmailConfig,
) {
	const notice = noticeSchema.parse(raw);
	const content: {
		title: string;
		lines: string[];
		quantityKey?: string;
	} | null =
		"attemptId" in notice
			? await renderPayment(tx, orderId, notice)
			: await renderLogisticsNotice(tx, orderId, notice);
	if (!content) return null;
	const order = await tx.userOrder.findUniqueOrThrow({
		where: { id: orderId },
		select: { user: { select: { email: true, active: true, deleted: true } } },
	});
	if (!order.user.active || order.user.deleted) return null;
	const recipient = z
		.email()
		.safeParse(config.testRecipient ?? order.user.email);
	if (!recipient.success) return null;
	const link = new URL("/login", config.origin);
	link.searchParams.set("callbackURL", `/my-orders/${orderId}`);
	const action =
		notice.kind === "transfer" ? "Ver datos para transferir" : "Ver mi pedido";
	return {
		...(content.quantityKey ? { quantityKey: content.quantityKey } : {}),
		from: `CoCo <${config.from}>`,
		to: recipient.data,
		subject: content.title,
		text: [
			content.title,
			...content.lines,
			`${action}: ${link.href}`,
			"CoCo",
		].join("\n\n"),
		html: `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:Arial,sans-serif;color:#18251e;line-height:1.5"><main style="max-width:560px;margin:auto;padding:24px;overflow-wrap:anywhere"><p>CoCo</p><h1>${escapeHtml(content.title)}</h1>${content.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}<p><a href="${escapeHtml(link.href)}">${action}</a></p></main></body></html>`,
	};
}
