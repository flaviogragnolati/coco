import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { qaTicketSeedEntries, retiredQaTicketCodes } from "./qa-tickets.data";

/**
 * The minimum end-to-end regression chain of `docs/qa/qa-ciclo-de-vida.md`. The
 * mock payment branch is gone with #17 (ADR 0010), so the chain runs through
 * Mercado Pago (21 + 23) only.
 */
const regressionChain = [
	1, 6, 12, 14, 21, 23, 31, 40, 41, 42, 46, 47, 50, 51, 52, 54, 57, 58, 67,
];

/**
 * Cases rewritten so a tester can run them without prior context: steps open
 * with their preconditions and name the entry points the case cannot be
 * executed without. The list is a spot check of the contract, not a second
 * transcription: exact wording is reviewed against the doc by hand.
 */
const rewrittenDefinitions: Array<{ code: number; mustMention: string[] }> = [
	{
		code: 5,
		mustMention: ["`/products`", '"Sumar al pedido"', "`?product=`"],
	},
	{
		code: 6,
		mustMention: ["`/products`", '"Sumar al pedido"', '"Ver en tu pedido"'],
	},
	{
		code: 7,
		mustMention: ["`/admin/product-terms`", "`/cart`", '"Máximo"', '"1,5"'],
	},
	{
		code: 8,
		mustMention: ["`/admin/product-terms`", "`/cart`", '"Paso"'],
	},
	{ code: 12, mustMention: ["`/cart`", "`/checkout`", "`/admin/carts`"] },
	{ code: 14, mustMention: ['"Entrega"', '"Nueva"', '"Complemento"'] },
	{
		code: 16,
		mustMention: ['"Pago externo"', '"Pendiente"', "Checkout Pro"],
	},
	{
		code: 20,
		mustMention: [
			"`/admin/products`",
			'"Confirmar y pagar"',
			'"Volver al carrito"',
		],
	},
	{ code: 21, mustMention: ["`/admin/payments`", '"Sandbox"', "Checkout Pro"] },
	{
		code: 22,
		mustMention: [
			"`/checkout/mercadopago/success`",
			"`/checkout/mercadopago/failure`",
			"`/checkout/mercadopago/pending`",
			"coco-kappa-ashy",
		],
	},
	{
		code: 23,
		mustMention: [
			"`/admin/payments`",
			"`/my-orders/[id]`",
			'"Eventos"',
			"APRO",
		],
	},
	{ code: 24, mustMention: ["OTHE", "CONT"] },
	{
		code: 25,
		mustMention: ['"Eventos"', "rejected", "Sin vincular"],
	},
	{ code: 26, mustMention: ['"Reprocesar"'] },
	{
		code: 27,
		mustMention: ["misma orden", "mismo intento", "vencido", "cambio de medio"],
	},
	{
		code: 30,
		mustMention: ["`/admin/payments`", '"Seguimiento del pedido"'],
	},
	{
		code: 31,
		mustMention: [
			"`/my-orders/[id]`",
			"`/admin/operations`",
			"`/admin/supplier-orders`",
			"`/admin/shipments`",
			"`/admin/packages`",
		],
	},
	{ code: 32, mustMention: ["`/my-orders/[id]`", "`/admin/operations`"] },
	{
		code: 36,
		mustMention: ['"Reconciliar ahora"', "Pago (id de Mercado Pago)"],
	},
	{ code: 37, mustMention: ['"Ignorar"', '"Reprocesar"'] },
	{
		code: 38,
		mustMention: [
			'"Administrador"',
			"`/admin/payments`",
			'"Expiración minutos"',
			"`CONFIRMAR`",
		],
	},
	{ code: 54, mustMention: ["`/admin/packages`", "19/09/2026"] },
	{ code: 113, mustMention: ["`/products`", '"Tutorial rápido · 1 min"'] },
	{
		code: 114,
		mustMention: ['"Tutorial completo · 3 min"', '"Ir al catálogo"'],
	},
	{
		code: 115,
		mustMention: [
			"`/checkout`",
			"`/checkout/mercadopago/success`",
			'"¿Primera vez en CoCo?"',
			'"Ahora no"',
		],
	},
];

const byCode = new Map(qaTicketSeedEntries.map((entry) => [entry.code, entry]));

function seedSource() {
	return readFileSync(new URL("./qa-seed.ts", import.meta.url), "utf8");
}

describe("qaTicketSeedEntries", () => {
	it("transcribes 68 active tests: codes 1-67 except the retired 15 and 17, then the tutorial cases 113-115", () => {
		// 68-112 were created from the admin board; the seed must never reuse them.
		const codes = qaTicketSeedEntries.map((entry) => entry.code);
		const expected = [
			...Array.from({ length: 67 }, (_, index) => index + 1).filter(
				(code) => code !== 15 && code !== 17,
			),
			113,
			114,
			115,
		];

		expect(qaTicketSeedEntries).toHaveLength(68);
		expect(codes).toEqual(expected);
		expect(new Set(codes).size).toBe(codes.length);
	});

	it("marks exactly the regression chain", () => {
		const marked = qaTicketSeedEntries
			.filter((entry) => entry.isRegressionPath)
			.map((entry) => entry.code);

		expect(marked).toEqual(regressionChain);
		expect(marked).not.toContain(17);
	});

	it("leaves no field empty", () => {
		for (const entry of qaTicketSeedEntries) {
			for (const field of [
				"section",
				"title",
				"actor",
				"feature",
				"steps",
				"expectedResult",
			] as const) {
				expect(
					entry[field].trim().length,
					`#${entry.code} ${field}`,
				).toBeGreaterThan(0);
			}
		}
	});

	it("keeps markdown table syntax out of the transcribed text", () => {
		for (const entry of qaTicketSeedEntries) {
			expect(`${entry.steps}${entry.expectedResult}`).not.toContain("|");
		}
	});
});

describe("rewritten definitions", () => {
	it.each(rewrittenDefinitions)("#$code opens with its preconditions", ({
		code,
	}) => {
		const entry = byCode.get(code);

		expect(entry, `#${code} is missing`).toBeDefined();
		expect(entry?.steps.split("\n")[0]).toMatch(/^Precondiciones: \S/);
	});

	it.each(
		rewrittenDefinitions,
	)("#$code numbers at least two steps consecutively from 1", ({ code }) => {
		const numbers = (byCode.get(code)?.steps ?? "")
			.split("\n")
			.map((line) => /^(\d+)\)\s*\S/.exec(line.trim())?.[1])
			.filter((value): value is string => value !== undefined)
			.map(Number);

		expect(numbers.length, `#${code} steps`).toBeGreaterThanOrEqual(2);
		expect(numbers).toEqual(
			Array.from({ length: numbers.length }, (_, index) => index + 1),
		);
	});

	it.each(
		rewrittenDefinitions,
	)("#$code names the places the tester has to go", ({ code, mustMention }) => {
		const entry = byCode.get(code);
		const definition = `${entry?.steps ?? ""}\n${entry?.expectedResult ?? ""}`;

		for (const mention of mustMention) {
			expect(definition, `#${code} omits ${mention}`).toContain(mention);
		}
	});

	it.each(rewrittenDefinitions)("#$code states more than one verification", ({
		code,
	}) => {
		const checks = (byCode.get(code)?.expectedResult ?? "")
			.split("\n")
			.filter((line) => line.trim().length > 0);

		expect(checks.length, `#${code} expectedResult`).toBeGreaterThanOrEqual(2);
	});
});

describe("retiredQaTicketCodes", () => {
	// #15 tested the user-managed payment methods ADR 0010 removed.
	it("lists #15 and #17 without duplicates", () => {
		expect(retiredQaTicketCodes).toContain(15);
		expect(retiredQaTicketCodes).toContain(17);
		expect(new Set(retiredQaTicketCodes).size).toBe(
			retiredQaTicketCodes.length,
		);
	});

	it("never overlaps the active entries", () => {
		const active = new Set(qaTicketSeedEntries.map((entry) => entry.code));

		for (const code of retiredQaTicketCodes) {
			expect(active.has(code), `#${code} is retired and still seeded`).toBe(
				false,
			);
		}
	});
});

describe("qa-seed.ts", () => {
	it("keeps the upsert update restricted to canonical specification fields", () => {
		const updateBlock = seedSource().match(
			/\n\s*update: \{([\s\S]*?)\n\s*\},\n\s*\}\);/,
		)?.[1];

		expect(updateBlock).toBeDefined();
		for (const field of [
			"section",
			"title",
			"actor",
			"feature",
			"steps",
			"expectedResult",
			"isRegressionPath",
		]) {
			expect(updateBlock).toContain(field);
		}
		for (const trackingField of [
			"status",
			"notes",
			"assigneeId",
			"deleted",
			"evidence",
		]) {
			expect(updateBlock).not.toContain(trackingField);
		}
	});

	it("writes `deleted` outside create only to retire a listed code", () => {
		const code = seedSource().replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
		const createBlock = code.match(/\n\s*create: \{([\s\S]*?)\n\s*\},/)?.[1];

		expect(createBlock).toBeDefined();
		const outsideCreate = code.replace(createBlock ?? "", "");

		// Two writes survive, both in the retirement: the filter that narrows to
		// the listed codes still active, and the data that only ever sets true.
		expect(outsideCreate.match(/deleted: \w+/g)).toEqual([
			"deleted: false",
			"deleted: true",
		]);
		expect(outsideCreate).toContain(
			"where: { code: { in: retiredQaTicketCodes }, deleted: false }",
		);
		expect(outsideCreate).toContain("data: { deleted: true }");
	});

	it("reports how many codes it retired", () => {
		expect(seedSource()).toContain("retirados");
	});
});

describe("Mercado Pago validation definitions", () => {
	it("describes pending and in-process outcomes visible in the UI", () => {
		const definition = byCode.get(24)?.expectedResult ?? "";
		for (const state of [
			"CONT",
			"pending",
			"inProcess",
			"Pendiente",
			"En proceso",
		])
			expect(definition).toContain(state);
	});
	it.each([
		21, 22, 23, 24, 25, 26, 27, 35, 36, 37, 38,
	])("keeps #%i executable without technical tools", (code) => {
		const entry = byCode.get(code);
		const definition = `${entry?.steps ?? ""}\n${entry?.expectedResult ?? ""}`;
		expect(definition).not.toMatch(
			/curl|Payment\.get|\bHTTP\b|\boutbox\b|\blogs\b|x-signature|\bSQL\b|DevTools|\bPOST\b|\bHMAC\b/i,
		);
		expect(entry?.steps).toMatch(/^Precondiciones:/);
	});
	it("gives a prepared rejected event rather than asking QA to generate one", () => {
		expect(byCode.get(25)?.steps).toContain("evento de prueba ya disponible");
		expect(byCode.get(25)?.steps).toContain("QA no necesita generarlo");
	});

	it.each([
		23, 24, 27,
	])("keeps #%i consistent with the lifecycle table", (code) => {
		const entry = byCode.get(code);
		const row = readFileSync(
			new URL("../docs/qa/qa-ciclo-de-vida.md", import.meta.url),
			"utf8",
		)
			.split("\n")
			.find((line) => line.startsWith(`| ${code} |`));
		expect(row).toBeDefined();
		expect(row).toContain(entry?.steps.replaceAll("\n", " "));
		expect(row).toContain(entry?.expectedResult.replaceAll("\n", " "));
	});
});
