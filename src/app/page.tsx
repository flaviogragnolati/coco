import {
	ArrowRightIcon,
	BoxesIcon,
	LayoutDashboardIcon,
	LogInIcon,
	ShieldIcon,
	ShoppingBagIcon,
	UserIcon,
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
import { isAdminRole } from "~/server/auth/auth.utils";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
	const session = await getSession();
	const user = session?.user;
	const isActiveUser = user?.active === true && user.deleted === false;
	const canAccessAdmin = isActiveUser && isAdminRole(user.role);

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
			<section className="flex flex-col gap-4 py-6">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary">Coco</Badge>
					{isActiveUser ? <Badge variant="outline">{user.role}</Badge> : null}
				</div>
				<div className="flex max-w-3xl flex-col gap-3">
					<h1 className="font-heading font-semibold text-3xl tracking-normal sm:text-4xl">
						Operaciones y administracion en un solo lugar.
					</h1>
					<p className="text-muted-foreground text-sm/relaxed">
						Accede a tus operaciones o ingresa al backoffice si tu usuario tiene
						permisos de administrador.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{isActiveUser ? (
						<Button asChild>
							<Link href="/my-operations">
								<ShoppingBagIcon data-icon="inline-start" />
								Ver mis operaciones
							</Link>
						</Button>
					) : (
						<Button asChild>
							<Link href="/login">
								<LogInIcon data-icon="inline-start" />
								Ingresar con Google
							</Link>
						</Button>
					)}
					{canAccessAdmin ? (
						<Button asChild variant="outline">
							<Link href="/admin">
								<ShieldIcon data-icon="inline-start" />
								Ir a administrador
							</Link>
						</Button>
					) : null}
				</div>
			</section>

			<section className="grid gap-3 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BoxesIcon />
							Home publico
						</CardTitle>
						<CardDescription>
							Informacion principal visible sin iniciar sesion.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-xs/relaxed">
							El inicio queda disponible para visitantes y usuarios
							autenticados.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserIcon />
							Perfil
						</CardTitle>
						<CardDescription>
							Datos personales y tributarios del usuario.
						</CardDescription>
						<CardAction>
							<Button asChild size="sm" variant="outline">
								<Link href={isActiveUser ? "/profile" : "/login"}>
									Abrir
									<ArrowRightIcon data-icon="inline-end" />
								</Link>
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-xs/relaxed">
							Disponible despues de iniciar sesion.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LayoutDashboardIcon />
							Backoffice
						</CardTitle>
						<CardDescription>
							Herramientas internas para administradores.
						</CardDescription>
						<CardAction>
							<Button asChild size="sm" variant="outline">
								<Link href={canAccessAdmin ? "/admin" : "/login"}>
									Abrir
									<ArrowRightIcon data-icon="inline-end" />
								</Link>
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-xs/relaxed">
							Solo visible y accesible para roles admin y superadmin.
						</p>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
