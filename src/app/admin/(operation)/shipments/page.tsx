import type { Metadata } from "next";
import { ShipmentsClient } from "./_components/shipments-client";

export const metadata: Metadata = {
	title: "Envíos",
};

export default function AdminShipmentsPage() {
	return <ShipmentsClient />;
}
