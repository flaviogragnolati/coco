import {
	ArrowRightIcon,
	MapPinIcon,
	PackageIcon,
	TagsIcon,
	TruckIcon,
	UsersIcon,
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
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";

const crudEntries = [
	{
		href: "/admin/crud-home/suppliers",
		title: "Proveedores",
		description: "Alta, edición, baja lógica y eliminación controlada.",
		body: "Gestiona datos comerciales, dirección y contacto del proveedor.",
		Icon: TruckIcon,
	},
	{
		href: "/admin/crud-home/brands",
		title: "Marcas",
		description:
			"Catálogo de marcas comerciales y bloqueo por productos asociados.",
		body: "Define la identidad comercial disponible para productos y evita la desasignación silenciosa.",
		Icon: TagsIcon,
	},
	{
		href: "/admin/crud-home/products",
		title: "Productos",
		description:
			"Unidad comercial, imágenes y relación opcional con marca y proveedor.",
		body: "Administra catálogo y reglas de eliminación definitiva según términos y restricciones locales.",
		Icon: PackageIcon,
	},
	{
		href: "/admin/crud-home/product-terms",
		title: "Términos y restricciones",
		description:
			"Condiciones comerciales de cliente, proveedor y restricciones locales.",
		body: "Gestiona precios, cantidades, vigencias y reglas locales agrupadas por pestañas.",
		Icon: PackageIcon,
	},
	{
		href: "/admin/crud-home/carriers",
		title: "Carriers",
		description: "Operadores logisticos con direccion, contacto y estado.",
		body: "Mantiene carriers disponibles para ordenes de transporte y bloquea eliminaciones con relaciones.",
		Icon: TruckIcon,
	},
	{
		href: "/admin/crud-home/destinations",
		title: "Destinos",
		description: "Depositos internos y destinos operativos.",
		body: "Administra destinos con URL opcional de Google Maps y baja logica.",
		Icon: MapPinIcon,
	},
	{
		href: "/admin/crud-home/users",
		title: "Usuarios",
		description: "Perfil operativo, rol, estado y direcciones embebidas.",
		body: "Gestiona solo la fila de perfil, sin credenciales ni cuentas Better Auth.",
		Icon: UsersIcon,
	},
	{
		href: "/admin/crud-home/addresses",
		title: "Direcciones",
		description:
			"CRUD independiente con selector de usuario y eliminación definitiva directa.",
		body: "Permite revisar y depurar direcciones sin entrar al formulario del usuario.",
		Icon: MapPinIcon,
	},
];

export default function AdminCrudHomePage() {
	return (
		<CrudPageShell
			description="Operaciones internas para mantener entidades maestras del backoffice."
			title="CRUD Backoffice"
		>
			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{crudEntries.map(({ href, title, description, body, Icon }) => (
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
							<p className="text-muted-foreground text-xs/relaxed">{body}</p>
						</CardContent>
					</Card>
				))}
			</section>
		</CrudPageShell>
	);
}
