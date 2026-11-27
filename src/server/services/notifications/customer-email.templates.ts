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

function renderOrderEmailHtml(
	content: { title: string; lines: string[] },
	action: string,
	link: URL,
) {
	const paragraphs = content.lines.map(
		(line) =>
			`<p style="margin:0 0 12px;font-size:16px;line-height:24px;">${escapeHtml(line)}</p>`,
	);
	return `<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FBF1DF;color:#0F2A30;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FBF1DF;">
    <tr><td align="center" style="padding:24px 12px;">
      <!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;table-layout:fixed;text-align:left;background-color:#FFFFFF;border-radius:16px;">
        <tr>
          <td style="padding:20px 24px;background-color:#0F2A30;color:#C9F0E6;border-radius:16px 16px 0 0;">
            <p style="margin:0;font-size:34px;font-weight:800;line-height:36px;letter-spacing:-2px;">coco</p>
            <p style="margin:4px 0 0;font-size:14px;line-height:20px;">Compras comunitarias</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 32px;color:#0F2A30;overflow-wrap:anywhere;word-wrap:break-word;">
            <h1 style="margin:0 0 20px;font-size:28px;font-weight:700;line-height:34px;letter-spacing:-0.8px;text-wrap:balance;">${escapeHtml(content.title)}</h1>
            ${paragraphs.join("\n            ")}
            <p style="margin:24px 0 0;">
              <a href="${escapeHtml(link.href)}" style="display:inline-block;background-color:#F5833E;color:#341507;border:solid #F5833E;border-width:12px 18px;border-radius:24px;font-size:16px;font-weight:700;line-height:20px;text-decoration:none;">${escapeHtml(action)}</a>
            </p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
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
		html: renderOrderEmailHtml(content, action, link),
	};
}
