import { defineConfig } from "vitest/config";

export default defineConfig({
	// Resolves the "~/*" aliases declared in tsconfig.json
	resolve: { tsconfigPaths: true },
	test: {
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
		// e2e specs are driven by Playwright, not vitest
		exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
	},
});
