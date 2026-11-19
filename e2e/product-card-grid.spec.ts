import { expect, type Locator, type Page, test } from "@playwright/test";

const gridCards = "main [data-slot='product-card-grid'] > [data-slot='card']";

async function openCatalog(page: Page, path = "/products") {
	await page.goto(path);
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
}

async function storedQuantities(page: Page) {
	return page.evaluate(() =>
		Object.values(
			JSON.parse(localStorage.getItem("coco.cart.v1") ?? "{}").state?.items ??
				{},
		).map((item) => (item as { quantity: string }).quantity),
	);
}

async function closeMiniCart(page: Page) {
	await expect(page.getByRole("dialog", { name: "Tu pedido" })).toBeVisible();
	await page
		.getByRole("button", { name: "Cerrar", exact: true })
		.last()
		.click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
}

for (const viewport of [
	{ width: 360, height: 780 },
	{ width: 390, height: 844 },
]) {
	test(`at ${viewport.width} × ${viewport.height} the catalog shows two columns and four whole cards`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		await openCatalog(page);
		const cards = page.locator(gridCards);
		test.skip(
			(await cards.count()) < 4,
			"The current fixture has fewer than four catalog products.",
		);

		// The grid starts right under the sticky navbar, as after the first scroll.
		const navbarBottom = await page.evaluate(() => {
			const navbar = document.querySelector("header");
			const grid = document.querySelector("[data-slot='product-card-grid']");
			const bottom = navbar?.getBoundingClientRect().bottom ?? 0;
			if (grid) {
				// The page scrolls smoothly; the measure needs the final position.
				window.scrollBy({
					top: grid.getBoundingClientRect().top - bottom,
					behavior: "instant",
				});
			}
			return bottom;
		});
		const boxes = await cards.evaluateAll((elements) =>
			elements.slice(0, 4).map((element) => {
				const rect = element.getBoundingClientRect();
				return { left: rect.left, top: rect.top, bottom: rect.bottom };
			}),
		);
		const [first, second, third, fourth] = boxes;
		if (!first || !second || !third || !fourth) throw new Error("no cards");

		expect(Math.abs(second.top - first.top)).toBeLessThan(1);
		expect(second.left).toBeGreaterThan(first.left);
		expect(Math.abs(third.left - first.left)).toBeLessThan(1);
		expect(third.top).toBeGreaterThan(first.bottom - 1);
		for (const box of boxes) {
			expect(box.top).toBeGreaterThanOrEqual(navbarBottom - 1);
			expect(box.bottom).toBeLessThanOrEqual(viewport.height);
		}
	});
}

test("on a phone, Sumar adds the minimum and the card edits it down to the trash can", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 780 });
	await openCatalog(page);
	const add = page
		.getByRole("button", { name: /^Sumar .+ a tu pedido$/ })
		.first();
	test.skip(
		(await add.count()) === 0,
		"The current fixture has no catalog products.",
	);
	// Disabled until the cart store hydrates.
	await expect(add).toBeEnabled();
	const name = ((await add.getAttribute("aria-label")) ?? "")
		.replace(/^Sumar /, "")
		.replace(/ a tu pedido$/, "");
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const card = page.locator(gridCards).filter({
		has: page.getByRole("heading", { name, exact: true }),
	});
	await expect(add).toHaveText("Sumar");
	await expect(card.getByRole("textbox")).toHaveCount(0);

	await add.click();
	await closeMiniCart(page);
	const quantity = card.getByRole("textbox", { name: /^Cantidad \(.+\)$/ });
	await expect(quantity).toBeVisible();
	const minimum = await quantity.inputValue();
	// The input shows es-AR decimals ("1,5"); the cart stores "1.5".
	expect(await storedQuantities(page)).toEqual([minimum.replace(",", ".")]);
	await expect(card.getByText(/^Tenés .+ en tu pedido$/)).toHaveClass(
		/\bsr-only\b/,
	);
	await expect(card.getByText("Ver en tu pedido")).toHaveCount(0);
	await expect(card.getByText(/^Ya tenés/)).toHaveCount(0);

	const trash = card.getByRole("button", {
		name: `Quitar ${name} de tu pedido`,
		exact: true,
	});
	const more = card.getByRole("button", {
		name: new RegExp(`^Sumar .+ más de ${escaped}$`),
	});
	await expect(trash).toBeEnabled();
	if (await more.isEnabled()) {
		await more.click();
		await expect(quantity).not.toHaveValue(minimum);
		const raised = await quantity.inputValue();
		expect(await storedQuantities(page)).toEqual([raised.replace(",", ".")]);
		await expect(trash).toHaveCount(0);
		await card
			.getByRole("button", {
				name: new RegExp(`^Restar .+ de ${escaped}$`),
			})
			.click();
		await expect(quantity).toHaveValue(minimum);
	}

	await trash.click();
	await expect(quantity).toHaveCount(0);
	await expect(add).toBeFocused();
	await expect(
		card.getByText(`Quitaste ${name} de tu pedido`, { exact: true }),
	).toHaveClass(/\bsr-only\b/);
	expect(await storedQuantities(page)).toEqual([]);
});

/** Where the cards of a single-row grid sit inside it, and how many columns fit. */
function rowLayout(grid: Locator) {
	return grid.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const cards = Array.from(element.children).map((card) =>
			card.getBoundingClientRect(),
		);
		return {
			// Collapsed auto-fit tracks still count here, as "0px".
			columns: getComputedStyle(element)
				.gridTemplateColumns.split(" ")
				.filter(Boolean).length,
			rows: new Set(cards.map((card) => Math.round(card.top))).size,
			leftGap: Math.min(...cards.map((card) => card.left)) - box.left,
			rightGap: box.right - Math.max(...cards.map((card) => card.right)),
		};
	});
}

for (const width of [1366, 1920, 2560]) {
	test(`at ${width}px a catalog row with fewer cards than columns sits centered`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 1000 });
		await openCatalog(page);
		const adds = page.getByRole("button", { name: /^Sumar .+ a tu pedido$/ });
		test.skip(
			(await adds.count()) < 2,
			"The current fixture has fewer than two catalog products.",
		);
		await expect(adds.first()).toBeEnabled();
		for (let added = 0; added < 2; added += 1) {
			await adds.first().click();
			await closeMiniCart(page);
		}

		// "Solo en mi pedido" leaves the two products just added.
		await openCatalog(page, "/products?inCart=1");
		await expect(page.locator(gridCards)).toHaveCount(2);
		const layout = await rowLayout(
			page.locator("main [data-slot='product-card-grid']"),
		);
		expect(layout.columns).toBeGreaterThan(2);
		expect(layout.leftGap).toBeGreaterThan(1);
		expect(Math.abs(layout.leftGap - layout.rightGap)).toBeLessThan(1);
	});

	test(`at ${width}px the featured row sits centered when it does not fill the columns`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto("/");
		const grid = page.locator("#ofertas [data-slot='product-card-grid']");
		test.skip(
			(await grid.count()) === 0,
			"The current fixture has no featured items.",
		);
		const layout = await rowLayout(grid);
		const items = await grid.locator(":scope > *").count();
		test.skip(
			layout.rows > 1 || items >= layout.columns,
			"The featured items fill the row.",
		);
		expect(layout.leftGap).toBeGreaterThan(1);
		expect(Math.abs(layout.leftGap - layout.rightGap)).toBeLessThan(1);
	});
}
