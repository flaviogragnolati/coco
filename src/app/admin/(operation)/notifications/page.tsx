import type { Metadata } from "next";

import { NotificationsClient } from "./_components/notifications-client";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function AdminNotificationsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { orderId, status } = await searchParams;
	const order = typeof orderId === "string" ? orderId : "";
	const filter = typeof status === "string" ? status : "";
	return (
		<NotificationsClient
			initialOrder={order}
			initialStatus={filter}
			key={JSON.stringify([order, filter])}
		/>
	);
}
