import { expect, type Page, test } from "@playwright/test";

async function cartQuantities(page: Page) {
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

test("a catalog card adds its minimum and then edits the quantity in the order", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const add = page
		.getByRole("button", { name: /^Sumar .+ a tu pedido$/ })
		.first();
	test.skip(
		(await add.count()) === 0,
		"The current fixture has no catalog products.",
	);
	// The buttons stay disabled until the cart store hydrates.
	await expect(add).toBeEnabled();
	const name = ((await add.getAttribute("aria-label")) ?? "")
		.replace(/^Sumar /, "")
		.replace(/ a tu pedido$/, "");
	const card = page.locator("main [data-slot='card']").filter({
		has: page.getByRole("heading", { name, exact: true }),
	});

	// One line: the step price and the step it buys share a paragraph and a row.
	const price = card
		.locator("p")
		.filter({ hasText: /\$\s?[\d.,]+ por \S/ })
		.first();
	await expect(price).toHaveText(/^\S*\$\s?[\d.,]+ por \S/);
	const [amountBox, unitBox] = await Promise.all([
		price.locator("span").nth(0).boundingBox(),
		price.locator("span").nth(1).boundingBox(),
	]);
	expect(amountBox && unitBox).toBeTruthy();
	if (amountBox && unitBox) {
		expect(unitBox.y).toBeLessThan(amountBox.y + amountBox.height);
		expect(unitBox.x).toBeGreaterThan(amountBox.x);
	}
	await expect(card.getByText(/\bMOQ\b/)).toHaveCount(0);
	// No stepper until the product is in the order.
	await expect(card.getByRole("textbox")).toHaveCount(0);

	await add.click();
	await closeMiniCart(page);
	const quantity = card.getByRole("textbox", { name: /^Cantidad \(.+\)$/ });
	const minimum = await quantity.inputValue();
	// The input shows es-AR decimals ("1,5"); the cart stores "1.5".
	expect(await cartQuantities(page)).toEqual([minimum.replace(",", ".")]);

	// The stepper reads the order, so it survives a reload.
	await page.reload();
	await expect(quantity).toHaveValue(minimum);

	const more = card.getByRole("button", { name: /^Sumar .+ más de / });
	await expect(more).toBeVisible();
	if (await more.isEnabled()) {
		await more.click();
		await expect(quantity).not.toHaveValue(minimum);
		const raised = await quantity.inputValue();
		expect(await cartQuantities(page)).toEqual([raised.replace(",", ".")]);
		// Adding was the button's job; editing does not reopen the order.
		await expect(page.getByRole("dialog")).toHaveCount(0);
	}
});

test("only a weighed product names its unit inside the quantity field", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const adds = page.getByRole("button", { name: /^Sumar .+ a tu pedido$/ });
	test.skip(
		(await adds.count()) === 0,
		"The current fixture has no catalog products.",
	);
	await expect(adds.first()).toBeEnabled();
	// The field shows up once the product is in the order.
	for (let added = 0; added < 6 && (await adds.count()) > 0; added += 1) {
		await adds.first().click();
		await closeMiniCart(page);
	}

	const fields = page
		.locator("main [data-slot='card']")
		.getByRole("textbox", { name: /^Cantidad \(.+\)$/ });
	await expect(fields.first()).toBeVisible();
	for (const field of await fields.all()) {
		const name = (await field.getAttribute("aria-label")) ?? "";
		// The field sits in a <label>; its text is the visible unit, if any.
		const unit = ((await field.locator("xpath=..").textContent()) ?? "").trim();
		if (/^Cantidad \((kg|gr|lb)\)$/.test(name)) {
			expect(unit, name).not.toBe("");
		} else {
			expect(unit, name).toBe("");
		}
	}
});

test("a catalog card's image and name open the product detail", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);

	const card = page.locator("main [data-slot='card']").first();
	test.skip((await card.count()) === 0, "The current fixture has no products.");
	const name = (await card.getByRole("heading").textContent()) ?? "";

	const image = card.getByRole("button", { name: `Ver ${name}`, exact: true });
	const imageBox = await image.boundingBox();
	expect(imageBox).toBeTruthy();
	if (imageBox) {
		expect(Math.abs(imageBox.width - imageBox.height)).toBeLessThan(2);
	}

	await image.click();
	await expect(page).toHaveURL(/[?&]product=\d+/);
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.getByRole("button", { name: "Cerrar" }).last().click();
	await expect(page).not.toHaveURL(/[?&]product=/);

	await card.getByRole("button", { name, exact: true }).click();
	await expect(page).toHaveURL(/[?&]product=\d+/);
	await expect(page.getByRole("dialog")).toBeVisible();
});

test("the product detail has a single close control and no filler texts", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);

	const card = page.locator("main [data-slot='card']").first();
	test.skip((await card.count()) === 0, "The current fixture has no products.");
	const name = (await card.getByRole("heading").textContent()) ?? "";

	await card.getByRole("button", { name, exact: true }).click();
	const dialog = page.getByRole("dialog");
	// The title reads "Detalle de producto" until the detail query resolves; the
	// absence checks below only mean something once the body has rendered.
	await expect(dialog.getByRole("heading", { name, exact: true })).toBeVisible({
		timeout: 15_000,
	});
	await expect(dialog.locator("[data-slot='skeleton']")).toHaveCount(0);
	await expect(dialog.getByText("Sin galería adicional")).toHaveCount(0);
	await expect(
		dialog.getByText(
			"Producto disponible para pedidos mayoristas compartidos.",
		),
	).toHaveCount(0);
	// The visible subtitle is the weekly closing the product joins.
	await expect(
		dialog.locator("[data-slot='dialog-description']"),
	).toBeVisible();
	await expect(dialog.locator("[data-slot='dialog-description']")).toHaveText(
		/^Entra en el cierre del \S+ \d{2}\/\d{2} a las? .+ · Llega en /,
	);
	await expect(dialog.getByRole("button", { name: "Cerrar" })).toHaveCount(1);

	await dialog.getByRole("button", { name: "Cerrar" }).click();
	await expect(page).not.toHaveURL(/[?&]product=/);
});

test("on a phone the product description sits under the title, above the photo, and stays out of the order", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const titles = page.locator("main [data-slot='card'] h2");
	const names = await titles.allTextContents();
	test.skip(names.length === 0, "The current fixture has no products.");

	const dialog = page.getByRole("dialog");
	let description: string | null = null;
	for (const name of names) {
		await titles.getByRole("button", { name, exact: true }).click();
		await expect(
			dialog.getByRole("heading", { name, exact: true }),
		).toBeVisible({ timeout: 15_000 });
		await expect(dialog.locator("[data-slot='skeleton']")).toHaveCount(0);
		const shown = dialog.getByTestId("product-detail-description");
		if ((await shown.count()) > 0) {
			description = await shown.textContent();
			break;
		}
		await dialog.getByRole("button", { name: "Cerrar" }).click();
		await expect(dialog).toHaveCount(0);
	}
	test.skip(
		!description,
		"No product in the fixture has a description other than its name.",
	);

	const header = dialog.locator("[data-slot='dialog-header']");
	const shown = header.getByTestId("product-detail-description");
	await expect(shown).toBeVisible();
	const titleBox = await header.getByRole("heading").boundingBox();
	const descriptionBox = await shown.boundingBox();
	const bodyBox = await dialog
		.locator("[data-slot='dialog-header'] + div")
		.boundingBox();
	expect(titleBox && descriptionBox && bodyBox).toBeTruthy();
	if (titleBox && descriptionBox && bodyBox) {
		expect(descriptionBox.y).toBeGreaterThan(titleBox.y);
		expect(descriptionBox.y + descriptionBox.height).toBeLessThanOrEqual(
			bodyBox.y + 1,
		);
	}

	await dialog
		.getByRole("button", { name: "Sumar al pedido", exact: true })
		.click();
	const miniCart = page.getByRole("dialog", { name: "Tu pedido" });
	await expect(
		miniCart.getByRole("button", { name: /^Quitar / }),
	).not.toHaveCount(0);
	await expect(miniCart).not.toContainText(description ?? "");
	await page.goto("/cart");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	await expect(page.getByRole("button", { name: /^Quitar / })).not.toHaveCount(
		0,
	);
	await expect(page.locator("main")).not.toContainText(description ?? "");
});

test("large product photos carry the illustrative legend, placeholders and thumbnails do not", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);

	const cards = page.locator("main [data-slot='card']");
	const photoCard = cards
		.filter({ has: page.locator("button[aria-label^='Ver '] [role='img']") })
		.first();
	test.skip(
		(await photoCard.count()) === 0,
		"The current fixture has no catalog product with a photo.",
	);
	const name = (await photoCard.getByRole("heading").textContent()) ?? "";
	const image = photoCard.getByRole("button", {
		name: `Ver ${name}`,
		exact: true,
	});
	await expect(
		image.getByText("Imagen ilustrativa", { exact: true }),
	).toBeVisible();
	// The legend is decorative: the photo is still named after the product.
	await expect(image.getByRole("img", { name, exact: true })).toBeVisible();

	const placeholderCard = cards
		.filter({ has: page.getByText(/^Sin imagen para /) })
		.first();
	if ((await placeholderCard.count()) > 0) {
		await expect(placeholderCard.getByText("Imagen ilustrativa")).toHaveCount(
			0,
		);
	}

	await image.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByRole("heading", { name, exact: true })).toBeVisible({
		timeout: 15_000,
	});
	// Only the main photo: the gallery thumbnails stay bare.
	await expect(
		dialog.getByText("Imagen ilustrativa", { exact: true }),
	).toHaveCount(1);
});
