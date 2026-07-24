import { LogInIcon, ShieldIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";
import { CartNavButton } from "~/components/cart-nav-button";
import { MobileNavMenu } from "~/components/mobile-nav-menu";
import { Button } from "~/components/ui/button";
import { UserMenu } from "~/components/user-menu";
import { homeNavLinks } from "~/features/home/home-content";
import { isAdminRole } from "~/server/auth/auth.utils";
import type { Session } from "~/server/better-auth";

type AppNavbarProps = {
	session: Session | null;
};

export function AppNavbar({ session }: AppNavbarProps) {
	const user = session?.user;
	const isActiveUser = user?.active === true && user.deleted === false;
	const canAccessAdmin = isActiveUser && isAdminRole(user.role);

	return (
		<header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
			<nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
				<Link
					className="shrink-0 font-heading font-semibold text-xl tracking-tight"
					href="/"
				>
					Coco
				</Link>

				<div className="hidden min-w-0 items-center gap-1 xl:flex">
					{homeNavLinks.map((link) => (
						<Button asChild key={link.href} size="sm" variant="ghost">
							<Link href={link.href}>{link.label}</Link>
						</Button>
					))}
					{canAccessAdmin ? (
						<Button asChild size="sm" variant="ghost">
							<Link href="/admin">
								<ShieldIcon data-icon="inline-start" />
								Administrador
							</Link>
						</Button>
					) : null}
					<Button asChild size="sm">
						<Link href="/products">
							<ShoppingBagIcon data-icon="inline-start" />
							Comprar
						</Link>
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<CartNavButton
						isAuthenticated={Boolean(user)}
						userId={user?.id ?? null}
					/>
					{user ? (
						<UserMenu
							user={{
								email: user.email,
								image: user.image,
								name: user.name,
							}}
						/>
					) : (
						<Button asChild size="sm" variant="ghost">
							<Link href="/login">
								<LogInIcon data-icon="inline-start" />
								<span className="hidden sm:inline">Ingresar</span>
								<span className="sr-only sm:hidden">Ingresar</span>
							</Link>
						</Button>
					)}
					<div className="xl:hidden">
						<MobileNavMenu
							canAccessAdmin={canAccessAdmin}
							isActiveUser={isActiveUser}
						/>
					</div>
				</div>
			</nav>
		</header>
	);
}
