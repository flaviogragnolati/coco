import { expect, test } from "@playwright/test";

test("home communicates the purchase flow and exposes its public sections", async ({
	page,
}) => {
	const response = await page.goto("/");

	expect(response?.ok()).toBe(true);
	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "Comprá al por mayor, sin organizar un grupo.",
		}),
	).toBeVisible();
	await expect(page.locator("#como-funciona")).toBeVisible();
	await expect(page.locator("#ofertas")).toBeVisible();
	await expect(page.locator("#preguntas-frecuentes")).toBeVisible();
	await expect(page.locator("#contacto")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Ver ofertas" }).first(),
	).toHaveAttribute("href", "/products");
	await expect(
		page.locator("#preguntas-frecuentes").getByRole("button"),
	).toHaveCount(6);
});

test("a home offer opens and closes its URL-addressable product detail", async ({
	page,
}) => {
	await page.goto("/");

	const productLink = page.getByRole("link", { name: "Ver producto" }).first();
	test.skip(
		(await productLink.count()) === 0,
		"The current fixture has no active home offers.",
	);

	const href = await productLink.getAttribute("href");
	expect(href).toMatch(/^\/products\?product=\d+$/);
	await productLink.click();

	await expect(page).toHaveURL(/\/products\?.*product=\d+/);
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.getByRole("button", { name: "Cerrar" }).last().click();
	await expect(page).not.toHaveURL(/[?&]product=/);
});

test("mobile navigation keeps purchase and public anchors accessible", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto("/");

	await page.getByRole("button", { name: "Abrir menú" }).click();
	await expect(
		page.getByRole("heading", { name: "Explorá Coco" }),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Comprar" })).toHaveAttribute(
		"href",
		"/products",
	);
	await expect(
		page.getByRole("link", { name: "Preguntas frecuentes" }),
	).toHaveAttribute("href", "/#preguntas-frecuentes");
});
