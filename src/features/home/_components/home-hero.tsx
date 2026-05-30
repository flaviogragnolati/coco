import {
	ArrowRightIcon,
	LayoutDashboardIcon,
	LogInIcon,
	ShoppingBagIcon,
	SparklesIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	formatQuantity,
	getOfferDisplayPrice,
	getOfferPriceLabel,
} from "../home-formatters";

export function HomeHero({
	isActiveUser,
	canAccessAdmin,
	spotlightOffer,
}: {
	isActiveUser: boolean;
	canAccessAdmin: boolean;
	spotlightOffer?: HomeOffer;
}) {
	const primaryHref = isActiveUser ? "/my-operations" : "/login";
	const primaryLabel = isActiveUser ? "Ver mis operaciones" : "Unirme a Coco";
	const PrimaryIcon = isActiveUser ? ShoppingBagIcon : LogInIcon;

	return (
		<section className="relative overflow-hidden border-b bg-muted/30">
			{spotlightOffer?.imageUrl ? (
				<div
					aria-hidden="true"
					className="absolute inset-0 bg-center bg-cover opacity-20"
					style={{ backgroundImage: `url(${spotlightOffer.imageUrl})` }}
				/>
			) : null}
			<div className="absolute inset-0 bg-background/85" />
			<div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-center md:px-6 md:py-20">
				<div className="flex max-w-3xl flex-col gap-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Compra mayorista compartida</Badge>
						<Badge variant="outline">Simple y directo</Badge>
					</div>
					<div className="flex flex-col gap-4">
						<h1 className="text-balance font-heading font-semibold text-4xl tracking-normal md:text-5xl">
							Compra al por mayor sin coordinar con otros compradores.
						</h1>
						<p className="max-w-2xl text-muted-foreground text-sm/relaxed md:text-base/relaxed">
							Coco junta pedidos minoristas compatibles y los consolida para
							acceder a mejores condiciones mayoristas. Vos pedis lo que
							necesitas; la plataforma simplifica el resto.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button asChild size="lg">
							<Link href={primaryHref}>
								<PrimaryIcon data-icon="inline-start" />
								{primaryLabel}
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link href="#como-funciona">
								Como funciona
								<ArrowRightIcon data-icon="inline-end" />
							</Link>
						</Button>
						{canAccessAdmin ? (
							<Button asChild size="lg" variant="ghost">
								<Link href="/admin">
									<LayoutDashboardIcon data-icon="inline-start" />
									Ir a administrador
								</Link>
							</Button>
						) : null}
					</div>
				</div>

				<div className="flex flex-col gap-3 border bg-card/90 p-4 shadow-sm">
					<div className="flex items-start justify-between gap-3">
						<div className="flex flex-col gap-1">
							<span className="text-muted-foreground text-xs">
								Oferta activa
							</span>
							<strong className="font-heading text-lg">
								{spotlightOffer?.productName ?? "Pedidos consolidados"}
							</strong>
						</div>
						<Badge variant="outline">
							<SparklesIcon data-icon="inline-start" />
							Vigente
						</Badge>
					</div>
					<div className="grid gap-2 sm:grid-cols-3">
						<div className="border bg-background p-3">
							<span className="text-muted-foreground text-xs">Precio</span>
							<p className="font-heading font-semibold text-base">
								{spotlightOffer
									? getOfferDisplayPrice(spotlightOffer)
									: "Mejor precio"}
							</p>
							<p className="text-muted-foreground text-xs">
								{spotlightOffer
									? getOfferPriceLabel(spotlightOffer)
									: "Por volumen"}
							</p>
						</div>
						<div className="border bg-background p-3">
							<span className="text-muted-foreground text-xs">Minimo</span>
							<p className="font-heading font-semibold text-base">
								{spotlightOffer
									? formatQuantity(spotlightOffer.moq, spotlightOffer.unit)
									: "Compartido"}
							</p>
							<p className="text-muted-foreground text-xs">
								No necesitas cubrirlo solo
							</p>
						</div>
						<div className="border bg-background p-3">
							<span className="text-muted-foreground text-xs">Flujo</span>
							<p className="font-heading font-semibold text-base">3 pasos</p>
							<p className="text-muted-foreground text-xs">
								Elegir, sumar, confirmar
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
