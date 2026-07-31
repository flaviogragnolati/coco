import type { Metadata } from "next";
import { HomeOffersClient } from "./_components/home-offers-client";

export const metadata: Metadata = {
	title: "Ofertas del home",
};

export default function HomeOffersPage() {
	return <HomeOffersClient />;
}
