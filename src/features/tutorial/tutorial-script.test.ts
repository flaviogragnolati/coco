import { describe, expect, it } from "vitest";

import { userTrackingStageDefinitions } from "~/shared/common/tracking-display";
import {
	parseTutorialParams,
	TUTORIAL_TARGETS,
	TUTORIAL_VERSIONS,
	targetsByScene,
	tutorialHref,
	tutorialScripts,
	tutorialTarget,
} from "./tutorial-script";

describe("tutorial scripts", () => {
	it("has 12 express steps and 21 complete steps", () => {
		expect(tutorialScripts.rapido).toHaveLength(12);
		expect(tutorialScripts.completo).toHaveLength(21);
	});

	it.each(TUTORIAL_VERSIONS)("%s: ids are unique", (version) => {
		const ids = tutorialScripts[version].map((step) => step.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each(
		TUTORIAL_VERSIONS,
	)("%s: opens untargeted, closes once, targets every middle step", (version) => {
		const script = tutorialScripts[version];
		expect(script[0]?.target).toBeNull();
		expect(script.at(-1)?.closing).toBe(true);
		expect(script.filter((step) => step.closing)).toHaveLength(1);
		for (const step of script.slice(1, -1)) {
			expect(step.target, step.id).not.toBeNull();
		}
	});

	it.each(
		TUTORIAL_VERSIONS,
	)("%s: every target belongs to its step's scene", (version) => {
		for (const step of tutorialScripts[version]) {
			if (step.target === null) continue;
			expect(targetsByScene[step.scene.id], step.id).toContain(step.target);
		}
	});

	it.each(
		TUTORIAL_VERSIONS,
	)("%s: the mini-cart is only highlighted once a product was added", (version) => {
		for (const step of tutorialScripts[version]) {
			if (step.target !== "mini-cart") continue;
			expect(step.scene).toEqual({ id: "catalog", added: true });
		}
	});

	it("every scene target is a known target, and every target has a scene", () => {
		const sceneTargets = Object.values(targetsByScene).flat();
		expect([...sceneTargets].sort()).toEqual([...TUTORIAL_TARGETS].sort());
	});

	it("the complete version visits each journey stage once, in order", () => {
		const journeys = tutorialScripts.completo.flatMap((step) =>
			step.scene.id === "orderDetail" && !step.closing
				? [step.scene.journey]
				: [],
		);
		expect(journeys).toEqual(
			userTrackingStageDefinitions.map((stage) => stage.key),
		);
	});

	it.each(
		TUTORIAL_VERSIONS,
	)("%s: copy keeps the customer vocabulary", (version) => {
		for (const step of tutorialScripts[version]) {
			const text = `${step.title} ${step.body}`.toLowerCase();
			expect(text, step.id).not.toMatch(/carrito|recorrido/);
		}
	});

	it("marks an element with the target attribute", () => {
		expect(tutorialTarget("mini-cart")).toEqual({
			"data-tutorial-target": "mini-cart",
		});
	});
});

describe("parseTutorialParams", () => {
	it("defaults to the express version at the first step, returning home", () => {
		expect(parseTutorialParams({})).toEqual({
			version: "rapido",
			stepIndex: 0,
			returnTo: "/",
		});
	});

	it("reads a 1-based step", () => {
		expect(
			parseTutorialParams({ version: "completo", paso: "19" }),
		).toMatchObject({ version: "completo", stepIndex: 18 });
	});

	it.each([
		["0", 0],
		["-3", 0],
		["abc", 0],
		["99", 11],
	])("clamps paso=%s to index %i", (paso, stepIndex) => {
		expect(parseTutorialParams({ paso }).stepIndex).toBe(stepIndex);
	});

	it("falls back to the express version for an unknown one", () => {
		expect(parseTutorialParams({ version: "xyz" }).version).toBe("rapido");
	});

	it("takes the first value of a repeated param", () => {
		expect(
			parseTutorialParams({ version: ["completo", "rapido"] }).version,
		).toBe("completo");
	});

	it.each([
		"//evil.com",
		"https://x",
		"/redirect?to=https://x",
		"/\\evil.com",
		"/\t/evil.com",
		"/\n/evil.com",
		"/\r/evil.com",
		"products",
		"/tutorial",
		"/tutorial?version=completo",
	])("rejects volver=%s", (volver) => {
		expect(parseTutorialParams({ volver }).returnTo).toBe("/");
	});

	it.each([
		"/products",
		"/my-orders/12",
		"/tutoriales",
	])("accepts volver=%s", (volver) => {
		expect(parseTutorialParams({ volver }).returnTo).toBe(volver);
	});
});

describe("tutorialHref", () => {
	it("omits the defaults", () => {
		expect(tutorialHref({ version: "rapido" })).toBe(
			"/tutorial?version=rapido",
		);
	});

	it("round-trips through parseTutorialParams", () => {
		const href = tutorialHref({
			version: "completo",
			stepIndex: 4,
			returnTo: "/products?categoria=2",
		});
		const params = Object.fromEntries(
			new URL(href, "https://coco.test").searchParams,
		);
		expect(parseTutorialParams(params)).toEqual({
			version: "completo",
			stepIndex: 4,
			returnTo: "/products?categoria=2",
		});
	});

	it("drops an unsafe return path", () => {
		expect(tutorialHref({ version: "rapido", returnTo: "//evil.com" })).toBe(
			"/tutorial?version=rapido",
		);
	});
});
