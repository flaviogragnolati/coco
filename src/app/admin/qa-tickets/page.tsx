import type { Metadata } from "next";
import { requireAdmin } from "~/server/auth/route-guards";
import { QaTicketsClient } from "./_components/qa-tickets-client";

export const metadata: Metadata = {
	title: "Tickets de QA",
};

export default async function QaTicketsPage() {
	const session = await requireAdmin();
	return <QaTicketsClient currentUserId={session.user.id} />;
}
