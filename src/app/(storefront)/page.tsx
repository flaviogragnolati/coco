import type { Metadata } from "next";

import { FaqSection } from "~/features/home/_components/faq-section";
import { HomeFooter } from "~/features/home/_components/home-footer";
import { HomeHero } from "~/features/home/_components/home-hero";
import { OffersSection } from "~/features/home/_components/offers-section";
import { ProblemSolutionSection } from "~/features/home/_components/problem-solution-section";
import { TrustStrip } from "~/features/home/_components/trust-strip";
import { getSession } from "~/server/better-auth/server";
import { getHomeContent } from "~/server/services/home/home.service";

export const metadata: Metadata = {
	title: "Coco | Compras comunitarias en Ushuaia",
	description:
		"Compras comunitarias en Ushuaia. Sumate al pedido de otros vecinos, accedé a precios mayoristas y seguí tu compra hasta la entrega.",
};

export default async function Home() {
	const [session, { spotlight, offers }] = await Promise.all([
		getSession(),
		getHomeContent(),
	]);
	const user = session?.user;
	const cartProps = {
		isAuthenticated: Boolean(user),
		userId: user?.id ?? null,
	};

	return (
		<main className="flex min-h-screen flex-col">
			<HomeHero
				hasOffers={offers.length > 0}
				spotlightOffer={spotlight ?? undefined}
				{...cartProps}
			/>
			<TrustStrip />
			<ProblemSolutionSection />
			<OffersSection offers={offers} {...cartProps} />
			<FaqSection />
			<HomeFooter />
		</main>
	);
}
