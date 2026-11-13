import { expect, type Page, test } from "@playwright/test";

// Smooth scrolling lets `toBeInViewport` pass mid-scroll and the next click
// land on whatever is passing under the pointer.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const footerHowItWorks = (page: Page) =>
	page.locator("footer").getByRole("link", { name: "Cómo funciona" });

async function expectSingleHowItWorksFragment(page: Page) {
	const { hash, href } = new URL(page.url());
	expect(hash).toBe("#como-funciona");
	expect(href.split("#como-funciona")).toHaveLength(2);
	await expect(page.locator("#como-funciona")).toBeInViewport();
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

async function clickFooterHowItWorksThreeTimes(page: Page) {
	const navigations = countNavigationRequests(page);
	for (let click = 0; click < 3; click++) {
		await footerHowItWorks(page).click();
		await expectSingleHowItWorksFragment(page);
	}
	expect(navigations()).toBe(0);
}

test("the hero CTA goes straight to the catalog", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("link", { name: "Ver el catálogo" }),
	).toHaveAttribute("href", "/products");
});

test("repeated clicks on a section link keep a single #como-funciona without navigating", async ({
	page,
}) => {
	await page.goto("/");

	await clickFooterHowItWorksThreeTimes(page);
});

test("arriving from the mobile menu and clicking a section link keeps a single fragment", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });

	await page.goto("/products");
	const offersLink = page.getByRole("link", { name: "Ofertas" });
	// Retried so a click that lands before hydration does not fail the test.
	await expect(async () => {
		await page.getByRole("button", { name: "Abrir menú" }).click();
		await expect(offersLink).toBeVisible({ timeout: 1_000 });
	}).toPass();
	await offersLink.click();
	await expect(page).toHaveURL(/\/#ofertas$/);

	await clickFooterHowItWorksThreeTimes(page);

	await page.getByRole("link", { name: "coco" }).first().click();
	await expect(page).toHaveURL(/\/$/);
});
