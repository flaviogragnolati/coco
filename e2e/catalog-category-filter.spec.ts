import { expect, type Page, test } from "@playwright/test";

const productCount = /^\d+ productos?$/;

/** The counter reads "0 productos" while the catalog query is still loading. */
async function loadedCounter(page: Page) {
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const counter = page.getByText(productCount);
	await expect(counter).toBeVisible();
	return counter;
}

function countOf(text: string | null) {
	return Number.parseInt(text ?? "", 10);
}

test("a category chip filters the catalog and Todos clears it", async ({
	page,
}) => {
	await page.goto("/products");
	const counter = await loadedCounter(page);
	const chips = page.getByRole("group", { name: "Filtrar por categoría" });
	test.skip(
		(await chips.count()) === 0,
		"The current fixture has fewer than two categories with products.",
	);
	const all = chips.getByRole("radio", { name: "Todos", exact: true });
	await expect(all).toHaveAttribute("aria-checked", "true");
	const totalText = (await counter.textContent()) ?? "";

	const category = chips.getByRole("radio").nth(1);
	// Retried so a click that lands before hydration does not fail the test.
	await expect(async () => {
		await category.click();
		await expect(category).toHaveAttribute("aria-checked", "true", {
			timeout: 1_000,
		});
	}).toPass();
	await expect(page).toHaveURL(/[?&]categoria=\d+/);
	await expect(counter).not.toHaveText(totalText);
	const filtered = countOf(await counter.textContent());
	expect(filtered).toBeGreaterThan(0);
	expect(filtered).toBeLessThan(countOf(totalText));

	await all.click();
	await expect(all).toHaveAttribute("aria-checked", "true");
	await expect(page).not.toHaveURL(/[?&]categoria=/);
	await expect(counter).toHaveText(totalText);
});

test("an unknown category in the URL shows the whole catalog", async ({
	page,
}) => {
	await page.goto("/products");
	const totalText = await (await loadedCounter(page)).textContent();

	await page.goto("/products?categoria=999999999");
	await expect(await loadedCounter(page)).toHaveText(totalText ?? "");
	const chips = page.getByRole("group", { name: "Filtrar por categoría" });
	if ((await chips.count()) > 0) {
		await expect(
			chips.getByRole("radio", { name: "Todos", exact: true }),
		).toHaveAttribute("aria-checked", "true");
	}
});
