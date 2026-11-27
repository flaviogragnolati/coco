import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "~/components/ui/tooltip";
import { buildTutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import {
	TUTORIAL_TARGET_ATTRIBUTE,
	type TutorialTargetId,
	targetsByScene,
	tutorialScripts,
} from "~/features/tutorial/tutorial-script";
import { TutorialScene } from "./tutorial-scene";

/**
 * Only exist in the browser: the mini-cart and the delivery and payment sheets
 * portal, and the purchase block is tagged after the card mounts. The e2e walk
 * covers them.
 */
const browserOnlyTargets = new Set<TutorialTargetId>([
	"mini-cart",
	"product-purchase",
	"finish-delivery",
	"finish-payment",
]);

const fixtures = buildTutorialFixtures(new Date("2026-11-06T15:00:00.000Z"));

describe("tutorial scenes", () => {
	const steps = Object.values(tutorialScripts).flat();

	it.each(
		steps.filter((step) => step.target !== null),
	)("$id: its scene renders $target", (step) => {
		if (step.target === null || browserOnlyTargets.has(step.target)) return;
		// The root layout provides it to every page; the journey stepper needs it.
		const html = renderToStaticMarkup(
			<TooltipProvider>
				<TutorialScene fixtures={fixtures} scene={step.scene} />
			</TooltipProvider>,
		);
		expect(html).toContain(`${TUTORIAL_TARGET_ATTRIBUTE}="${step.target}"`);
	});

	it("the catalog's photos carry the legend in their category's tone, the photo-less honey none", () => {
		const html = renderToStaticMarkup(
			<TooltipProvider>
				<TutorialScene
					fixtures={fixtures}
					scene={{ id: "catalog", added: false }}
				/>
			</TooltipProvider>,
		);
		const legends = html.match(/style="color:#724f27">Imagen ilustrativa/g);
		const photos = fixtures.catalogProducts.filter(
			(product) => product.imageUrl,
		);
		expect(legends).toHaveLength(photos.length);
		expect(html).toContain("Sin imagen para Miel pura");
	});

	it("the browser-only exceptions are real targets of their scene", () => {
		const sceneTargets = Object.values(targetsByScene).flat();
		for (const target of browserOnlyTargets) {
			expect(sceneTargets).toContain(target);
		}
	});
});
