import { Badge } from "~/components/ui/badge";
import type { HomeOffer } from "~/shared/common/home.types";
import { HomeOfferAddButton } from "./home-offer-add-button";
import { HomeOfferCard } from "./home-offer-card";

export function HomeSpotlightBand({
	offer,
	isAuthenticated,
	userId,
}: {
	offer: HomeOffer;
	isAuthenticated: boolean;
	userId: string | null;
}) {
	return (
		<section
			aria-label="Producto destacado"
			className="bg-brand-soft px-4 py-12 text-brand-soft-foreground md:px-6 md:py-16"
		>
			<div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-12">
				<div className="flex flex-col items-start gap-3">
					<Badge variant="highlight">Producto destacado</Badge>
					<p className="text-base/relaxed sm:text-lg/relaxed">
						Sumalo a tu pedido desde acá o seguí mirando las ofertas de abajo.
					</p>
				</div>
				<HomeOfferCard
					action={
						<HomeOfferAddButton
							isAuthenticated={isAuthenticated}
							offer={offer}
							userId={userId}
						/>
					}
					offer={offer}
					size="hero"
				/>
			</div>
		</section>
	);
}
