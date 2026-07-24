import {
	BoxesIcon,
	type LucideIcon,
	MailIcon,
	PackageCheckIcon,
	PhoneIcon,
	SearchIcon,
	ShoppingCartIcon,
} from "lucide-react";

export const homeNavLinks = [
	{ href: "/#como-funciona", label: "Cómo funciona" },
	{ href: "/#ofertas", label: "Ofertas" },
	{ href: "/#preguntas-frecuentes", label: "Preguntas frecuentes" },
	{ href: "/#contacto", label: "Contacto" },
];

export const howItWorksSteps: Array<{
	title: string;
	description: string;
	Icon: LucideIcon;
}> = [
	{
		title: "Explorá y armá tu pedido",
		description:
			"Revisá productos y condiciones vigentes. Podés sumar al carrito sin crear una cuenta.",
		Icon: SearchIcon,
	},
	{
		title: "Registrate, elegí la entrega y pagá",
		description:
			"Al iniciar el checkout completás tus datos, definís cómo recibir el pedido y confirmás el pago.",
		Icon: ShoppingCartIcon,
	},
	{
		title: "Seguimos la compra hasta la entrega",
		description:
			"Coco consolida la demanda pagada y te comunica el avance de la operación hasta que recibís tu pedido.",
		Icon: BoxesIcon,
	},
];

export const heroBenefits: Array<{
	title: string;
	Icon: LucideIcon;
}> = [
	{
		title: "Explorá sin registrarte",
		Icon: SearchIcon,
	},
	{
		title: "Armá tu carrito a tu ritmo",
		Icon: ShoppingCartIcon,
	},
	{
		title: "Seguí el pedido después del pago",
		Icon: PackageCheckIcon,
	},
];

export const faqItems = [
	{
		question: "¿Necesito una cuenta para ver productos?",
		answer:
			"No. Podés explorar el catálogo y armar tu carrito sin registrarte. Te pedimos que ingreses cuando empezás el checkout.",
	},
	{
		question: "¿Qué significa cantidad mínima?",
		answer:
			"Es la menor cantidad que podés comprar de un producto bajo sus condiciones comerciales vigentes. La vas a ver antes de sumarlo al carrito.",
	},
	{
		question: "¿Cuándo pago mi pedido?",
		answer:
			"Pagás al confirmar el checkout, después de elegir la entrega. Con el pago aprobado, tu demanda queda lista para que Coco la consolide.",
	},
	{
		question: "¿Qué pasa después del pago?",
		answer:
			"Tu pedido pasa a seguimiento. Coco agrupa la demanda pagada en operaciones compatibles y te informa cada cambio hasta la entrega.",
	},
	{
		question: "¿Qué pasa si mi demanda no entra en una operación?",
		answer:
			"Puede reprogramarse para una operación posterior. Vas a ver su estado en Mis pedidos y podés contactar a soporte si necesitás revisar tu caso.",
	},
	{
		question: "¿Dónde sigo el avance de mi compra?",
		answer:
			"En Mis pedidos encontrás el estado y la cronología de cada compra, desde la confirmación del pago hasta la entrega.",
	},
];

export const contactItems: Array<{
	label: string;
	value: string;
	href?: string;
	Icon: LucideIcon;
	external?: boolean;
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
		external: true,
	},
];
