import {
	BadgePercentIcon,
	BoxesIcon,
	ClockIcon,
	HandshakeIcon,
	type LucideIcon,
	MailIcon,
	PackageCheckIcon,
	PhoneIcon,
	SearchIcon,
	ShieldCheckIcon,
	ShoppingCartIcon,
	TruckIcon,
} from "lucide-react";

export const homeNavLinks = [
	{ href: "#como-funciona", label: "Como funciona" },
	{ href: "#unirse", label: "Unirse" },
	{ href: "#ofertas", label: "Ofertas" },
	{ href: "#destacados", label: "Destacados" },
	{ href: "#contacto", label: "Contacto" },
];

export const howItWorksSteps: Array<{
	title: string;
	description: string;
	Icon: LucideIcon;
}> = [
	{
		title: "Elegis una oferta",
		description:
			"Ves productos mayoristas vigentes, precios de referencia y cantidades minimas disponibles.",
		Icon: SearchIcon,
	},
	{
		title: "Sumas tu pedido",
		description:
			"Cargas lo que necesitas sin depender de coordinar con otros compradores.",
		Icon: ShoppingCartIcon,
	},
	{
		title: "Coco consolida",
		description:
			"Unimos pedidos compatibles para alcanzar mejores condiciones de compra mayorista.",
		Icon: BoxesIcon,
	},
	{
		title: "Confirmamos la operacion",
		description:
			"Cuando el pedido consolidado esta listo, avanzas con pago, entrega y seguimiento.",
		Icon: PackageCheckIcon,
	},
];

export const joinSteps: Array<{
	title: string;
	description: string;
}> = [
	{
		title: "Ingresas con Google",
		description: "Usamos el acceso actual de Coco para que el alta sea rapida.",
	},
	{
		title: "Completas tu perfil",
		description:
			"Agregas los datos necesarios para operar, facturar y recibir informacion.",
	},
	{
		title: "Participas en pedidos",
		description:
			"Elegis oportunidades vigentes y Coco simplifica la compra consolidada.",
	},
];

export const featuredBenefits: Array<{
	title: string;
	description: string;
	Icon: LucideIcon;
}> = [
	{
		title: "Ahorro por volumen",
		description:
			"Acceso a condiciones mayoristas sin tener que comprar todo el minimo individualmente.",
		Icon: BadgePercentIcon,
	},
	{
		title: "Sin coordinacion manual",
		description:
			"Cada usuario carga su necesidad y Coco se encarga de juntar demanda compatible.",
		Icon: HandshakeIcon,
	},
	{
		title: "Proceso simple",
		description:
			"Menos pasos operativos para pasar de una oferta vigente a una compra consolidada.",
		Icon: ShieldCheckIcon,
	},
	{
		title: "Entrega ordenada",
		description:
			"Las operaciones quedan preparadas para seguimiento, pago y logistica posterior.",
		Icon: TruckIcon,
	},
];

export const contactItems: Array<{
	label: string;
	value: string;
	href?: string;
	Icon: LucideIcon;
}> = [
	{
		label: "Email",
		value: "contacto@coco.app",
		href: "mailto:contacto@coco.app",
		Icon: MailIcon,
	},
	{
		label: "WhatsApp",
		value: "+54 9 11 0000-0000",
		href: "https://wa.me/5491100000000",
		Icon: PhoneIcon,
	},
	{
		label: "Horario",
		value: "Lunes a viernes, 9 a 18 hs",
		Icon: ClockIcon,
	},
];
