import type { Metadata } from "next";

import { ContactSection } from "~/features/home/_components/contact-section";
import { CurrentOffersSection } from "~/features/home/_components/current-offers-section";
import { FeaturedSection } from "~/features/home/_components/featured-section";
import { HomeFooter } from "~/features/home/_components/home-footer";
import { HomeHero } from "~/features/home/_components/home-hero";
import { HowItWorksSection } from "~/features/home/_components/how-it-works-section";
import { JoinSection } from "~/features/home/_components/join-section";
import { isAdminRole } from "~/server/auth/auth.utils";
import { getSession } from "~/server/better-auth/server";
import {
	getHomeFeaturedProducts,
	getHomeOffers,
} from "~/server/services/home/home.service";

export const metadata: Metadata = {
	title: "Coco | Compra mayorista compartida",
	description:
		"Suma tu pedido a compras consolidadas y accede a mejores precios mayoristas sin coordinar con otros compradores.",
};

export default async function Home() {
	const [session, offers, featuredProducts] = await Promise.all([
		getSession(),
		getHomeOffers(),
		getHomeFeaturedProducts(),
	]);
	const user = session?.user;
	const isActiveUser = user?.active === true && user.deleted === false;
	const canAccessAdmin = isActiveUser && isAdminRole(user.role);

	return (
		<main className="flex min-h-screen flex-col bg-background">
			<HomeHero
				canAccessAdmin={canAccessAdmin}
				isActiveUser={isActiveUser}
				spotlightOffer={offers[0]}
			/>
			<HowItWorksSection />
			<JoinSection isActiveUser={isActiveUser} />
			<CurrentOffersSection isActiveUser={isActiveUser} offers={offers} />
			<FeaturedSection
				featuredProducts={featuredProducts}
				isActiveUser={isActiveUser}
			/>
			<ContactSection />
			<HomeFooter />
		</main>
	);
}
