import type { CartAddedLine } from "~/shared/common/cart.types";

export type RepeatOutcomeMessages = {
	success: string | null;
	info: string[];
	warning: string[];
};

/** The toasts that tell the customer what a repeated order added. */
export function describeRepeatOutcome(
	lines: Pick<CartAddedLine, "name" | "outcome">[],
): RepeatOutcomeMessages {
	const added = lines.filter((line) => line.outcome !== "unavailable").length;
	if (added === 0) {
		return {
			success: null,
			info: [],
			warning: ["No pudimos sumar ninguno de esos productos."],
		};
	}

	return {
		success:
			added === 1
				? "Sumamos 1 producto a tu pedido."
				: `Sumamos ${added} productos a tu pedido.`,
		info: lines
			.filter((line) => line.outcome === "adjusted")
			.map(
				(line) =>
					`Ajustamos la cantidad de ${line.name} a lo que se puede comprar hoy.`,
			),
		warning: lines
			.filter((line) => line.outcome === "unavailable")
			.map((line) => `${line.name} ya no está disponible.`),
	};
}
