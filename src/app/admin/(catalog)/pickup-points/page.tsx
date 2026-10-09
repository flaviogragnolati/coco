import type { Metadata } from "next";
import { PickupPointCrudClient } from "./_components/pickup-point-crud-client";

export const metadata: Metadata = {
	title: "Puntos de retiro",
};

export default function PickupPointsCrudPage() {
	return <PickupPointCrudClient />;
}
