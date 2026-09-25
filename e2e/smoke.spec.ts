import { expect, test } from "@playwright/test";

test("home communicates the purchase flow and exposes its public sections", async ({
	page,
}) => {
	const response = await page.goto("/");

	expect(response?.ok()).toBe(true);
	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "coco",
		}),
	).toBeVisible();
	await expect(page.locator("#como-funciona")).toBeVisible();
	await expect(page.locator("#ofertas")).toBeVisible();
	await expect(page.locator("#preguntas-frecuentes")).toBeVisible();
	await expect(page.locator("footer#contacto")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Ver qué se puede comprar" }),
	).toHaveAttribute(
		"href",
		(await page.locator("#ofertas h3").count()) > 0 ? "#ofertas" : "/products",
	);
	await expect(
		page.locator("#preguntas-frecuentes").getByRole("button"),
	).toHaveCount(7);
});

test("a home offer opens and closes its URL-addressable product detail", async ({
	page,
}) => {
	await page.goto("/");

	const productLink = page
		.locator(
			"main h2 a[href^='/products?product='], main h3 a[href^='/products?product=']",
		)
		.first();
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
	await expect(
		page
			.getByRole("dialog")
			.getByRole("link", { name: "Catálogo", exact: true }),
	).toHaveAttribute("href", "/products");
	await expect(
		page
			.getByRole("dialog")
			.getByRole("link", { name: "Preguntas frecuentes" }),
	).toHaveAttribute("href", "/#preguntas-frecuentes");
});

test("adding a home offer opens the mini-cart without duplicating its quantity", async ({
	page,
}) => {
	await page.goto("/");
	const add = page
		.getByRole("button", { name: "Sumar al pedido", exact: true })
		.first();
	test.skip(
		(await add.count()) === 0,
		"The current fixture has no active home offers.",
	);
	await add.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	const before = await page.evaluate(
		() => JSON.parse(localStorage.getItem("coco.cart.v1") ?? "{}").state.items,
	);
	await page
		.getByRole("button", { name: "Cerrar", exact: true })
		.last()
		.click();
	const view = page
		.getByRole("button", { name: "Ver en tu pedido", exact: true })
		.first();
	await expect(view).toBeVisible();
	await page.reload();
	await expect(view).toBeVisible();
	await view.click();
	await expect(dialog).toBeVisible();
	const after = await page.evaluate(
		() => JSON.parse(localStorage.getItem("coco.cart.v1") ?? "{}").state.items,
	);
	expect(after).toEqual(before);
});

test("navbar search navigates to the catalog query and yields to its search", async ({
	page,
}) => {
	await page.goto("/");
	const search = page.getByRole("searchbox", { name: "Buscar productos" });
	await search.fill("yerba");
	await search.press("Enter");
	await expect(page).toHaveURL(/\/products\?q=yerba$/);
	await expect(page.locator("header search")).toHaveCount(0);
});

test("empty navbar search navigates without an empty query parameter", async ({
	page,
}) => {
	await page.goto("/");
	const search = page.getByRole("searchbox", { name: "Buscar productos" });
	await search.fill("  ");
	await search.press("Enter");
	await expect(page).toHaveURL(/\/products$/);
});

test("the admin area redirects anonymous visitors to the login page", async ({
	page,
}) => {
	await page.goto("/admin");

	await expect(page).toHaveURL(/\/login$/);
});

test.describe("legacy admin URLs redirect to the flat routes", () => {
	const redirects: Array<[from: string, to: string]> = [
		["/admin/crud-home", "/admin"],
		["/admin/crud-home/products", "/admin/products"],
		["/admin/operations/user-carts", "/admin/carts"],
		["/admin/operations/user-carts/42", "/admin/carts/42"],
		["/admin/operations/operations", "/admin/operations"],
		["/admin/operations/lots", "/admin/lots"],
		["/admin/operations/tracking?lotId=7", "/admin/tracking?lotId=7"],
	];

	for (const [from, to] of redirects) {
		test(`${from} -> ${to}`, async ({ page }) => {
			// Asserted on the raw 307 so the auth gate does not mask the rewrite.
			const response = await page.request.get(from, { maxRedirects: 0 });

			expect(response.status()).toBe(307);
			expect(response.headers().location).toBe(to);
		});
	}
});
