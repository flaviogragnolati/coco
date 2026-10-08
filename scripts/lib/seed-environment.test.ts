import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { assertNotProduction, resolveScriptAppEnv } from "./seed-environment";

describe("resolveScriptAppEnv", () => {
	it("prefers a trimmed APP_ENV", () => {
		expect(
			resolveScriptAppEnv({ APP_ENV: " test ", NODE_ENV: "development" }),
		).toBe("test");
	});

	it("derives it from NODE_ENV when unset", () => {
		expect(resolveScriptAppEnv({ NODE_ENV: "production" })).toBe("production");
		expect(resolveScriptAppEnv({})).toBe("development");
	});

	it("rejects an unknown value", () => {
		expect(() => resolveScriptAppEnv({ APP_ENV: "staging" })).toThrow(
			/Invalid APP_ENV/,
		);
	});
});

describe("assertNotProduction", () => {
	it("refuses APP_ENV=production", () => {
		expect(() =>
			assertNotProduction("db:seed:test", { APP_ENV: "production" }),
		).toThrow(
			"db:seed:test borra y recrea datos demo; no corre con APP_ENV=production",
		);
	});

	it("refuses an empty APP_ENV under NODE_ENV=production", () => {
		expect(() =>
			assertNotProduction("db:seed:test", {
				APP_ENV: "",
				NODE_ENV: "production",
			}),
		).toThrow(/APP_ENV=production/);
	});

	it("refuses a production build that claims to be development", () => {
		expect(() =>
			assertNotProduction("db:seed:test", {
				APP_ENV: "development",
				NODE_ENV: "production",
			}),
		).toThrow(/requires APP_ENV="production"/);
	});

	it.each(["development", "test"])("lets APP_ENV=%s through", (appEnv) => {
		expect(() =>
			assertNotProduction("db:seed:test", { APP_ENV: appEnv }),
		).not.toThrow();
	});
});

describe("prisma/seed.ts", () => {
	const source = readFileSync(
		new URL("../../prisma/seed.ts", import.meta.url),
		"utf8",
	);

	it("checks the environment before it builds a database client", () => {
		const guard = source.indexOf('assertNotProduction("db:seed:test"');

		expect(guard).toBeGreaterThan(-1);
		expect(guard).toBeLessThan(source.indexOf("new PrismaClient"));
		expect(guard).toBeLessThan(source.indexOf("DATABASE_URL"));
	});
});
