import {
	formatClosingSlot,
	formatClosingTime,
	formatDeliveryLeadTime,
	formatDeliveryLeadTimeBetween,
	type WeeklyClosingSchedule,
	weekdayName,
	weekdayPlural,
} from "~/shared/common/weekly-closing";
import { getHowItWorksSteps } from "./home-content";

export const howItWorksPage = {
	title: "Una compra grande entre todos, paso a paso.",
	lead: "CoCo junta los pedidos de los vecinos de Ushuaia, hace una sola compra al por mayor en Buenos Aires y reparte lo que llega. Acá está todo el recorrido, desde que armás tu pedido hasta que lo tenés en tu casa.",
};

export const howItWorksIdea = [
	"Un proveedor mayorista vende más barato cuando le compran mucho de una vez. Una sola familia no llega a esas cantidades; muchas familias juntas, sí.",
	"Por eso juntamos los pedidos de mucha gente y hacemos una sola compra grande, directo al proveedor. Así pagamos precio mayorista por productos de primera calidad.",
	"Vos solo elegís lo que necesitás. De coordinar la compra, traerla hasta Ushuaia y repartirla nos encargamos nosotros.",
];

export type HowItWorksDetailStep = {
	when: string;
	title: string;
	paragraphs: string[];
};

export function getHowItWorksDetail(
	schedule: WeeklyClosingSchedule,
): HowItWorksDetailStep[] {
	const weekday = weekdayName(schedule.closingWeekday);
	const paragraphs = [
		[
			"Elegís del catálogo y sumás lo que necesitás. No hace falta registrarte para mirar; sí para confirmar.",
			"Al confirmar elegís cómo recibirlo y pagás con Mercado Pago o por transferencia bancaria. Si pagás por transferencia, te damos los datos en ese momento y tu pago queda registrado cuando revisamos el comprobante.",
		],
		[
			`Todos los ${weekdayPlural(schedule.closingWeekday)} ${formatClosingTime(schedule)}, hora de Argentina, juntamos los pedidos confirmados y pagados y hacemos una sola compra al por mayor en Buenos Aires.`,
			`Lo que llegue después del cierre no se pierde: entra en la compra del ${weekday} siguiente.`,
		],
		[
			`Ushuaia está en una isla. El camión cruza a Chile, atraviesa el Estrecho de Magallanes en balsa, vuelve a entrar a la Argentina y cruza la cordillera. Por eso la mercadería tarda ${formatDeliveryLeadTimeBetween(schedule)} desde el cierre.`,
			"En Mis pedidos ves en qué etapa está tu compra. Si algo cambia, por ejemplo una demora o una cantidad distinta, también lo vas a ver ahí.",
		],
		[
			"Según lo que elegiste al confirmar, te lo llevamos a la dirección que cargaste o lo retirás en el punto de retiro, en su horario. Las dos opciones cuestan lo mismo.",
		],
	];
	return getHowItWorksSteps(schedule).map(({ when, title }, index) => ({
		when,
		title,
		paragraphs: paragraphs[index] ?? [],
	}));
}

/** The calendar drawing's accessible name, so it must tell the whole cycle. */
export function orderCalendarLabel(schedule: WeeklyClosingSchedule) {
	return `Calendario de un pedido: se arma hasta el ${formatClosingSlot(schedule)}, ese día cerramos y hacemos la compra, y llega ${formatDeliveryLeadTimeBetween(schedule)} después del cierre.`;
}

export function getOrderCalendarLegend(schedule: WeeklyClosingSchedule): {
	kind: "closing" | "trip" | "window";
	label: string;
}[] {
	const { deliveryDaysMin: min, deliveryDaysMax: max } = schedule;
	const shortest = formatDeliveryLeadTime({
		...schedule,
		deliveryDaysMax: min,
	});
	const legend: ReturnType<typeof getOrderCalendarLegend> = [
		{ kind: "closing", label: `Cierre: ${formatClosingSlot(schedule)}` },
	];
	if (max > min) {
		legend.push(
			{ kind: "trip", label: `Viaje: ${shortest} como mínimo` },
			{ kind: "window", label: `Puede llegar entre el día ${min} y el ${max}` },
		);
	} else {
		legend.push({ kind: "trip", label: `Viaje: ${shortest}` });
	}
	return legend;
}
