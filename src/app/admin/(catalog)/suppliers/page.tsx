import type { Metadata } from "next";
import { SupplierCrudClient } from "./_components/supplier-crud-client";

export const metadata: Metadata = {
	title: "Proveedores",
};

export default function SuppliersCrudPage() {
	return <SupplierCrudClient />;
}
