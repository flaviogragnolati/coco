import Link from "next/link";

import { Separator } from "~/components/ui/separator";
import { homeNavLinks } from "../home-content";

export function HomeFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t bg-muted/30">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 md:px-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-1">
						<strong className="font-heading text-sm">Coco</strong>
						<p className="text-muted-foreground text-xs/relaxed">
							Compra mayorista compartida para pedidos simples y consolidados.
						</p>
					</div>
					<nav className="flex flex-wrap gap-3 text-xs">
						{homeNavLinks.map((link) => (
							<Link
								className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
								href={link.href}
								key={link.href}
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
				<Separator />
				<div className="flex flex-col gap-3 text-muted-foreground text-xs md:flex-row md:items-center md:justify-between">
					<span>Copyright {year} Coco. Todos los derechos reservados.</span>
					<div className="flex flex-wrap gap-3">
						<Link className="hover:text-foreground" href="/login">
							Ingresar
						</Link>
						<Link className="hover:text-foreground" href="/my-operations">
							Mis operaciones
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
