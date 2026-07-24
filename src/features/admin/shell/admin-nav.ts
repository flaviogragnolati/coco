import {
	BoxesIcon,
	CreditCardIcon,
	FactoryIcon,
	ForkliftIcon,
	HistoryIcon,
	LayoutDashboardIcon,
	type LucideIcon,
	MapPinIcon,
	MapPinnedIcon,
	PackageIcon,
	PackageSearchIcon,
	ScrollTextIcon,
	ShoppingBagIcon,
	ShoppingCartIcon,
	TagsIcon,
	TruckIcon,
	UsersIcon,
} from "lucide-react";

export type AdminNavItem = {
	title: string;
	href: string;
	icon: LucideIcon;
};

export type AdminNavGroup = {
	label: string;
	items: AdminNavItem[];
};

export const adminHome: AdminNavItem = {
	title: "Inicio",
	href: "/admin",
	icon: LayoutDashboardIcon,
};

export const adminNavGroups: AdminNavGroup[] = [
	{
		label: "Operación",
		items: [
			{ title: "Carritos", href: "/admin/carts", icon: ShoppingCartIcon },
			{
				title: "Operaciones",
				href: "/admin/operations",
				icon: PackageSearchIcon,
			},
			{ title: "Lotes", href: "/admin/lots", icon: BoxesIcon },
			{ title: "Paquetes", href: "/admin/packages", icon: PackageIcon },
			{ title: "Envíos", href: "/admin/shipments", icon: TruckIcon },
			{ title: "Tracking", href: "/admin/tracking", icon: HistoryIcon },
		],
	},
	{
		label: "Pagos",
		items: [{ title: "Pagos", href: "/admin/payments", icon: CreditCardIcon }],
	},
	{
		label: "Catálogo",
		items: [
			{ title: "Productos", href: "/admin/products", icon: ShoppingBagIcon },
			{ title: "Marcas", href: "/admin/brands", icon: TagsIcon },
			{ title: "Proveedores", href: "/admin/suppliers", icon: FactoryIcon },
			{
				title: "Términos de producto",
				href: "/admin/product-terms",
				icon: ScrollTextIcon,
			},
			{
				title: "Transportistas",
				href: "/admin/carriers",
				icon: ForkliftIcon,
			},
			{ title: "Destinos", href: "/admin/destinations", icon: MapPinIcon },
		],
	},
	{
		label: "Usuarios",
		items: [
			{ title: "Usuarios", href: "/admin/users", icon: UsersIcon },
			{ title: "Direcciones", href: "/admin/addresses", icon: MapPinnedIcon },
		],
	},
];

function matchesPath(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Resolves the nav entry that owns `pathname`, preferring the longest matching
 * href so that `/admin/carts/42` resolves to Carritos rather than to Inicio.
 */
export function findAdminNavItem(
	pathname: string,
): { group?: AdminNavGroup; item: AdminNavItem } | null {
	let match: { group?: AdminNavGroup; item: AdminNavItem } | null = null;

	const consider = (item: AdminNavItem, group?: AdminNavGroup) => {
		if (!matchesPath(pathname, item.href)) return;
		if (match && match.item.href.length >= item.href.length) return;
		match = { group, item };
	};

	consider(adminHome);
	for (const group of adminNavGroups) {
		for (const item of group.items) consider(item, group);
	}

	return match;
}
