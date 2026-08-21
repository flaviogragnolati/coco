import { describe, expect, it } from "vitest";

import {
	parseQaTicketDefinition,
	type QaTicketDefinitionParts,
} from "./qa-ticket-definition.parser";

/**
 * The conservation rule: every non-empty input line stays visible, minus the
 * structural prefix the UI replaces with a heading or a list marker. These two
 * helpers check that nothing vanished; the explicit `toEqual` cases below pin
 * down the exact output and its order.
 */
function visibleLines(parts: QaTicketDefinitionParts) {
	return [
		...parts.preconditions,
		...parts.steps.map((step) => step.text),
		...parts.context.map((line) => line.trim()),
	];
}

function expectNothingLost(input: string, parts: QaTicketDefinitionParts) {
	const rendered = visibleLines(parts).join("\n");
	for (const line of input.split(/\r\n?|\n/)) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const withoutPrefix = trimmed
			.replace(/^precondici(?:ón|ones)\s*:\s*/i, "")
			.replace(/^\d+\)\s*/, "");
		expect(rendered).toContain(withoutPrefix);
	}
}

describe("parseQaTicketDefinition", () => {
	it("reads the singular precondition, the steps and reports structure", () => {
		const input =
			'Precondición: MP deshabilitado.\n1) Confirmar con un método cuya referencia NO contiene "fail".\n2) Observar el panel de resultado.';

		const parts = parseQaTicketDefinition(input);

		expect(parts.preconditions).toEqual(["MP deshabilitado."]);
		expect(parts.steps).toEqual([
			{
				number: 1,
				text: 'Confirmar con un método cuya referencia NO contiene "fail".',
			},
			{ number: 2, text: "Observar el panel de resultado." },
		]);
		expect(parts.context).toEqual([]);
		expect(parts.hasStructure).toBe(true);
		expectNothingLost(input, parts);
	});

	it("reads the plural form and is indifferent to case", () => {
		const parts = parseQaTicketDefinition(
			"PRECONDICIONES: sesión iniciada.\nprecondición: carrito vacío.",
		);

		expect(parts.preconditions).toEqual(["sesión iniciada.", "carrito vacío."]);
		expect(parts.context).toEqual([]);
	});

	it("accepts step numbers of several digits", () => {
		const parts = parseQaTicketDefinition(
			"9) Noveno.\n10) Décimo.\n123) Otro.",
		);

		expect(parts.steps.map((step) => step.number)).toEqual([9, 10, 123]);
	});

	it("reads CRLF and CR the same way as LF", () => {
		const lf = parseQaTicketDefinition("Precondiciones: A.\n1) B.\n2) C.");

		expect(
			parseQaTicketDefinition("Precondiciones: A.\r\n1) B.\r\n2) C."),
		).toEqual(lf);
		expect(parseQaTicketDefinition("Precondiciones: A.\r1) B.\r2) C.")).toEqual(
			lf,
		);
	});

	it("keeps legacy text whole and asks the caller for the raw fallback", () => {
		const input =
			"Abrir el detalle del pedido y revisar el timeline.\nEl estado debe seguir la última entrega.";

		const parts = parseQaTicketDefinition(input);

		expect(parts.hasStructure).toBe(false);
		expect(parts.preconditions).toEqual([]);
		expect(parts.steps).toEqual([]);
		expect(parts.context).toEqual(input.split("\n"));
		expectNothingLost(input, parts);
	});

	it("keeps the unrecognised lines of a partially structured ticket", () => {
		const input =
			"Este caso cubre el rollover completo.\n1) Ir a /admin/demand.\nOjo: el listado tarda unos segundos.\n2) Ejecutar la operación.";

		const parts = parseQaTicketDefinition(input);

		expect(parts.hasStructure).toBe(true);
		expect(parts.steps.map((step) => step.text)).toEqual([
			"Ir a /admin/demand.",
			"Ejecutar la operación.",
		]);
		expect(parts.context).toEqual([
			"Este caso cubre el rollover completo.",
			"Ojo: el listado tarda unos segundos.",
		]);
		expectNothingLost(input, parts);
	});

	it("preserves gaps and out-of-order numbering exactly as received", () => {
		const parts = parseQaTicketDefinition(
			"3) Tercero.\n1) Primero.\n7) Séptimo.",
		);

		expect(parts.steps).toEqual([
			{ number: 3, text: "Tercero." },
			{ number: 1, text: "Primero." },
			{ number: 7, text: "Séptimo." },
		]);
	});

	it("keeps a bare prefix as text instead of opening an empty block", () => {
		const parts = parseQaTicketDefinition(
			"Precondiciones:\nEntorno de staging.",
		);

		expect(parts.preconditions).toEqual([]);
		expect(parts.hasStructure).toBe(false);
		expect(parts.context).toEqual(["Precondiciones:", "Entorno de staging."]);
	});

	it("returns an empty structure for empty or blank input", () => {
		for (const input of ["", "   ", "\n\n"]) {
			expect(parseQaTicketDefinition(input)).toEqual({
				preconditions: [],
				steps: [],
				context: [],
				hasStructure: false,
			});
		}
	});

	it("drops blank lines only and keeps every other line once", () => {
		const input =
			"Precondiciones: A.\n\n1) B.\n\nNota suelta.\n\n2) C.\n\nCierre.";

		const parts = parseQaTicketDefinition(input);

		expect(visibleLines(parts)).toEqual([
			"A.",
			"B.",
			"C.",
			"Nota suelta.",
			"Cierre.",
		]);
		expectNothingLost(input, parts);
	});
});
