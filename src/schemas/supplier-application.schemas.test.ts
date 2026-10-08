import { describe, expect, it } from "vitest";

import {
	SUPPLIER_APPLICATION_LIMITS,
	supplierApplicationSubmitInputSchema,
} from "./supplier-application.schemas";

const valid = {
	contactName: "Ana Pérez",
	companyName: "Distribuidora Sur",
	email: "ana@distribuidorasur.com.ar",
	phone: "",
	offering: "Yerba y aceite por bulto, despacho desde Río Grande.",
	website: "",
};

function issuesAt(input: unknown, field: string) {
	const result = supplierApplicationSubmitInputSchema.safeParse(input);
	if (result.success) return [];
	return result.error.issues
		.filter((issue) => issue.path[0] === field)
		.map((issue) => issue.message);
}

describe("supplierApplicationSubmitInputSchema", () => {
	it("trims the text and stores a blank contact channel as null", () => {
		expect(
			supplierApplicationSubmitInputSchema.parse({
				...valid,
				contactName: "  Ana Pérez ",
				phone: "   ",
			}),
		).toMatchObject({
			contactName: "Ana Pérez",
			email: valid.email,
			phone: null,
		});
	});

	it("accepts a phone without an email", () => {
		expect(
			supplierApplicationSubmitInputSchema.parse({
				...valid,
				email: "",
				phone: "+54 9 2901 (15) 123-456",
			}),
		).toMatchObject({ email: null, phone: "+54 9 2901 (15) 123-456" });
	});

	it("requires at least one way to reach the sender", () => {
		expect(issuesAt({ ...valid, email: " ", phone: null }, "email")).toEqual([
			"Dejanos un email o un teléfono para contactarte",
		]);
	});

	it("rejects a malformed email or phone", () => {
		expect(issuesAt({ ...valid, email: "ana@" }, "email")).toEqual([
			"Ingresá un email válido",
		]);
		expect(issuesAt({ ...valid, phone: "llamame" }, "phone")).toEqual([
			"Ingresá un teléfono válido",
		]);
		expect(issuesAt({ ...valid, phone: "12-34" }, "phone")).toEqual([
			"Ingresá un teléfono válido",
		]);
	});

	it("requires name, company and offering", () => {
		for (const field of ["contactName", "companyName", "offering"]) {
			expect(issuesAt({ ...valid, [field]: "  " }, field)).toHaveLength(1);
		}
	});

	it("caps every free-text field", () => {
		const tooLong = (max: number) => "x".repeat(max + 1);

		expect(
			issuesAt(
				{
					...valid,
					contactName: tooLong(SUPPLIER_APPLICATION_LIMITS.contactName),
				},
				"contactName",
			),
		).toHaveLength(1);
		expect(
			issuesAt(
				{
					...valid,
					companyName: tooLong(SUPPLIER_APPLICATION_LIMITS.companyName),
				},
				"companyName",
			),
		).toHaveLength(1);
		expect(
			issuesAt(
				{ ...valid, offering: tooLong(SUPPLIER_APPLICATION_LIMITS.offering) },
				"offering",
			),
		).toHaveLength(1);
	});

	it("lets any filled honeypot through so the service can discard it quietly", () => {
		for (const website of ["https://spam.example", "x".repeat(10_000)]) {
			expect(
				supplierApplicationSubmitInputSchema.parse({ ...valid, website }),
			).toMatchObject({ website });
		}
	});
});
