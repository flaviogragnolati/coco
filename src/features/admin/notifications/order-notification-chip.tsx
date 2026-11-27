"use client";

import Link from "next/link";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { notificationSummaryBatchSize } from "~/schemas/admin/notification.schemas";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";
import { api } from "~/trpc/react";

type OrderMailState =
	| {
			state: "ready";
			mode: "off" | "test" | "live";
			accepted: number;
			total: number;
	  }
	| { state: "error"; retry: () => void };

export function useOrderMailSummaries(orders: readonly { id: number }[]) {
	const ids = [...new Set(orders.map((order) => order.id))].sort(
		(a, b) => a - b,
	);
	const batches: number[][] = [];
	for (
		let index = 0;
		index < ids.length;
		index += notificationSummaryBatchSize
	) {
		batches.push(ids.slice(index, index + notificationSummaryBatchSize));
	}
	const queries = api.useQueries((t) =>
		batches.map((orderIds) =>
			t.admin.notification.summarizeOrders(
				{ orderIds },
				{ refetchInterval: 30_000 },
			),
		),
	);
	const summaries = new Map<number, OrderMailState>();
	for (const [index, query] of queries.entries()) {
		if (query.isError) {
			for (const id of batches[index] ?? [])
				summaries.set(id, {
					state: "error",
					retry: () => void query.refetch(),
				});
		} else if (query.data) {
			for (const order of query.data.orders)
				summaries.set(order.orderId, {
					state: "ready",
					mode: query.data.mode,
					accepted: order.accepted,
					total: order.total,
				});
		}
	}
	return summaries;
}

export function OrderNotificationChip({
	orderId,
	summary,
}: {
	orderId: number;
	summary?: OrderMailState;
}) {
	if (!summary)
		return (
			<span className="text-muted-foreground text-xs">Consultando mails…</span>
		);
	if (summary.state === "error")
		return (
			<button
				className="text-sm underline"
				onClick={summary.retry}
				type="button"
			>
				Reintentar consulta de mails
			</button>
		);
	const { total, accepted, mode } = summary;
	let label = "Sin registro de mail";
	let preset = statusPresets.inert;
	if (mode === "off") label = "Correo desactivado";
	else if (total > 0) {
		const mail = total === 1 ? "mail" : "mails";
		label = `${accepted} de ${total} ${mail}${mode === "test" ? " de prueba" : ""} ${total === 1 ? "enviado" : "enviados"}`;
		preset =
			total === accepted ? statusPresets.success : statusPresets.inProgress;
	}
	return (
		<Link
			aria-label={`${label}. Ver historial de mails del pedido ${orderId}`}
			className="w-fit rounded-full focus-visible:ring-2 focus-visible:ring-ring"
			href={`/admin/notifications?orderId=${orderId}&status=all`}
		>
			<StatusChip config={{ ...preset, label }} />
		</Link>
	);
}
