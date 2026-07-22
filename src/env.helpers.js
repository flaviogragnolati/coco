/**
 * Loaded by `src/env.js`, which `next.config.js` imports in plain Node: this file
 * must stay plain `.js` with no `~/*` aliases, or config loading breaks.
 */

/**
 * @param {string | undefined} nodeEnv
 * @returns {"development" | "test" | "production"}
 */
export function defaultAppEnvFor(nodeEnv) {
	if (nodeEnv === "production") return "production";
	if (nodeEnv === "test") return "test";
	return "development";
}

/**
 * A production build with a non-production `APP_ENV` has no legitimate expression:
 * the enum has no `staging` member, so the combination can only be a misconfiguration
 * that silently relaxes every `APP_ENV !== "production"` gate.
 *
 * @param {string} nodeEnv
 * @param {string} appEnv
 * @returns {void}
 */
export function assertAppEnvConsistency(nodeEnv, appEnv) {
	if (nodeEnv === "production" && appEnv !== "production") {
		throw new Error(
			`Invalid environment: NODE_ENV="production" requires APP_ENV="production", got APP_ENV="${appEnv}". ` +
				'Unset APP_ENV to derive it from NODE_ENV, or set it to "production".',
		);
	}
}
