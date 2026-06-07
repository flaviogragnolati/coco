import {
	ChevronDownIcon,
	HomeIcon,
	LayoutDashboardIcon,
	MapPinIcon,
	PackageIcon,
	ShieldIcon,
	ShoppingBagIcon,
	TagsIcon,
	TruckIcon,
	UsersIcon,
	WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { CartNavButton } from "~/components/cart-nav-button";
import { Button, buttonVariants } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { UserMenu } from "~/components/user-menu";
import { isAdminRole } from "~/server/auth/auth.utils";
import type { Session } from "~/server/better-auth";

const adminDashboardLink = {
	href: "/admin",
	label: "Dashboard",
	Icon: LayoutDashboardIcon,
};

const adminCrudLinks = [
	{
		href: "/admin/crud-home/suppliers",
		label: "Proveedores",
		Icon: TruckIcon,
	},
	{
		href: "/admin/crud-home/brands",
		label: "Marcas",
		Icon: TagsIcon,
	},
	{
		href: "/admin/crud-home/products",
		label: "Productos",
		Icon: PackageIcon,
	},
	{
		href: "/admin/crud-home/product-terms",
		label: "Términos y restricciones",
		Icon: PackageIcon,
	},
	{
		href: "/admin/crud-home/carriers",
		label: "Carriers",
		Icon: TruckIcon,
	},
	{
		href: "/admin/crud-home/destinations",
		label: "Destinos",
		Icon: MapPinIcon,
	},
	{
		href: "/admin/crud-home/users",
		label: "Usuarios",
		Icon: UsersIcon,
	},
	{
		href: "/admin/crud-home/addresses",
		label: "Direcciones",
		Icon: MapPinIcon,
	},
];

const adminOperationsLinks = [
	{
		href: "/admin/operations",
		label: "Inicio operaciones",
		Icon: ShoppingBagIcon,
	},
	{
		href: "/admin/operations/user-carts",
		label: "Carritos de usuarios",
		Icon: ShoppingBagIcon,
	},
];

type AppNavbarProps = {
	session: Session | null;
};

export function AppNavbar({ session }: AppNavbarProps) {
	const user = session?.user;
	const isActiveUser = user?.active === true && user.deleted === false;
	const canAccessAdmin = isActiveUser && isAdminRole(user.role);
	const DashboardIcon = adminDashboardLink.Icon;

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
					<Button asChild size="sm" variant="ghost">
						<Link href="/products">
							<ShoppingBagIcon data-icon="inline-start" />
							Productos
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
							<DropdownMenuTrigger
								className={buttonVariants({ size: "sm", variant: "ghost" })}
								data-size="sm"
								data-slot="button"
								data-variant="ghost"
							>
								<ShieldIcon data-icon="inline-start" />
								Administrador
								<ChevronDownIcon data-icon="inline-end" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-60">
								<DropdownMenuGroup>
									<DropdownMenuItem asChild>
										<Link href={adminDashboardLink.href}>
											<DashboardIcon />
											{adminDashboardLink.label}
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuSub>
										<DropdownMenuSubTrigger>
											<WrenchIcon />
											Administración
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent className="w-64">
											{adminCrudLinks.map(({ href, label, Icon }) => (
												<DropdownMenuItem asChild key={href}>
													<Link href={href}>
														<Icon />
														{label}
													</Link>
												</DropdownMenuItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuSub>
									<DropdownMenuSub>
										<DropdownMenuSubTrigger>
											<ShoppingBagIcon />
											Operaciones
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent className="w-56">
											{adminOperationsLinks.map(({ href, label, Icon }) => (
												<DropdownMenuItem asChild key={href}>
													<Link href={href}>
														<Icon />
														{label}
													</Link>
												</DropdownMenuItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuSub>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
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
						<Button asChild size="sm">
							<Link href="/login">Ingresar</Link>
						</Button>
					)}
				</div>
			</nav>
		</header>
	);
}
