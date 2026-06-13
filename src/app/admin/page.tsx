import {
	ArrowRightIcon,
	CreditCardIcon,
	ShoppingBagIcon,
	WrenchIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

const adminSections = [
	{
		href: "/admin/operations",
		title: "Operacion",
		description: "Herramientas operativas para carritos, lotes y envios.",
		Icon: ShoppingBagIcon,
	},
	{
		href: "/admin/payments",
		title: "Pagos",
		description: "Intentos de pago, eventos de proveedor y configuración.",
		Icon: CreditCardIcon,
	},
	{
		href: "/admin/crud-home",
		title: "Administracion",
		description: "Mantenimiento de entidades maestras del backoffice.",
		Icon: WrenchIcon,
	},
];

export default function AdminPage() {
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
			<section className="flex flex-col gap-2">
				<h1 className="font-heading font-semibold text-2xl tracking-normal">
					Administrador
				</h1>
				<p className="text-muted-foreground text-sm/relaxed">
					Dashboard principal del backoffice. Por ahora contiene accesos a los
					modulos disponibles.
				</p>
			</section>

			<section className="grid gap-3 md:grid-cols-2">
				{adminSections.map(({ href, title, description, Icon }) => (
					<Card key={href}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon />
								{title}
							</CardTitle>
							<CardDescription>{description}</CardDescription>
							<CardAction>
								<Button asChild size="sm" variant="outline">
									<Link href={href}>
										Abrir
										<ArrowRightIcon data-icon="inline-end" />
									</Link>
								</Button>
							</CardAction>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-xs/relaxed">
								Disponible para usuarios con rol admin o superadmin.
							</p>
						</CardContent>
					</Card>
				))}
			</section>
		</main>
	);
}
