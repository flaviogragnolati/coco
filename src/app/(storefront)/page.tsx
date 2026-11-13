import type { Metadata } from "next";

import { FaqSection } from "~/features/home/_components/faq-section";
import { HomeFooter } from "~/features/home/_components/home-footer";
import { HomeHero } from "~/features/home/_components/home-hero";
import { HomeSpotlightBand } from "~/features/home/_components/home-spotlight-band";
import { HowItWorksSection } from "~/features/home/_components/how-it-works-section";
import { OffersSection } from "~/features/home/_components/offers-section";
import { getFaqItems } from "~/features/home/home-content";
import { getSession } from "~/server/better-auth/server";
import {
	getFaqPickupPoints,
	getHomeContent,
} from "~/server/services/home/home.service";
import { getWeeklyClosingSchedule } from "~/server/services/weekly-closing/weekly-closing.service";

export const metadata: Metadata = {
	title: "CoCo | Compras comunitarias en Ushuaia",
	description:
		"Compras comunitarias en Ushuaia. Sumate al pedido de otros vecinos, accedé a precios mayoristas y seguí tu compra hasta la entrega.",
};

export default async function Home() {
	const [
		session,
		{ spotlight, offers, offersLimit, offersCriterion },
		schedule,
		pickupPoints,
	] = await Promise.all([
		getSession(),
		getHomeContent(),
		getWeeklyClosingSchedule(),
		getFaqPickupPoints(),
	]);
	const user = session?.user;
	const cartProps = {
		isAuthenticated: Boolean(user),
		userId: user?.id ?? null,
	};

	return (
		<main className="flex min-h-screen flex-col">
			<HomeHero schedule={schedule} />
			<HowItWorksSection schedule={schedule} />
			{spotlight ? (
				<HomeSpotlightBand offer={spotlight} {...cartProps} />
			) : null}
			<OffersSection
				criterion={offersCriterion}
				offers={offers}
				offersLimit={offersLimit}
				{...cartProps}
			/>
			<FaqSection items={getFaqItems(schedule, pickupPoints)} />
			<HomeFooter />
		</main>
	);
}
