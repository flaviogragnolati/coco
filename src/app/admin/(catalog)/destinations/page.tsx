import type { Metadata } from "next";
import { DestinationCrudClient } from "./_components/destination-crud-client";

export const metadata: Metadata = {
	title: "Destinos",
};

export default function DestinationsCrudPage() {
	return <DestinationCrudClient />;
}
