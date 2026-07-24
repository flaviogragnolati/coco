import type { Metadata } from "next";
import { OperationsClient } from "./_components/operations-client";

export const metadata: Metadata = {
	title: "Operaciones",
};

export default function AdminOperationsOperationsPage() {
	return <OperationsClient />;
}
