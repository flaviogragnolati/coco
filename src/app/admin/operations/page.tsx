import {
	ArrowRightIcon,
	BoxesIcon,
	HistoryIcon,
	PackageIcon,
	PackageSearchIcon,
	ShoppingCartIcon,
	TruckIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";

const operationsEntries = [
	{
		href: "/admin/operations/user-carts",
		title: "Carritos de usuarios",
		description: "Revision y ajuste operacional de carritos, items y ordenes.",
		body: "Filtra por usuario, producto, estado, fulfillment, orden y pagos relacionados.",
		Icon: ShoppingCartIcon,
		enabled: true,
	},
	{
		href: "/admin/operations/tracking",
		title: "Tracking",
		description: "Timeline completo de eventos por item de carrito.",
		body: "Filtra eventos, revisa referencias operativas y abre el historial completo del cart item.",
		Icon: HistoryIcon,
		enabled: true,
	},
	{
		href: "/admin/operations/lots",
		title: "Lotes",
		description: "Agrupacion operacional de demanda por proveedor.",
		body: "Pendiente para la siguiente version del modulo de operaciones.",
		Icon: BoxesIcon,
		enabled: false,
	},
	{
		href: "/admin/operations/operations",
		title: "Operaciones",
		description: "Coordinacion de ciclos operativos y demanda agregada.",
		body: "Ejecuta asignaciones FIFO sobre demanda pagada y prepara lotes por proveedor.",
		Icon: PackageSearchIcon,
		enabled: true,
	},
	{
		href: "/admin/operations/packages",
		title: "Paquetes",
		description: "Preparacion y asignacion de items a paquetes.",
		body: "Pendiente para la siguiente version del modulo de operaciones.",
		Icon: PackageIcon,
		enabled: false,
	},
	{
		href: "/admin/operations/shipments",
		title: "Envios",
		description: "Movimiento interno y entrega final de paquetes.",
		body: "Pendiente para la siguiente version del modulo de operaciones.",
		Icon: TruckIcon,
		enabled: false,
	},
];

export default function AdminOperationsPage() {
	return (
		<CrudPageShell
			description="Herramientas para revisar y ajustar el flujo operativo de carritos, lotes, paquetes y envios."
			title="Operaciones"
		>
			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{operationsEntries.map(
					({ href, title, description, body, Icon, enabled }) => (
						<Card className={enabled ? undefined : "opacity-70"} key={href}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Icon />
									{title}
								</CardTitle>
								<CardDescription>{description}</CardDescription>
								<CardAction>
									{enabled ? (
										<Button asChild size="sm" variant="outline">
											<Link href={href}>
												Abrir
												<ArrowRightIcon data-icon="inline-end" />
											</Link>
										</Button>
									) : (
										<Badge variant="outline">Proximamente</Badge>
									)}
								</CardAction>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground text-xs/relaxed">{body}</p>
							</CardContent>
						</Card>
					),
				)}
			</section>
		</CrudPageShell>
	);
}
