import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { adminNavGroups } from "~/features/admin/shell/admin-nav";
import { CartTraceabilitySearchCard } from "~/features/admin/shell/cart-traceability-search-card";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
	title: "Inicio",
};

export default async function AdminPage() {
	// The admin layout already gated this route with `requireAdmin()`.
	const session = await getSession();
	const firstName = session?.user.name.split(" ").at(0);

	return (
		<div className="flex w-full flex-col gap-6">
			<section className="flex flex-col gap-3 rounded-2xl bg-brand-ink px-6 py-8 text-brand-ink-foreground md:px-8 md:py-10">
				<span className="font-semibold text-highlight text-xs uppercase tracking-wide">
					Administración
				</span>
				<h1 className="text-balance font-heading font-semibold text-2xl md:text-3xl">
					{firstName ? `Hola, ${firstName}` : "Hola"}
				</h1>
				<p className="max-w-2xl text-brand-ink-foreground/75 text-sm/relaxed">
					Panel de administración de Coco. Revisá el flujo operativo, los pagos
					y el catálogo desde la navegación lateral.
				</p>
			</section>

			<CartTraceabilitySearchCard />

			<section className="flex flex-col gap-3">
				<h2 className="font-heading font-semibold text-lg">Accesos rápidos</h2>
				{adminNavGroups.map((group) => (
					<div className="flex flex-col gap-2" key={group.label}>
						<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							{group.label}
						</h3>
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{group.items.map((item) => {
								const ItemIcon = item.icon;

								return (
									<Button
										asChild
										className="h-auto justify-start py-3"
										key={item.href}
										variant="outline"
									>
										<Link href={item.href}>
											<ItemIcon data-icon="inline-start" />
											{item.title}
										</Link>
									</Button>
								);
							})}
						</div>
					</div>
				))}
			</section>
		</div>
	);
}
