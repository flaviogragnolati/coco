import { expect, type Page, test } from "@playwright/test";

// Smooth scrolling lets `toBeInViewport` pass mid-scroll and the next click
// land on whatever is passing under the pointer.
test.use({ reducedMotion: "reduce" });

const heroCta = (page: Page) =>
	page.getByRole("link", { name: "Ver qué se puede comprar" });

async function expectSingleOffersFragment(page: Page) {
	const { hash, href } = new URL(page.url());
	expect(hash).toBe("#ofertas");
	expect(href.split("#ofertas")).toHaveLength(2);
	await expect(page.locator("#ofertas")).toBeInViewport();
}

async function skipWithoutOffers(page: Page) {
	test.skip(
		(await heroCta(page).getAttribute("href")) !== "#ofertas",
		"The current fixture has no active home offers.",
	);
}

/**
 * Counts router navigations (RSC requests that are not prefetches) from now on.
 * A section link must scroll in place without asking the server for anything.
 */
function countNavigationRequests(page: Page) {
	let count = 0;
	page.on("request", (request) => {
		const headers = request.headers();
		const isRsc =
			headers.rsc === "1" || new URL(request.url()).searchParams.has("_rsc");
		if (isRsc && headers["next-router-prefetch"] === undefined) count += 1;
	});
	return () => count;
}

async function clickHeroCtaThreeTimes(page: Page) {
	const navigations = countNavigationRequests(page);
	for (let click = 0; click < 3; click++) {
		await heroCta(page).click();
		await expectSingleOffersFragment(page);
	}
	expect(navigations()).toBe(0);
}

test("repeated clicks on the hero CTA keep a single #ofertas without navigating", async ({
	page,
}) => {
	await page.goto("/");
	await skipWithoutOffers(page);

	await clickHeroCtaThreeTimes(page);
});

test("arriving from the mobile menu and clicking the hero CTA keeps a single #ofertas", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await skipWithoutOffers(page);

	await page.goto("/products");
	await page.getByRole("button", { name: "Abrir menú" }).click();
	await page.getByRole("link", { name: "Ofertas" }).click();
	await expect(page).toHaveURL(/\/#ofertas$/);
	await expectSingleOffersFragment(page);

	await clickHeroCtaThreeTimes(page);

	await page.getByRole("link", { name: "coco" }).first().click();
	await expect(page).toHaveURL(/\/$/);
});
