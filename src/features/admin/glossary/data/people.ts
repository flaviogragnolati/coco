import type { GlossaryEntry } from "../glossary.types";

export const peopleGlossaryEntries: GlossaryEntry[] = [
	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-usuario",
		kind: "entity",
		section: "people",
		label: "Usuario",
		definition:
			"La persona que compra o administra: sus datos de identidad, su rol y las direcciones, carritos, órdenes y medios de pago que le cuelgan.",
		occurrences: [{ code: "User", db: "user" }],
		href: "/admin/users",
	},
	{
		slug: "entidad-direccion",
		kind: "entity",
		section: "people",
		label: "Dirección",
		definition:
			"Una entrada de la libreta de direcciones de un usuario. Las direcciones históricas de checkout y de envío se copian a snapshots, nunca se referencian.",
		occurrences: [{ code: "Address", db: "address" }],
		href: "/admin/addresses",
	},

	// --- Estados: rol --------------------------------------------------------
	{
		slug: "estado-rol-usuario",
		kind: "status",
		section: "people",
		label: "Usuario",
		definition:
			"Rol por defecto: compra en el storefront y no ve el panel de administración.",
		occurrences: [{ code: "UserRole.user", db: "user.role" }],
		href: "/admin/users",
	},
	{
		slug: "estado-rol-admin",
		kind: "status",
		section: "people",
		label: "Admin",
		definition:
			"Rol con acceso al panel de administración y a sus acciones operativas.",
		occurrences: [{ code: "UserRole.admin", db: "user.role" }],
		href: "/admin/users",
	},
	{
		slug: "estado-rol-superadmin",
		kind: "status",
		section: "people",
		label: "Superadmin",
		definition:
			"Rol de administración con los permisos más amplios, incluidas las acciones destructivas.",
		occurrences: [{ code: "UserRole.superadmin", db: "user.role" }],
		href: "/admin/users",
	},

	// --- Estados: tipo de dirección ------------------------------------------
	{
		slug: "estado-direccion-todas",
		kind: "status",
		section: "people",
		label: "Todos los usos",
		definition:
			"La dirección sirve tanto para facturación como para envío; es el valor por defecto.",
		occurrences: [{ code: "AddressType.all", db: "address.type" }],
		href: "/admin/addresses",
	},
	{
		slug: "estado-direccion-facturacion",
		kind: "status",
		section: "people",
		label: "Facturación",
		definition: "La dirección se usa solo para facturar.",
		occurrences: [{ code: "AddressType.billing", db: "address.type" }],
		href: "/admin/addresses",
	},
	{
		slug: "estado-direccion-envio",
		kind: "status",
		section: "people",
		label: "Envío",
		definition: "La dirección se usa solo como destino de entrega.",
		occurrences: [{ code: "AddressType.shipping", db: "address.type" }],
		href: "/admin/addresses",
	},
	{
		slug: "estado-direccion-otro",
		kind: "status",
		section: "people",
		label: "Otro uso",
		definition: "Dirección guardada sin un uso comercial declarado.",
		occurrences: [{ code: "AddressType.other", db: "address.type" }],
		href: "/admin/addresses",
	},
];
