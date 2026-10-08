import type { Metadata } from "next";
import { SupplierApplicationsClient } from "./_components/supplier-applications-client";

export const metadata: Metadata = {
	title: "Solicitudes de proveedor",
};

export default function SupplierApplicationsPage() {
	return <SupplierApplicationsClient />;
}
