import type { Metadata } from "next";

import { ContactSection } from "~/features/home/_components/contact-section";
import { FaqSection } from "~/features/home/_components/faq-section";
import { HomeFooter } from "~/features/home/_components/home-footer";
import { HomeHero } from "~/features/home/_components/home-hero";
import { HowItWorksSection } from "~/features/home/_components/how-it-works-section";
import { OffersSection } from "~/features/home/_components/offers-section";
import { getSession } from "~/server/better-auth/server";
import { getHomeContent } from "~/server/services/home/home.service";

export const metadata: Metadata = {
	title: "Coco | Comprá al por mayor sin organizar un grupo",
	description:
		"Explorá productos, armá tu pedido y pagá desde Coco. Consolidamos la demanda pagada y te acompañamos hasta la entrega.",
};

export default async function Home() {
	const [session, { spotlight, offers }] = await Promise.all([
		getSession(),
		getHomeContent(),
	]);
	const user = session?.user;
	const isActiveUser = user?.active === true && user.deleted === false;

	return (
		<main className="flex min-h-screen flex-col">
			<HomeHero spotlightOffer={spotlight ?? undefined} />
			<HowItWorksSection />
			<OffersSection offers={offers} />
			<FaqSection />
			<ContactSection isActiveUser={isActiveUser} />
			<HomeFooter />
		</main>
	);
}
