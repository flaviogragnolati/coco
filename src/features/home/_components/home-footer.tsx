import Link from "next/link";

import { Separator } from "~/components/ui/separator";
import { homeNavLinks } from "../home-content";

export function HomeFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t bg-brand-warm text-brand-warm-foreground">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 md:px-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-1">
						<strong className="font-heading text-sm">Coco</strong>
						<p className="max-w-md text-xs/relaxed opacity-75">
							Comprá al por mayor sin organizar un grupo. Coco consolida la
							demanda pagada y te acompaña hasta la entrega.
						</p>
					</div>
					<nav className="flex flex-wrap gap-3 text-xs">
						{homeNavLinks.map((link) => (
							<Link
								className="underline-offset-4 opacity-75 hover:underline hover:opacity-100"
								href={link.href}
								key={link.href}
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
				<Separator />
				<div className="flex flex-col gap-3 text-xs opacity-75 md:flex-row md:items-center md:justify-between">
					<span>© {year} Coco. Todos los derechos reservados.</span>
					<div className="flex flex-wrap gap-3">
						<Link className="hover:opacity-100" href="/products">
							Catálogo
						</Link>
						<Link className="hover:text-foreground" href="/login">
							Ingresar
						</Link>
						<Link className="hover:text-foreground" href="/my-orders">
							Mis pedidos
						</Link>
						<Link className="hover:text-foreground" href="/profile">
							Perfil
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
