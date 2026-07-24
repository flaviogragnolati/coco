import { ArrowRightIcon, BoxesIcon, SparklesIcon } from "lucide-react";
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
import { ProductImage } from "~/features/catalog/_components/product-image";
import type { HomeOffer } from "~/shared/common/home.types";
import { heroBenefits } from "../home-content";
import {
	getOfferBlockPrice,
	getOfferMinimumLabel,
	getOfferUnitReference,
} from "../home-formatters";

export function HomeHero({ spotlightOffer }: { spotlightOffer?: HomeOffer }) {
	const unitReference = spotlightOffer
		? getOfferUnitReference(spotlightOffer)
		: null;

	return (
		<section className="relative overflow-hidden bg-brand-ink text-brand-ink-foreground">
			<div
				aria-hidden="true"
				className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/30 blur-3xl"
			/>
			<div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
				<div className="flex max-w-3xl flex-col gap-7">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="highlight">Compra mayorista compartida</Badge>
						<Badge variant="secondary">Simple de principio a fin</Badge>
					</div>
					<div className="flex flex-col gap-4">
						<h1 className="text-balance font-heading font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
							Comprá al por mayor, sin organizar un grupo.
						</h1>
						<p className="max-w-2xl text-base/relaxed text-brand-ink-foreground/75 md:text-lg/relaxed">
							Explorá productos, armá tu pedido y pagá desde Coco. Nosotros
							consolidamos la demanda pagada y te acompañamos hasta la entrega.
						</p>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg" variant="highlight">
							<Link href="/products">
								Ver ofertas
								<ArrowRightIcon data-icon="inline-end" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link href="#como-funciona">
								Cómo funciona
								<ArrowRightIcon data-icon="inline-end" />
							</Link>
						</Button>
					</div>
					<div className="grid gap-3 sm:grid-cols-3">
						{heroBenefits.map(({ title, Icon }) => (
							<div className="flex items-center gap-2 text-sm" key={title}>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
									<Icon aria-hidden="true" />
								</span>
								<span>{title}</span>
							</div>
						))}
					</div>
				</div>

				{spotlightOffer ? (
					<Card className="gap-0 py-0 shadow-xl">
						<ProductImage
							className="flex aspect-4/3 w-full items-center justify-center rounded-t-4xl bg-brand-soft bg-center bg-cover text-brand-soft-foreground"
							imageUrl={spotlightOffer.imageUrl}
							name={spotlightOffer.productName}
						/>
						<CardHeader className="pt-5">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<Badge variant="highlight">
									<SparklesIcon data-icon="inline-start" />
									Oferta protagonista
								</Badge>
								<span className="text-muted-foreground text-xs">
									{spotlightOffer.brandName ?? "Producto seleccionado"}
								</span>
							</div>
							<CardTitle>
								<h2>{spotlightOffer.productName}</h2>
							</CardTitle>
							<CardDescription>
								Condición comercial vigente para empezar tu compra.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-1 py-5">
							<p className="font-heading font-semibold text-3xl">
								{getOfferBlockPrice(spotlightOffer)}
							</p>
							<p className="text-muted-foreground text-xs">
								{getOfferMinimumLabel(spotlightOffer)}
							</p>
							{unitReference ? (
								<p className="text-muted-foreground text-xs">{unitReference}</p>
							) : null}
						</CardContent>
						<CardFooter className="pb-5">
							<Button asChild className="w-full">
								<Link href={`/products?product=${spotlightOffer.productId}`}>
									Ver producto
									<ArrowRightIcon data-icon="inline-end" />
								</Link>
							</Button>
						</CardFooter>
					</Card>
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
