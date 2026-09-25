import Link from "next/link";
import { Separator } from "~/components/ui/separator";
import { contactItems, footerColumns } from "../home-content";

export function HomeFooter() {
	return (
		<footer
			className="scroll-mt-20 bg-brand-ink px-4 py-12 text-brand-ink-foreground md:px-6"
			id="contacto"
		>
			<div className="mx-auto flex max-w-7xl flex-col gap-10">
				<div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-8">
					<div>
						<Link className="font-bold font-heading text-4xl" href="/">
							coco
						</Link>
						<p className="mt-3 max-w-xs text-sm/relaxed">
							Compras comunitarias en Ushuaia. Nos juntamos para comprar mejor.
						</p>
					</div>
					{footerColumns.map((column) => (
						<nav
							aria-label={column.title}
							className="flex flex-col gap-3"
							key={column.title}
						>
							<h2 className="font-semibold text-sm">{column.title}</h2>
							{column.links.map((link) => (
								<Link
									className="text-sm underline-offset-4 hover:underline"
									href={link.href}
									key={link.href}
								>
									{link.label}
								</Link>
							))}
						</nav>
					))}
					<div className="flex flex-col gap-3">
						<h2 className="font-semibold text-sm">Contacto</h2>
						{contactItems.map(({ label, value, href, external }) => (
							<a
								className="text-sm underline-offset-4 hover:underline"
								href={href}
								key={label}
								rel={external ? "noreferrer" : undefined}
								target={external ? "_blank" : undefined}
							>
								<span className="block font-medium">{label}</span>
								{value}
							</a>
						))}
					</div>
				</div>
				<Separator />
				<p className="text-xs">
					© {new Date().getFullYear()} Coco. Todos los derechos reservados.
				</p>
			</div>
		</footer>
	);
}
