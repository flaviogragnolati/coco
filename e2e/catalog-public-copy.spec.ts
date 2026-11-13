import { expect, test } from "@playwright/test";

const internalCopy =
	/\bMOQ\b|por bloque|Marca disponible próximamente|Presentación del proveedor|\bARS\b/;
const marketComparison = /Ahorrás|vs\. góndola/;

test("home and catalog omit internal terms and market savings comparisons", async ({
	page,
}) => {
	for (const path of ["/", "/products"]) {
		await page.goto(path);
		const main = page.locator("main");
		await expect(main.locator("[data-slot='skeleton']")).toHaveCount(0);
		await expect(main.getByRole("heading").first()).toBeVisible();
		if (path === "/products") {
			await expect(main.locator("[data-slot='card']").first()).toBeVisible();
		}
		const copy = await main.innerText();
		expect(copy).not.toMatch(internalCopy);
		expect(copy).not.toMatch(marketComparison);
	}
});

test("every product detail omits internal terms and market savings comparisons", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const names = await page
		.locator("main [data-slot='card'] h2")
		.allTextContents();
	expect(names.length).toBeGreaterThan(0);
	for (const name of names) {
		await page
			.locator("main [data-slot='card'] h2")
			.getByRole("button", { name, exact: true })
			.click();
		const dialog = page.getByRole("dialog");
		await expect(
			dialog.getByRole("heading", { name, exact: true }),
		).toBeVisible();
		await expect(dialog.locator("[data-slot='skeleton']")).toHaveCount(0);
		const copy = await dialog.innerText();
		expect(copy).not.toMatch(internalCopy);
		expect(copy).not.toMatch(marketComparison);
		await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
		await expect(dialog).toHaveCount(0);
	}
});
