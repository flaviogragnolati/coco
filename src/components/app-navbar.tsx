import {
	ChevronDownIcon,
	HomeIcon,
	LayoutDashboardIcon,
	ShieldIcon,
	ShoppingBagIcon,
	WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { UserMenu } from "~/components/user-menu";
import { isAdminRole } from "~/server/auth/auth.utils";
import type { Session } from "~/server/better-auth";

const adminLinks = [
	{
		href: "/admin",
		label: "Dashboard",
		Icon: LayoutDashboardIcon,
	},
	{
		href: "/admin/operations",
		label: "Operacion",
		Icon: ShoppingBagIcon,
	},
	{
		href: "/admin/crud-home",
		label: "Administracion",
		Icon: WrenchIcon,
	},
];

type AppNavbarProps = {
	session: Session | null;
};

export function AppNavbar({ session }: AppNavbarProps) {
	const user = session?.user;
	const isActiveUser = user?.active === true && user.deleted === false;
	const canAccessAdmin = isActiveUser && isAdminRole(user.role);

	return (
		<header className="sticky top-0 border-b bg-background/95 backdrop-blur">
			<nav className="mx-auto flex min-h-14 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2">
				<div className="flex min-w-0 items-center gap-2">
					<Button asChild className="font-heading text-sm" variant="ghost">
						<Link href="/">Coco</Link>
					</Button>
					<Button asChild size="sm" variant="ghost">
						<Link href="/">
							<HomeIcon data-icon="inline-start" />
							Home
						</Link>
					</Button>
					{isActiveUser ? (
						<Button asChild size="sm" variant="ghost">
							<Link href="/my-operations">
								<ShoppingBagIcon data-icon="inline-start" />
								Mis operaciones
							</Link>
						</Button>
					) : null}
					{canAccessAdmin ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="sm" variant="ghost">
									<ShieldIcon data-icon="inline-start" />
									Administrador
									<ChevronDownIcon data-icon="inline-end" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-48">
								<DropdownMenuGroup>
									{adminLinks.map(({ href, label, Icon }) => (
										<DropdownMenuItem asChild key={href}>
											<Link href={href}>
												<Icon />
												{label}
											</Link>
										</DropdownMenuItem>
									))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>

				<div className="flex items-center gap-2">
					{user ? (
						<UserMenu
							user={{
								email: user.email,
								image: user.image,
								name: user.name,
							}}
						/>
					) : (
						<Button asChild size="sm">
							<Link href="/login">Ingresar</Link>
						</Button>
					)}
				</div>
			</nav>
		</header>
	);
}
