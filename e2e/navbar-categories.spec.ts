import { expect, test } from "@playwright/test";

test("categories and weekly closing fit the navbar at 1024 px", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 1024, height: 768 });
	await page.goto("/");
	const header = page.getByRole("banner");
	await expect(
		header.getByRole("button", { name: "Categorías", exact: true }),
	).toBeVisible();
	await expect(header.getByText(/^Cierre del pedido: falta/)).toBeVisible();
	const dimensions = await header.locator("nav").evaluate((nav) => ({
		width: nav.clientWidth,
		scrollWidth: nav.scrollWidth,
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
	await page.screenshot({ path: testInfo.outputPath("navbar-1024.png") });
});

test("desktop category menu opens the catalog filtered by that category", async ({
	page,
}) => {
	await page.goto("/");
	const trigger = page.getByRole("button", { name: "Categorías", exact: true });
	await expect(async () => {
		await trigger.click();
		await expect(page.getByRole("menu")).toBeVisible({ timeout: 1_000 });
	}).toPass();
	const category = page.getByRole("menuitem").first();
	const name = (await category.textContent())?.trim() ?? "";
	const href = await category.getAttribute("href");
	expect(href).toMatch(/^\/products\?categoria=\d+$/);
	await category.click();

	await expect(page).toHaveURL(new RegExp(`${href?.replace("?", "\\?")}$`));
	await expect(page.getByRole("radio", { name, exact: true })).toHaveAttribute(
		"aria-checked",
		"true",
	);
});

test("mobile categories navigate and close the menu", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await expect(async () => {
		await page.getByRole("button", { name: "Abrir menú" }).click();
		await expect(
			page.getByRole("dialog", { name: "Explorá CoCo" }),
		).toBeVisible({ timeout: 1_000 });
	}).toPass();
	const categories = page.getByRole("region", { name: "Categorías" });
	const category = categories.getByRole("link").first();
	const name = (await category.textContent())?.trim() ?? "";
	const href = await category.getAttribute("href");
	expect(href).toMatch(/^\/products\?categoria=\d+$/);
	await category.click();

	await expect(page).toHaveURL(new RegExp(`${href?.replace("?", "\\?")}$`));
	await expect(page.getByRole("dialog", { name: "Explorá CoCo" })).toHaveCount(
		0,
	);
	await expect(page.getByRole("radio", { name, exact: true })).toHaveAttribute(
		"aria-checked",
		"true",
	);
});
