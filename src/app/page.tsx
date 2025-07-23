import Benefits from "~/components/home/Benefits";
import FeaturedOffers from "~/components/home/FeaturedOffers";
import Footer from "~/components/home/Footer";
import GlutenFree from "~/components/home/GlutenFree";
import Header from "~/components/home/Header";
import Hero from "~/components/home/Hero";
import HowItWorks from "~/components/home/HowItWorks";
import Newsletter from "~/components/home/Newsletter";
import PaymentModal from "~/components/home/PaymentModal";
import ProductShowcase from "~/components/home/ProductShowcase";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
	const session = await auth();
	return (
		<HydrateClient>
			<main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
				<Header />
				<Hero />
				<HowItWorks />
				<Benefits />
				<ProductShowcase />
				<FeaturedOffers />
				<GlutenFree />
				<Newsletter />
				<Footer />
				<PaymentModal />
			</main>
		</HydrateClient>
	);
}
