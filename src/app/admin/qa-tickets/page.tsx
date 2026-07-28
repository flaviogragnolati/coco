import type { Metadata } from "next";
import { QaTicketsClient } from "./_components/qa-tickets-client";

export const metadata: Metadata = {
	title: "Tickets de QA",
};

export default function QaTicketsPage() {
	return <QaTicketsClient />;
}
