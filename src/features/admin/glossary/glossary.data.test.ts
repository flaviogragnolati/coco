import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { findAdminNavItem } from "~/features/admin/shell/admin-nav";
import { glossaryEntries } from "./glossary.data";
import { glossarySections } from "./glossary.sections";

/** Better Auth infrastructure tables; they have no admin surface. */
const IGNORED_MODELS = ["Session", "Account", "Verification"];

const schema = readFileSync(
	join(process.cwd(), "prisma", "schema.prisma"),
	"utf8",
);

type ParsedModel = {
	name: string;
	table: string;
	/** Field name → declared type, enums included. */
	fields: Record<string, string>;
};

function stripLineComments(body: string) {
	return body
		.split("\n")
		.map((line) => line.replace(/\/\/.*$/, "").trim())
		.filter((line) => line.length > 0);
}

function parseModels(): ParsedModel[] {
	const models: ParsedModel[] = [];
	const blocks = schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm);

	for (const [, name, body] of blocks) {
		if (!name || !body) continue;

		const table = body.match(/@@map\("([^"]+)"\)/)?.[1];
		if (!table) {
			throw new Error(`El modelo ${name} no declara @@map`);
		}

		const fields: Record<string, string> = {};
		for (const line of stripLineComments(body)) {
			// Attributes and blocks start with `@@`; relations and scalars start
			// with the field name followed by its type.
			const field = line.match(/^(\w+)\s+(\w+)/);
			if (!field || line.startsWith("@@")) continue;
			if (/@map\(/.test(line)) {
				throw new Error(
					`${name}.${field[1]} declara @map: el glosario asume columnas camelCase (ver el plan §6)`,
				);
			}
			fields[field[1] as string] = field[2] as string;
		}

		models.push({ name, table, fields });
	}

	return models;
}

function parseEnums(): Record<string, string[]> {
	const enums: Record<string, string[]> = {};
	const blocks = schema.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm);

	for (const [, name, body] of blocks) {
		if (!name || !body) continue;
		if (/@@map\(/.test(body)) {
			throw new Error(
				`El enum ${name} declara @@map: el glosario asume que el tipo conserva el nombre Prisma (ver el plan §6)`,
			);
		}
		enums[name] = stripLineComments(body);
	}

	return enums;
}

const models = parseModels();
const enums = parseEnums();
const documentedModels = models.filter(
	(model) => !IGNORED_MODELS.includes(model.name),
);

const entityOccurrenceCodes = glossaryEntries
	.filter((entry) => entry.kind === "entity")
	.flatMap((entry) => (entry.occurrences ?? []).map((o) => o.code));

const statusOccurrences = glossaryEntries
	.filter((entry) => entry.kind === "status")
	.flatMap((entry) => entry.occurrences ?? []);

function countOf<T>(values: T[], value: T) {
	return values.filter((candidate) => candidate === value).length;
}

describe("glossary dataset covers the Prisma schema", () => {
	it("parses the schema it asserts against", () => {
		expect(models.length).toBeGreaterThan(30);
		expect(Object.keys(enums).length).toBeGreaterThan(30);
	});

	it("documents every model exactly once", () => {
		const missing = documentedModels
			.filter((model) => countOf(entityOccurrenceCodes, model.name) === 0)
			.map((model) => model.name);
		const duplicated = documentedModels
			.filter((model) => countOf(entityOccurrenceCodes, model.name) > 1)
			.map((model) => model.name);

		expect({ missing, duplicated }).toEqual({ missing: [], duplicated: [] });
	});

	it("maps every entity occurrence to its table", () => {
		const wrong = glossaryEntries
			.filter((entry) => entry.kind === "entity")
			.flatMap((entry) => entry.occurrences ?? [])
			.filter((occurrence) => {
				const model = models.find((m) => m.name === occurrence.code);
				return !model || model.table !== occurrence.db;
			})
			.map((occurrence) => `${occurrence.code} → ${occurrence.db}`);

		expect(wrong).toEqual([]);
	});

	it("documents every enum value exactly once", () => {
		const codes = statusOccurrences.map((occurrence) => occurrence.code);
		const expected = Object.entries(enums).flatMap(([name, values]) =>
			values.map((value) => `${name}.${value}`),
		);

		const missing = expected.filter((code) => countOf(codes, code) === 0);
		const duplicated = expected.filter((code) => countOf(codes, code) > 1);
		const unknown = codes.filter((code) => !expected.includes(code));

		expect({ missing, duplicated, unknown }).toEqual({
			missing: [],
			duplicated: [],
			unknown: [],
		});
	});

	it("maps every status occurrence to a real column of that enum type", () => {
		const dangling = statusOccurrences
			.filter((occurrence) => {
				const [enumName] = occurrence.code.split(".");
				const [table, column] = occurrence.db.split(".");
				const model = models.find((candidate) => candidate.table === table);
				return !model || !column || model.fields[column] !== enumName;
			})
			.map((occurrence) => `${occurrence.code} → ${occurrence.db}`);

		expect(dangling).toEqual([]);
	});
});

describe("glossary dataset is internally consistent", () => {
	it("has unique slugs", () => {
		const slugs = glossaryEntries.map((entry) => entry.slug);
		const duplicated = slugs.filter((slug) => countOf(slugs, slug) > 1);

		expect([...new Set(duplicated)]).toEqual([]);
	});

	it("defines every concept and entity", () => {
		const undefinedEntries = glossaryEntries
			.filter(
				(entry) =>
					entry.kind !== "status" && !(entry.definition ?? "").trim().length,
			)
			.map((entry) => entry.slug);

		expect(undefinedEntries).toEqual([]);
	});

	it("only uses declared sections", () => {
		const sectionIds = glossarySections.map((section) => section.id);
		const unknown = glossaryEntries
			.filter((entry) => !sectionIds.includes(entry.section))
			.map((entry) => `${entry.slug}: ${entry.section}`);

		expect(unknown).toEqual([]);
	});

	it("only links to hrefs the admin navigation resolves", () => {
		const dangling = glossaryEntries
			.filter((entry) => entry.href && !findAdminNavItem(entry.href))
			.map((entry) => `${entry.slug}: ${entry.href}`);

		expect(dangling).toEqual([]);
	});
});
