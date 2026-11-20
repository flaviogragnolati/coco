import { ArrowUpRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow } from "~/components/eyebrow";
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
				<Eyebrow>Administración</Eyebrow>
				<h1 className="text-balance font-heading font-semibold text-2xl md:text-3xl">
					{firstName ? `Hola, ${firstName}` : "Hola"}
				</h1>
				<p className="max-w-2xl text-brand-ink-foreground/75 text-sm/relaxed">
					Panel de administración de CoCo. Revisá el flujo operativo, los pagos
					y el catálogo desde la navegación lateral.
				</p>
			</section>

			<CartTraceabilitySearchCard />

			<section className="flex flex-col gap-5">
				<h2 className="font-heading font-semibold text-lg">Accesos rápidos</h2>
				{adminNavGroups.map((group) => (
					<div className="flex flex-col gap-2.5" key={group.label}>
						<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							{group.label}
						</h3>
						<ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
							{group.items.map((item) => {
								const ItemIcon = item.icon;

								return (
									<li key={item.href}>
										<Link
											className="group flex items-center gap-3 rounded-2xl border bg-card p-3 outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
											href={item.href}
										>
											<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
												<ItemIcon className="size-4" />
											</span>
											<span className="min-w-0 flex-1 truncate font-medium text-sm">
												{item.title}
											</span>
											<ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
										</Link>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</section>
		</div>
	);
}
