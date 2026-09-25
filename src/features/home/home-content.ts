import {
	BoxesIcon,
	type LucideIcon,
	MailIcon,
	PackageCheckIcon,
	PhoneIcon,
	ShieldCheckIcon,
	ShoppingCartIcon,
	TruckIcon,
	UsersIcon,
} from "lucide-react";

export const homeNavLinks = [
	{ href: "/#como-funciona", label: "Cómo funciona" },
	{ href: "/#ofertas", label: "Ofertas" },
	{ href: "/#preguntas-frecuentes", label: "Preguntas frecuentes" },
	{ href: "/#contacto", label: "Contacto" },
];

export const announcementMessage =
	"Compras comunitarias en Ushuaia · Mirá el catálogo sin registrarte";

export const heroSteps = [
	{ title: "Sumate al pedido de otros vecinos.", Icon: UsersIcon },
	{ title: "Entre todos acceden a tarifas mayoristas.", Icon: BoxesIcon },
	{ title: "Coco lo entrega en tu ciudad.", Icon: TruckIcon },
];

export const trustItems = [
	{
		title: "Pedido a la vista",
		description:
			"Seguís cada etapa de tu compra en Mis pedidos, desde el pago hasta la entrega.",
		Icon: PackageCheckIcon,
	},
	{
		title: "Pago seguro",
		description: "Pagás al confirmar tu pedido, sin sorpresas después.",
		Icon: ShieldCheckIcon,
	},
	{
		title: "Precio mayorista",
		description: "Compramos en volumen y con menos intermediarios.",
		Icon: BoxesIcon,
	},
];

export const problemSolutionCards = [
	{
		title: "El problema",
		description:
			"Comprar de a poco sale más caro. Y organizar una compra entre vecinos lleva tiempo y esfuerzo.",
		Icon: ShoppingCartIcon,
	},
	{
		title: "La solución",
		description:
			"Nos juntamos para comprar mejor. Vos elegís lo que necesitás y Coco reúne los pedidos y coordina la compra.",
		Icon: UsersIcon,
	},
	{
		title: "El resultado",
		description:
			"Precio mayorista, sin coordinar nada. Pagás al confirmar y te avisamos cada avance hasta que tu compra llega a la ciudad.",
		Icon: PackageCheckIcon,
	},
];

export const footerColumns = [
	{
		title: "Nosotros",
		links: [{ label: "Cómo funciona", href: "/#como-funciona" }],
	},
	{
		title: "Información",
		links: [
			{ label: "Preguntas frecuentes", href: "/#preguntas-frecuentes" },
			{ label: "Catálogo", href: "/products" },
		],
	},
	{
		title: "Mi cuenta",
		links: [
			{ label: "Ingresar", href: "/login" },
			{ label: "Mis pedidos", href: "/my-orders" },
			{ label: "Perfil", href: "/profile" },
		],
	},
];

export const faqItems = [
	{
		question: "¿Cuánto tarda en llegar mi compra?",
		answer:
			"Depende del proveedor y de cuándo se consolida la demanda; vas a ver cada avance en Mis pedidos.",
	},
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
