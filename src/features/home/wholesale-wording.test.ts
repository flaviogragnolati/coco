import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
	TUTORIAL_VERSIONS,
	tutorialScripts,
} from "~/features/tutorial/tutorial-script";
import { DEFAULT_WEEKLY_CLOSING } from "~/shared/common/weekly-closing";
import {
	announcementMessage,
	footerColumns,
	getFaqItems,
	getHowItWorksSteps,
	heroCopy,
	homeNavLinks,
} from "./home-content";
import {
	getHowItWorksDetail,
	getOrderCalendarLegend,
	howItWorksIdea,
	howItWorksPage,
	orderCalendarLabel,
} from "./how-it-works-detail";

/**
 * "Mayorista" and "al por mayor" explain the buying model, so customers read
 * them only in Cómo funciona (the home section and its page), the FAQ and the
 * tutorial's "Cómo funciona" step.
 */
const WHOLESALE = /mayorist|por mayor/i;

/** Admin-only code: its wording never reaches a customer. */
const ADMIN_ONLY = [
	"src/app/admin",
	"src/features/admin",
	"src/schemas/admin",
	"src/server/api/routers/admin",
	"src/server/services/admin",
	"src/server/services/operations",
];

/** The only storefront files allowed the wording, with how often. */
const ALLOWED_MATCHES: Record<string, number> = {
	// "Sé proveedor" speaks to suppliers, who do sell wholesale.
	"src/app/(storefront)/proveedores/page.tsx": 1,
	"src/features/home/home-content.ts": 3,
	"src/features/home/how-it-works-detail.ts": 4,
	"src/features/tutorial/tutorial-script.ts": 1,
};

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
			? [path]
			: [];
	});
}

function wholesaleMatches(text: string) {
	return text.match(new RegExp(WHOLESALE.source, "gi"))?.length ?? 0;
}

describe("wholesale wording in customer copy", () => {
	it("appears in no customer-facing source file outside the allowed ones", () => {
		const root = process.cwd();
		const found: Record<string, number> = {};
		for (const file of sourceFiles(join(root, "src"))) {
			const path = relative(root, file).split("\\").join("/");
			if (ADMIN_ONLY.some((dir) => path.startsWith(`${dir}/`))) continue;
			const count = wholesaleMatches(readFileSync(file, "utf8"));
			if (count > 0) found[path] = count;
		}
		expect(found).toEqual(ALLOWED_MATCHES);
	});

	it("is limited to Cómo funciona and the FAQ on the home", () => {
		const steps = getHowItWorksSteps(DEFAULT_WEEKLY_CLOSING);
		const faq = getFaqItems(DEFAULT_WEEKLY_CLOSING, []);
		const allowed = [
			...steps.map((step) => `${step.title} ${step.body}`),
			...faq.map((item) => `${item.question} ${item.answer}`),
		].join("\n");
		expect(wholesaleMatches(allowed)).toBe(
			ALLOWED_MATCHES["src/features/home/home-content.ts"],
		);

		const elsewhere = JSON.stringify([
			heroCopy,
			announcementMessage,
			homeNavLinks,
			footerColumns,
		]);
		expect(elsewhere).not.toMatch(WHOLESALE);
	});

	it("is limited to the explanation on the Cómo funciona page", () => {
		const explanation = JSON.stringify([
			howItWorksPage.lead,
			howItWorksIdea,
			getHowItWorksDetail(DEFAULT_WEEKLY_CLOSING),
		]);
		expect(wholesaleMatches(explanation)).toBe(
			ALLOWED_MATCHES["src/features/home/how-it-works-detail.ts"],
		);

		const elsewhere = JSON.stringify([
			howItWorksPage.title,
			orderCalendarLabel(DEFAULT_WEEKLY_CLOSING),
			getOrderCalendarLegend(DEFAULT_WEEKLY_CLOSING),
		]);
		expect(elsewhere).not.toMatch(WHOLESALE);
	});

	it.each(
		TUTORIAL_VERSIONS,
	)("%s tutorial: only the Cómo funciona step uses it", (version) => {
		const steps = tutorialScripts[version]
			.filter((step) => wholesaleMatches(`${step.title} ${step.body}`) > 0)
			.map((step) => step.id);
		expect(steps).toEqual(["how-it-works"]);
	});
});
