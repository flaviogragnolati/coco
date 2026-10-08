import { ArrowRightIcon, PackageSearchIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import type { HomeContent, HomeOffer } from "~/shared/common/home.types";
import { HomeOfferAddButton } from "./home-offer-add-button";
import { HomeOfferCard } from "./home-offer-card";
import { HomeOffersGrid } from "./home-offers-grid";
import { SectionHeading } from "./section-heading";

// The title promises what the admin's criterion actually ranks by.
const offersTitleByCriterion: Record<HomeContent["offersCriterion"], string> = {
	orderVolume: "Los productos más pedidos",
	discountPercent: "Los mejores descuentos",
	marketSaving: "Ofertas destacadas",
};

export function OffersSection({
	offers,
	offersLimit,
	criterion,
	isAuthenticated,
	userId,
}: {
	offers: HomeOffer[];
	offersLimit: number;
	criterion: HomeContent["offersCriterion"];
	isAuthenticated: boolean;
	userId: string | null;
}) {
	return (
		<section className="scroll-mt-20 px-4 py-16 md:px-6 md:py-20" id="ofertas">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
				<SectionHeading
					actions={
						<Button asChild variant="outline">
							<Link href="/products">
								Ver todo el catálogo
								<ArrowRightIcon data-icon="inline-end" />
							</Link>
						</Button>
					}
					eyebrow="Ofertas"
					title={offersTitleByCriterion[criterion]}
				/>
				{offers.length > 0 ? (
					<HomeOffersGrid
						items={offers.map((offer) => ({
							key: offer.productClientTermsId,
							unit: offer.unit,
							card: (
								<HomeOfferCard
									action={
										<HomeOfferAddButton
											isAuthenticated={isAuthenticated}
											offer={offer}
											userId={userId}
										/>
									}
									offer={offer}
								/>
							),
						}))}
						visibleCount={offersLimit}
					/>
				) : (
					<Empty className="border bg-brand-warm text-brand-warm-foreground">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<PackageSearchIcon />
							</EmptyMedia>
							<EmptyTitle>Estamos preparando nuevas ofertas</EmptyTitle>
							<EmptyDescription>
								Si buscás un producto en particular, contanos y te ayudamos a
								encontrar el próximo paso.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button asChild variant="highlight">
								<Link href="/#contacto">Contactar a Coco</Link>
							</Button>
						</EmptyContent>
					</Empty>
				)}
			</div>
		</section>
	);
}
