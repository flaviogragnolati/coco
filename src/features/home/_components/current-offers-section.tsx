import {
	ArrowRightIcon,
	ImageIcon,
	PackageSearchIcon,
	ShoppingBagIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	formatQuantity,
	getOfferDisplayPrice,
	getOfferPriceLabel,
} from "../home-formatters";
import { SectionHeading } from "./section-heading";

function OfferImage({ offer }: { offer: HomeOffer }) {
	if (offer.imageUrl) {
		return (
			<div
				aria-label={offer.productName}
				className="aspect-[4/3] w-full bg-center bg-cover"
				role="img"
				style={{ backgroundImage: `url(${offer.imageUrl})` }}
			/>
		);
	}

	return (
		<div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-muted-foreground">
			<ImageIcon />
		</div>
	);
}

function OfferCard({ offer, ctaHref }: { offer: HomeOffer; ctaHref: string }) {
	return (
		<Card>
			<OfferImage offer={offer} />
			<CardHeader>
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">Vigente</Badge>
					<Badge variant="outline">
						MOQ {formatQuantity(offer.moq, offer.unit)}
					</Badge>
				</div>
				<CardTitle>{offer.productName}</CardTitle>
				<CardDescription>
					{offer.brandName ?? "Marca disponible proximamente"}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<p className="line-clamp-3 text-muted-foreground text-xs/relaxed">
					{offer.productDescription ??
						"Producto disponible para sumar demanda en una compra consolidada."}
				</p>
				<div className="border bg-muted/30 p-3">
					<span className="text-muted-foreground text-xs">
						{getOfferPriceLabel(offer)}
					</span>
					<p className="font-heading font-semibold text-xl">
						{getOfferDisplayPrice(offer)}
					</p>
				</div>
			</CardContent>
			<CardFooter>
				<Button asChild className="w-full" variant="outline">
					<Link href={ctaHref}>
						<ShoppingBagIcon data-icon="inline-start" />
						Participar
						<ArrowRightIcon data-icon="inline-end" />
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

export function CurrentOffersSection({
	offers,
	isActiveUser,
}: {
	offers: HomeOffer[];
	isActiveUser: boolean;
}) {
	const ctaHref = isActiveUser ? "/my-operations" : "/login";

	return (
		<section
			className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 md:px-6"
			id="ofertas"
		>
			<SectionHeading
				actions={
					<Button asChild variant="outline">
						<Link href={ctaHref}>
							Ver operaciones
							<ArrowRightIcon data-icon="inline-end" />
						</Link>
					</Button>
				}
				description="Estas oportunidades se muestran con condiciones comerciales vigentes para que puedas evaluar rapidamente donde sumarte."
				eyebrow="Ofertas principales"
				title="Productos disponibles para compra mayorista compartida."
			/>
			{offers.length > 0 ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{offers.map((offer) => (
						<OfferCard ctaHref={ctaHref} key={offer.id} offer={offer} />
					))}
				</div>
			) : (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>
							Estamos preparando nuevas ofertas mayoristas
						</EmptyTitle>
						<EmptyDescription>
							Cuando haya productos vigentes, los vas a ver aca con precio,
							minimo y condicion comercial.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link href={ctaHref}>Recibir novedades</Link>
						</Button>
					</EmptyContent>
				</Empty>
			)}
		</section>
	);
}
