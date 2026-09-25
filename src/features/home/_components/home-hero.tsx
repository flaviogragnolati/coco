import { ArrowRightIcon, BoxesIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import type { HomeOffer } from "~/shared/common/home.types";
import { heroSteps } from "../home-content";
import { HomeOfferAddButton } from "./home-offer-add-button";
import { HomeOfferCard } from "./home-offer-card";

export function HomeHero({
	spotlightOffer,
	hasOffers,
	isAuthenticated,
	userId,
}: {
	spotlightOffer?: HomeOffer;
	hasOffers: boolean;
	isAuthenticated: boolean;
	userId: string | null;
}) {
	return (
		<section className="bg-brand-ink text-brand-ink-foreground">
			<div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-12 md:px-6 md:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:gap-20">
				<div className="flex flex-col items-start gap-7">
					<span className="rounded-full border border-brand-soft/30 px-4 py-1.5 font-medium text-brand-soft text-xs tracking-wide">
						Ushuaia · Tierra del Fuego
					</span>
					<div>
						<h1 className="font-extrabold font-heading text-[clamp(76px,13vw,132px)] leading-none tracking-tight">
							coco
						</h1>
						<p className="mt-2 font-heading text-2xl text-brand-soft sm:text-3xl">
							Compras comunitarias
						</p>
					</div>
					<ol className="flex flex-col gap-5">
						{heroSteps.map(({ title, Icon }) => (
							<li className="flex items-center gap-4" key={title}>
								<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
									<Icon aria-hidden="true" className="size-5" />
								</span>
								<span className="text-base sm:text-lg">{title}</span>
							</li>
						))}
					</ol>
					<div className="flex flex-col gap-3">
						<Button
							asChild
							className="rounded-full"
							size="lg"
							variant="highlight"
						>
							<Link href={hasOffers ? "#ofertas" : "/products"}>
								Ver qué se puede comprar
								<ArrowRightIcon data-icon="inline-end" />
							</Link>
						</Button>
						<p className="text-center text-brand-ink-foreground/80 text-xs">
							Mirá el catálogo sin registrarte
						</p>
					</div>
				</div>
				{spotlightOffer ? (
					<HomeOfferCard
						action={
							<HomeOfferAddButton
								isAuthenticated={isAuthenticated}
								offer={spotlightOffer}
								userId={userId}
							/>
						}
						offer={spotlightOffer}
						size="hero"
					/>
				) : (
					<div
						aria-hidden="true"
						className="relative flex min-h-96 items-center justify-center overflow-hidden rounded-4xl bg-brand-soft text-brand-soft-foreground shadow-xl"
					>
						<div className="absolute top-8 left-8 size-24 rounded-full bg-highlight" />
						<div className="absolute right-8 bottom-10 size-36 rounded-full bg-primary/25" />
						<div className="relative flex size-48 items-center justify-center rounded-4xl bg-card shadow-xl">
							<BoxesIcon className="size-20 text-primary" />
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
