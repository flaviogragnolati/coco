import { type LucideIcon, MailIcon, PhoneIcon } from "lucide-react";

export const homeNavLinks = [
	{ href: "/#como-funciona", label: "Cómo funciona" },
	{ href: "/#ofertas", label: "Ofertas" },
	{ href: "/#preguntas-frecuentes", label: "Preguntas frecuentes" },
	{ href: "/#contacto", label: "Contacto" },
];

export const announcementMessage =
	"Compras comunitarias en Ushuaia · Mirá el catálogo sin registrarte";

export const howItWorksSteps = [
	"Cuando armás tu pedido, estás comprando con otros vecinos.",
	"Coco consolida los pedidos para acceder al precio mayorista.",
	"No somos una distribuidora: coordinamos los recursos para comprar lo que vos necesitás.",
	"El pedido sale desde origen con destino a tu ciudad.",
	"Cuando llega, te lo llevamos a la dirección que cargaste o te avisamos para retirarlo en nuestro punto de retiro.",
];

export const footerColumns = [
	{
		title: "Nosotros",
		links: [
			{ label: "Cómo funciona", href: "/#como-funciona" },
			{ label: "Sé proveedor", href: "/proveedores" },
		],
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
			"En promedio, entre 7 y 10 días desde que tu pedido entra en preparación. El pedido sale directo desde origen — muchas veces desde otra provincia — y hasta Tierra del Fuego el camino tiene un tramo particular: al ser una isla, el camión cruza a Chile, atraviesa el Estrecho de Magallanes en balsa, reingresa a la Argentina y cruza la cordillera hasta Ushuaia. Vas a ver cada etapa en Mis pedidos.",
	},
	{
		question: "¿Necesito una cuenta para ver productos?",
		answer:
			"No. Podés explorar el catálogo y armar tu pedido sin registrarte. Te pedimos que ingreses cuando empezás el checkout.",
	},
	{
		question: "¿Cuándo pago mi pedido?",
		answer: "Pagás al confirmar el checkout, después de elegir la entrega.",
	},
	{
		question: "¿Qué pasa después del pago?",
		answer:
			"Tu pedido pasa a seguimiento y te informamos cada cambio hasta la entrega.",
	},
	{
		question: "¿Dónde sigo el avance de mi compra?",
		answer:
			"En Mis pedidos encontrás el estado y la cronología de cada compra, desde la confirmación del pago hasta la entrega.",
	},
];

type ContactItem = {
	label: string;
	value: string;
	href?: string;
	Icon: LucideIcon;
	external?: boolean;
};

// Digits only, country code included, as wa.me expects. `null` hides the
// WhatsApp contact until the line is contracted.
export const WHATSAPP_NUMBER: string | null = null;

export function getWhatsappContactItem(
	digits: string | null,
): ContactItem | null {
	if (digits === null) return null;
	return {
		label: "WhatsApp",
		value: `+${digits}`,
		href: `https://wa.me/${digits}`,
		Icon: PhoneIcon,
		external: true,
	};
}

const whatsappContactItem = getWhatsappContactItem(WHATSAPP_NUMBER);

export const contactItems: ContactItem[] = [
	{
		label: "Email",
		value: "contacto@coco.app",
		href: "mailto:contacto@coco.app",
		Icon: MailIcon,
	},
	...(whatsappContactItem ? [whatsappContactItem] : []),
];
