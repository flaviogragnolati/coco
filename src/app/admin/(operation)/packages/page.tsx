import type { Metadata } from "next";
import { PackagesClient } from "./_components/packages-client";

export const metadata: Metadata = {
	title: "Paquetes",
};

export default function AdminPackagesPage() {
	return <PackagesClient />;
}
