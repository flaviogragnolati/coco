import { expect, type Page, test } from "@playwright/test";

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

test("repeated clicks on the hero CTA keep a single #ofertas", async ({
	page,
}) => {
	await page.goto("/");
	await skipWithoutOffers(page);

	for (let click = 0; click < 3; click++) {
		await heroCta(page).click();
		await expectSingleOffersFragment(page);
	}
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

	for (let click = 0; click < 3; click++) {
		await heroCta(page).click();
		await expectSingleOffersFragment(page);
	}

	await page.getByRole("link", { name: "coco" }).first().click();
	await expect(page).toHaveURL(/\/$/);
});
