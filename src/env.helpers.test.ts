import { expect, test } from "vitest";

import { assertAppEnvConsistency, defaultAppEnvFor } from "./env.helpers.js";

test("defaultAppEnvFor mirrors production and test, defaults everything else", () => {
	expect(defaultAppEnvFor("production")).toBe("production");
	expect(defaultAppEnvFor("test")).toBe("test");
	expect(defaultAppEnvFor("development")).toBe("development");
});

test("defaultAppEnvFor falls back to development for unset or empty NODE_ENV", () => {
	expect(defaultAppEnvFor(undefined)).toBe("development");
	expect(defaultAppEnvFor("")).toBe("development");
	expect(defaultAppEnvFor("staging")).toBe("development");
});

test("assertAppEnvConsistency rejects a production build with a non-production APP_ENV", () => {
	expect(() => assertAppEnvConsistency("production", "development")).toThrow(
		/APP_ENV/,
	);
	expect(() => assertAppEnvConsistency("production", "test")).toThrow(
		/APP_ENV/,
	);
});

test("assertAppEnvConsistency accepts every other combination", () => {
	const safe: [string, string][] = [
		["production", "production"],
		["development", "development"],
		["development", "production"],
		["development", "test"],
		["test", "test"],
		["test", "development"],
	];

	for (const [nodeEnv, appEnv] of safe) {
		expect(() => assertAppEnvConsistency(nodeEnv, appEnv)).not.toThrow();
	}
});
