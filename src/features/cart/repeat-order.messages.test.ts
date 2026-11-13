import { expect, test } from "vitest";
import { describeRepeatOutcome } from "./repeat-order.messages";

test("one added product reads in the singular", () => {
	expect(
		describeRepeatOutcome([{ name: "Almendra", outcome: "added" }]),
	).toEqual({
		success: "Sumamos 1 producto a tu pedido.",
		info: [],
		warning: [],
	});
});

test("adjusted products count as added and each gets its own notice", () => {
	expect(
		describeRepeatOutcome([
			{ name: "Almendra", outcome: "added" },
			{ name: "Nuez", outcome: "adjusted" },
			{ name: "Dátil", outcome: "added" },
			{ name: "Miel", outcome: "unavailable" },
		]),
	).toEqual({
		success: "Sumamos 3 productos a tu pedido.",
		info: ["Ajustamos la cantidad de Nuez a lo que se puede comprar hoy."],
		warning: ["Miel ya no está disponible."],
	});
});

test("when nothing could be added only that is said", () => {
	expect(
		describeRepeatOutcome([
			{ name: "Miel", outcome: "unavailable" },
			{ name: "Nuez", outcome: "unavailable" },
		]),
	).toEqual({
		success: null,
		info: [],
		warning: ["No pudimos sumar ninguno de esos productos."],
	});
});
