import type { Metadata } from "next";
import { LotsClient } from "./_components/lots-client";

export const metadata: Metadata = {
	title: "Lotes",
};

export default function AdminLotsPage() {
	return <LotsClient />;
}
