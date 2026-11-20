import { expect, test } from "@playwright/test";

test("the Cómo funciona page explains the idea, the calendar and each step", async ({
	page,
}) => {
	const response = await page.goto("/como-funciona");

	expect(response?.ok()).toBe(true);
	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "Una compra grande entre todos, paso a paso.",
		}),
	).toBeVisible();
	await expect(
		page.locator("#calendario").getByRole("img", { name: /^Calendario/ }),
	).toBeVisible();
	await expect(page.getByRole("heading", { level: 3 })).toHaveCount(4);
	await expect(
		page.getByRole("link", { name: "Ver el catálogo" }),
	).toHaveAttribute("href", "/products");
	await expect(
		page.getByRole("link", { name: "preguntas frecuentes", exact: true }),
	).toHaveAttribute("href", "/#preguntas-frecuentes");
	// The home section keeps the only #como-funciona.
	await expect(page.locator("#como-funciona")).toHaveCount(0);
});

test("the home footer leads to the Cómo funciona page", async ({ page }) => {
	await page.goto("/");

	const link = page
		.locator("footer")
		.getByRole("link", { name: "Paso a paso de un pedido" });
	await expect(link).toHaveAttribute("href", "/como-funciona");
	await link.click();
	await expect(page).toHaveURL(/\/como-funciona$/);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Una compra grande entre todos, paso a paso.",
	);
});
