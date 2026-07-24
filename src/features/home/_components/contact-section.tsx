import { ArrowRightIcon, LogInIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { contactItems } from "../home-content";

export function ContactSection({ isActiveUser }: { isActiveUser: boolean }) {
	const secondaryHref = isActiveUser
		? "/my-orders"
		: "/login?callbackURL=/products";
	const secondaryLabel = isActiveUser ? "Ver mis pedidos" : "Ingresar";
	const SecondaryIcon = isActiveUser ? ShoppingBagIcon : LogInIcon;

	return (
		<section
			className="scroll-mt-20 bg-brand-ink px-4 py-16 text-brand-ink-foreground md:px-6 md:py-20"
			id="contacto"
		>
			<div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
				<div className="flex max-w-3xl flex-col gap-6">
					<div className="flex flex-col gap-3">
						<span className="font-semibold text-highlight text-xs uppercase tracking-wide">
							Contacto
						</span>
						<h2 className="text-balance font-heading font-semibold text-3xl md:text-4xl">
							¿Listo para hacer tu próxima compra mayorista?
						</h2>
						<p className="max-w-2xl text-base/relaxed text-brand-ink-foreground/75">
							Explorá el catálogo o escribinos si buscás un producto, querés
							vender en Coco o necesitás ayuda con un pedido.
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
							<Link href={secondaryHref}>
								<SecondaryIcon data-icon="inline-start" />
								{secondaryLabel}
							</Link>
						</Button>
					</div>
				</div>
				<div className="flex flex-col gap-3">
					{contactItems.map(({ label, value, href, Icon, external }) => (
						<Button
							asChild
							className="h-auto justify-start py-4"
							key={label}
							variant="outline"
						>
							<Link
								href={href ?? "#contacto"}
								rel={external ? "noreferrer" : undefined}
								target={external ? "_blank" : undefined}
							>
								<Icon data-icon="inline-start" />
								<span className="flex min-w-0 flex-col items-start">
									<span className="text-xs">{label}</span>
									<span className="truncate">{value}</span>
								</span>
							</Link>
						</Button>
					))}
				</div>
			</div>
		</section>
	);
}
