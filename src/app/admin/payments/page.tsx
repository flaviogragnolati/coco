import type { Metadata } from "next";
import { PaymentsAdminClient } from "./_components/payments-admin-client";

export const metadata: Metadata = {
	title: "Pagos",
};

export default function AdminPaymentsPage() {
	return <PaymentsAdminClient />;
}
