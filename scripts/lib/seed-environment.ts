import {
	assertAppEnvConsistency,
	defaultAppEnvFor,
} from "../../src/env.helpers.js";

/**
 * The APP_ENV a script runs under, derived like `src/env.js` does but without
 * importing it: scripts do not carry the auth and payment variables it demands.
 * A local `.env` pointing at production with no APP_ENV still resolves to
 * development, so this guard protects only environments that declare themselves.
 */

const APP_ENVS = ["development", "test", "production"] as const;
type AppEnv = (typeof APP_ENVS)[number];

type ScriptEnv = Record<string, string | undefined>;

function isAppEnv(value: string): value is AppEnv {
	return (APP_ENVS as readonly string[]).includes(value);
}

export function resolveScriptAppEnv(env: ScriptEnv): AppEnv {
	const declared = env.APP_ENV?.trim();
	const appEnv = declared || defaultAppEnvFor(env.NODE_ENV);
	if (!isAppEnv(appEnv)) {
		throw new Error(
			`Invalid APP_ENV="${appEnv}": expected one of ${APP_ENVS.join(", ")}.`,
		);
	}
	assertAppEnvConsistency(env.NODE_ENV ?? "", appEnv);
	return appEnv;
}

export function assertNotProduction(scriptName: string, env: ScriptEnv) {
	if (resolveScriptAppEnv(env) === "production") {
		throw new Error(
			`${scriptName} borra y recrea datos demo; no corre con APP_ENV=production`,
		);
	}
}
