import type { Metadata } from "next";
import { AddressCrudClient } from "./_components/address-crud-client";

export const metadata: Metadata = {
	title: "Direcciones",
};

export default function AddressesCrudPage() {
	return <AddressCrudClient />;
}
