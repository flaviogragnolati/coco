import { ArrowRightIcon, PackageSearchIcon } from "lucide-react";
import Link from "next/link";

import { HashSafeLink } from "~/components/hash-safe-link";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import {
	ProductCardGrid,
	productCardGridWideItem,
} from "~/features/catalog/_components/product-card-grid";
import type { HomeFeature } from "~/shared/common/home.types";
import { HomeFeatureCard } from "./home-feature-card";
import { SectionHeading } from "./section-heading";

function featureKey(feature: HomeFeature) {
	return feature.kind === "product"
		? `product-${feature.offer.productId}`
		: `combo-${feature.combo.key}`;
}

export function FeaturedSection({
	featured,
	isAuthenticated,
	userId,
}: {
	featured: HomeFeature[];
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
					eyebrow="Destacados"
					title="Destacados de la semana"
				/>
				{featured.length > 0 ? (
					<ProductCardGrid>
						{featured.map((feature) =>
							feature.kind === "combo" ? (
								<div
									className={productCardGridWideItem}
									key={featureKey(feature)}
								>
									<HomeFeatureCard
										feature={feature}
										isAuthenticated={isAuthenticated}
										userId={userId}
									/>
								</div>
							) : (
								<HomeFeatureCard
									feature={feature}
									isAuthenticated={isAuthenticated}
									key={featureKey(feature)}
									userId={userId}
								/>
							),
						)}
					</ProductCardGrid>
				) : (
					<Empty className="border bg-brand-warm text-brand-warm-foreground">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<PackageSearchIcon />
							</EmptyMedia>
							<EmptyTitle>Estamos preparando los destacados</EmptyTitle>
							<EmptyDescription>
								Si buscás un producto en particular, contanos y te ayudamos a
								encontrar el próximo paso.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button asChild variant="highlight">
								<HashSafeLink href="/#contacto">Contactar a CoCo</HashSafeLink>
							</Button>
						</EmptyContent>
					</Empty>
				)}
			</div>
		</section>
	);
}
