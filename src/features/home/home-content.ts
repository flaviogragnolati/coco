import { type LucideIcon, MailIcon, PhoneIcon } from "lucide-react";
import type { FaqPickupPoint } from "~/shared/common/home.types";
import {
	formatClosingSlot,
	formatClosingTime,
	formatDeliveryLeadTimeBetween,
	type WeeklyClosingSchedule,
	weekdayName,
	weekdayPlural,
} from "~/shared/common/weekly-closing";

export const homeNavLinks = [
	{ href: "/#como-funciona", label: "Cómo funciona" },
	{ href: "/#ofertas", label: "Ofertas" },
	{ href: "/#preguntas-frecuentes", label: "Preguntas frecuentes" },
	{ href: "/#contacto", label: "Contacto" },
];

export const announcementMessage = "Compras comunitarias en Ushuaia";

export const heroCopy = {
	title: "Comprar en grupo sale menos.",
	lead: "Juntamos pedidos de toda Ushuaia y hacemos una sola compra grande. Elegís lo que necesitás; de comprarlo y traerlo nos encargamos nosotros.",
	cta: "Ver el catálogo",
	ctaNote: "No hace falta registrarte para mirar",
};

export type HomeStep = { title: string; body: string };

export function getHowItWorksSteps(
	schedule: WeeklyClosingSchedule,
): HomeStep[] {
	const weekday = weekdayName(schedule.closingWeekday);
	return [
		{
			title: "Armás tu pedido.",
			body: `Elegís del catálogo y sumás lo que necesitás. Tenés tiempo hasta el ${formatClosingSlot(schedule)}.`,
		},
		{
			title: `Cerramos el ${weekday}.`,
			body: "Juntamos todos los pedidos y hacemos una sola compra al por mayor en Buenos Aires.",
		},
		{
			title: "Viaja a Ushuaia.",
			body: `La mercadería tarda ${formatDeliveryLeadTimeBetween(schedule)} en llegar. En Mis pedidos ves en qué etapa está.`,
		},
		{
			title: "Retirás o te lo enviamos.",
			body: "Al confirmar el pedido elegís retirarlo en el punto de retiro o recibirlo en tu casa.",
		},
	];
}

export type FaqItem = { question: string; answer: string };

function describePickupPoints(points: FaqPickupPoint[]) {
	const [only] = points;
	if (!only) return "";
	if (points.length === 1) {
		const line2 = only.line2 ? `, ${only.line2}` : "";
		return ` El punto de retiro está en ${only.line1}${line2}, ${only.city} (${only.hours}).`;
	}
	const list = points
		.map(
			(point) =>
				`${point.name}, ${point.line1}, ${point.city} (${point.hours})`,
		)
		.join("; ");
	return ` Los puntos de retiro son: ${list}.`;
}

function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getFaqItems(
	schedule: WeeklyClosingSchedule,
	pickupPoints: FaqPickupPoint[],
): FaqItem[] {
	const weekday = weekdayName(schedule.closingWeekday);
	return [
		{
			question: "¿Cuándo cierran los pedidos?",
			answer: `Todos los ${weekdayPlural(schedule.closingWeekday)} ${formatClosingTime(schedule)}, hora de Argentina. Lo que confirmes y pagues hasta ese momento entra en la compra de esa semana; lo que llegue después, en la del ${weekday} siguiente. Arriba de la página ves cuánto falta para el próximo cierre.`,
		},
		{
			question: "¿Cuánto tarda en llegar mi compra?",
			answer: `${capitalize(formatDeliveryLeadTimeBetween(schedule))} desde el cierre. Hacemos una sola compra al por mayor en Buenos Aires y la mercadería viaja hasta Ushuaia: al ser una isla, el camión cruza a Chile, atraviesa el Estrecho de Magallanes en balsa, vuelve a entrar a la Argentina y cruza la cordillera. En Mis pedidos ves en qué etapa está.`,
		},
		{
			question: "¿Cuándo pago mi pedido?",
			answer:
				"Al confirmarlo. Elegís cómo recibirlo y pagás con Mercado Pago o por transferencia bancaria. Si pagás por transferencia, te damos los datos al confirmar y tu pago queda registrado cuando revisamos el comprobante.",
		},
		{
			question: "¿Dónde sigo mi pedido?",
			answer:
				"En Mis pedidos. Ahí ves cada pedido que pagaste y la etapa en la que está, desde el pago hasta la entrega. Si algo cambia, por ejemplo una demora o una cantidad distinta, también lo vas a ver ahí.",
		},
		{
			question: "¿Cómo recibo mi pedido?",
			answer: `Lo elegís al confirmar el pedido: te lo llevamos a la dirección que cargues o lo retirás en el punto de retiro, en su horario. Las dos opciones cuestan lo mismo.${describePickupPoints(pickupPoints)}`,
		},
		{
			question: "¿Cómo conseguimos estos precios?",
			answer:
				"Juntamos los pedidos de mucha gente y hacemos una sola compra grande, directo al proveedor. Así pagamos precio mayorista por productos de primera calidad. Si comparás, hacelo con productos de la misma calidad: un aceite de oliva extra virgen no es lo mismo que uno común, aunque los dos sean un litro.",
		},
	];
}

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
