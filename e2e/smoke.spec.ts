import { expect, test } from "@playwright/test";

test("home communicates the purchase flow and exposes its public sections", async ({
	page,
}) => {
	const response = await page.goto("/");

	expect(response?.ok()).toBe(true);
	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "Comprar en grupo sale menos.",
		}),
	).toBeVisible();
	await expect(page.locator("#como-funciona")).toBeVisible();
	await expect(page.locator("#como-funciona ol > li")).toHaveCount(4);
	await expect(page.locator("#ofertas")).toBeVisible();
	await expect(
		page.locator("#ofertas").getByRole("heading", {
			name: "Destacados de la semana",
		}),
	).toBeVisible();
	await expect(
		page
			.locator("#ofertas")
			.getByRole("group", { name: "Filtrar ofertas por unidad" }),
	).toHaveCount(0);
	await expect(page.locator("#preguntas-frecuentes")).toBeVisible();
	await expect(page.locator("footer#contacto")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Ver el catálogo" }),
	).toHaveAttribute("href", "/products");
	await expect(
		page.getByText("No hace falta registrarte para mirar"),
	).toBeVisible();
	const faqQuestions = page
		.locator("#preguntas-frecuentes")
		.getByRole("button");
	await expect(faqQuestions).toHaveCount(6);
	await expect(faqQuestions.first()).toHaveText("¿Cuándo cierran los pedidos?");
	const priceQuestion = faqQuestions.last();
	await expect(priceQuestion).toHaveText("¿Cómo conseguimos estos precios?");
	await priceQuestion.click();
	await expect(
		page
			.locator("#preguntas-frecuentes")
			.getByText(
				/^Juntamos los pedidos de mucha gente .* aunque los dos sean un litro\.$/,
			),
	).toBeVisible();
	await expect(
		page.getByText(
			"Juntamos pedidos de toda Ushuaia y hacemos una sola compra grande.",
			{ exact: false },
		),
	).toBeVisible();
	await expect(page.locator("meta[name='description']")).toHaveAttribute(
		"content",
		"Compras comunitarias en Ushuaia. Sumate al pedido de otros vecinos y seguí tu compra hasta la entrega.",
	);
});

test("the catalog header speaks of your weekly order, never of wholesale", async ({
	page,
}) => {
	await page.goto("/products");

	const header = page
		.locator("main section")
		.filter({
			has: page.getByRole("heading", {
				level: 1,
				name: "Productos disponibles",
			}),
		})
		.first();
	await expect(
		header.getByText(
			"Elegí lo que necesitás y sumalo a tu pedido de la semana.",
		),
	).toBeVisible();
	await expect(
		header.getByText("Seleccionamos productos de primera calidad."),
	).toBeVisible();
	await expect(header).not.toContainText(/mayorist|al por mayor/i);
	await expect(page.locator("meta[name='description']")).toHaveAttribute(
		"content",
		"Explorá productos y armá tu pedido de la semana.",
	);
});

test("the hero is text only, the illustration explains how it works and the spotlight has its own band", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto("/");

	const hero = page.locator("section").filter({
		has: page.getByRole("heading", {
			level: 1,
			name: "Comprar en grupo sale menos.",
		}),
	});
	await expect(hero.getByRole("img")).toHaveCount(0);
	await expect(hero.locator("a[href^='/products?product=']")).toHaveCount(0);
	await expect(hero.getByRole("button")).toHaveCount(0);
	await expect(hero.getByRole("link")).toHaveCount(1);

	const howItWorks = page.locator("#como-funciona");
	await expect(
		howItWorks.getByRole("img", { name: /CoCo junta los pedidos/ }),
	).toBeVisible();
	await expect(
		howItWorks.getByText(
			"CoCo junta los pedidos de los vecinos, le compra al proveedor y reparte lo que llega.",
		),
	).toBeVisible();

	const band = page.getByRole("region", { name: "Destacado", exact: true });
	test.skip(
		(await band.count()) === 0,
		"The current fixture has no active home offers.",
	);
	test.skip(
		(await band.getByRole("button", { name: "Sumar combo" }).count()) > 0,
		"The band holds a combo; the seed leaves it to the ranking's top product.",
	);

	const spotlightHref = await band
		.locator("h2 a[href^='/products?product=']")
		.getAttribute("href");
	expect(spotlightHref).toMatch(/^\/products\?product=\d+$/);
	await expect(
		band.getByRole("button", { name: "Sumar al pedido", exact: true }),
	).toBeVisible();
	// The card keeps to about 400px so the band does not grow with the photo.
	const cardBox = await band.locator("[data-slot='card']").boundingBox();
	expect(cardBox?.width).toBeLessThanOrEqual(401);
	// A combo card may list the same product; only a product card would repeat it.
	await expect(
		page.locator(`#ofertas h3 a[href='${spotlightHref}']`),
	).toHaveCount(0);
});

test("the weekly closing countdown sits in the navbar on desktop and in the strip below lg", async ({
	page,
}) => {
	await page.goto("/");

	// The strip renders before the navbar, so the first match is the strip's.
	const countdown = /^Cierre del pedido: falta/;
	const stripCountdown = page.getByText(countdown).first();
	const navbarCountdown = page.getByRole("banner").getByText(countdown);
	const stripMessage = page.getByText("Compras comunitarias en Ushuaia", {
		exact: true,
	});

	await expect(navbarCountdown).toBeVisible();
	await expect(stripCountdown).toBeHidden();
	await expect(stripMessage).toBeVisible();

	await page.setViewportSize({ width: 390, height: 844 });
	await expect(stripCountdown).toBeVisible();
	await expect(navbarCountdown).toBeHidden();
	await expect(stripMessage).toBeHidden();
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
		page.getByRole("heading", { name: "Explorá CoCo" }),
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
