import { PackageSearchIcon } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { requireUser } from "~/server/auth/route-guards";

export default async function MyOperationsPage() {
	await requireUser();

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
			<section className="flex flex-col gap-2">
				<h1 className="font-heading font-semibold text-2xl tracking-normal">
					Mis operaciones
				</h1>
				<p className="text-muted-foreground text-sm/relaxed">
					Resumen de operaciones del usuario autenticado.
				</p>
			</section>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<PackageSearchIcon />
						Proximamente
					</CardTitle>
					<CardDescription>
						Este modulo mostrara las operaciones asociadas a tu usuario.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-xs/relaxed">
						La pagina ya queda protegida por autenticacion para conectar el
						contenido cuando el modulo este disponible.
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
