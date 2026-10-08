import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { HomeSystemIllustration } from "./home-system-illustration";

export function HomeHero({ hasOffers }: { hasOffers: boolean }) {
	return (
		<section className="bg-brand-ink text-brand-ink-foreground">
			<div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-12 md:px-6 md:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-20">
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
				<HomeSystemIllustration />
			</div>
		</section>
	);
}
