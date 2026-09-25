import { LogInIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { CartNavButton } from "~/components/cart-nav-button";
import { MobileNavMenu } from "~/components/mobile-nav-menu";
import { NavbarSearch } from "~/components/navbar-search";
import { Button } from "~/components/ui/button";
import { UserMenu } from "~/components/user-menu";
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
		<header className="sticky top-0 z-40 border-b bg-background">
			<nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
				<Link
					className="shrink-0 font-bold font-heading text-3xl tracking-tight"
					href="/"
				>
					coco
				</Link>

				<Button
					asChild
					className="hidden rounded-full sm:inline-flex"
					variant="outline"
				>
					<Link href="/products">
						<MenuIcon data-icon="inline-start" />
						Catálogo
					</Link>
				</Button>
				<NavbarSearch className="hidden max-w-[460px] flex-1 md:block" />

				<div className="ml-auto flex items-center gap-2">
					<CartNavButton
						isAuthenticated={Boolean(user)}
						userId={user?.id ?? null}
					/>
					{user ? (
						<UserMenu
							canAccessAdmin={canAccessAdmin}
							user={{
								email: user.email,
								image: user.image,
								name: user.name,
							}}
						/>
					) : (
						<Button
							asChild
							className="size-[42px] rounded-full"
							size="icon"
							variant="ghost"
						>
							<Link href="/login">
								<LogInIcon data-icon="inline-start" />
								<span className="sr-only">Ingresar</span>
							</Link>
						</Button>
					)}
					<div className="md:hidden">
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
