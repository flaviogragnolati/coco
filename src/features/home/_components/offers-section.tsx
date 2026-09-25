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
import type { HomeOffer } from "~/shared/common/home.types";
import { HomeOfferAddButton } from "./home-offer-add-button";
import { HomeOfferCard } from "./home-offer-card";
import { SectionHeading } from "./section-heading";

export function OffersSection({
	offers,
	isAuthenticated,
	userId,
}: {
	offers: HomeOffer[];
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
					eyebrow="Ofertas destacadas"
					title="Lo que se está juntando ahora"
				/>
				{offers.length > 0 ? (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(min(255px,100%),1fr))] gap-5">
						{offers.map((offer) => (
							<HomeOfferCard
								action={
									<HomeOfferAddButton
										isAuthenticated={isAuthenticated}
										offer={offer}
										userId={userId}
									/>
								}
								key={offer.productClientTermsId}
								offer={offer}
							/>
						))}
					</div>
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
