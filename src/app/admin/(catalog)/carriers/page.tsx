import type { Metadata } from "next";
import { CarrierCrudClient } from "./_components/carrier-crud-client";

export const metadata: Metadata = {
	title: "Transportistas",
};

export default function CarriersCrudPage() {
	return <CarrierCrudClient />;
}
