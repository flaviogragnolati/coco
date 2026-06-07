import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { HomeFeaturedProduct } from "~/shared/common/home.types";
import { featuredBenefits } from "../home-content";
import { FeaturedProductCard } from "./featured-product-card";
import { SectionHeading } from "./section-heading";

export function FeaturedSection({
	featuredProducts,
	isActiveUser,
}: {
	featuredProducts: HomeFeaturedProduct[];
	isActiveUser: boolean;
}) {
	const ctaHref = isActiveUser ? "/my-operations" : "/login";

	return (
		<section className="border-y bg-muted/30" id="destacados">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 md:px-6">
				<SectionHeading
					description="Coco esta pensado para bajar friccion operativa y habilitar mejores condiciones de compra."
					eyebrow="Destacados"
					title="Menos coordinacion, mas poder de compra."
				/>
				<div className="grid gap-3 md:grid-cols-4">
					{featuredBenefits.map(({ title, description, Icon }) => (
						<Card key={title}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Icon />
									{title}
								</CardTitle>
								<CardDescription>{description}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
				{featuredProducts.length > 0 ? (
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<h3 className="font-heading font-semibold text-lg">
								Productos con condiciones vigentes
							</h3>
							<p className="text-muted-foreground text-xs/relaxed">
								Una muestra de productos reales disponibles para operar en Coco.
							</p>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							{featuredProducts.map((product) => (
								<FeaturedProductCard key={product.id} product={product} />
							))}
						</div>
					</div>
				) : null}
				<div>
					<Button asChild>
						<Link href={ctaHref}>
							{isActiveUser ? "Ver operaciones" : "Unirme a Coco"}
							<ArrowRightIcon data-icon="inline-end" />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
