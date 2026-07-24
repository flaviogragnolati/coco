import {
	ChevronDownIcon,
	LayoutDashboardIcon,
	LogInIcon,
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
import { MobileNavMenu } from "~/components/mobile-nav-menu";
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
import { homeNavLinks } from "~/features/home/home-content";
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
