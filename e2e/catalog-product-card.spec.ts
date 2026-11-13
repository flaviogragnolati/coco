import { expect, type Page, test } from "@playwright/test";

async function cartQuantities(page: Page) {
	return page.evaluate(() =>
		Object.values(
			JSON.parse(localStorage.getItem("coco.cart.v1") ?? "{}").state?.items ??
				{},
		).map((item) => (item as { quantity: string }).quantity),
	);
}

test("a catalog card adds the quantity chosen on its stepper", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const anyAdd = page
		.getByRole("button", { name: "Sumar al pedido", exact: true })
		.first();
	test.skip(
		(await anyAdd.count()) === 0,
		"The current fixture has no catalog products.",
	);
	// The steppers stay disabled until the cart store hydrates.
	await expect(anyAdd).toBeEnabled();

	const cards = page.locator("main [data-slot='card']");
	const steppable = cards
		.filter({
			has: page.getByRole("button", {
				name: "Aumentar cantidad",
				disabled: false,
			}),
		})
		.first();
	test.skip(
		(await steppable.count()) === 0,
		"The current fixture has no catalog product with room above its minimum.",
	);
	// The stepper leaves the card once the product is in the order, so pin the
	// card by its product name instead of by the stepper.
	const name = (await steppable.getByRole("heading").textContent()) ?? "";
	const card = cards.filter({
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

	// The total is for screen readers only; it shows in the order once added.
	const total = card.getByText(/^Total /);
	await expect(total).toHaveClass(/\bsr-only\b/);

	const quantity = card.getByRole("textbox", { name: /^Cantidad \(.+\)$/ });
	const minimum = await quantity.inputValue();
	const minimumTotal = (await total.textContent()) ?? "";
	const add = card.getByRole("button", {
		name: "Sumar al pedido",
		exact: true,
	});

	await card.getByRole("button", { name: "Aumentar cantidad" }).click();
	await expect(quantity).not.toHaveValue(minimum);
	await expect(total).not.toHaveText(minimumTotal);
	const chosen = await quantity.inputValue();

	await expect(add).toBeEnabled();
	await add.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	// The input shows es-AR decimals ("1,5"); the cart stores "1.5".
	expect(await cartQuantities(page)).toEqual([chosen.replace(",", ".")]);

	await page
		.getByRole("button", { name: "Cerrar", exact: true })
		.last()
		.click();
	await expect(card.getByText(/^Ya tenés .+ en tu pedido$/)).toBeVisible();
	await expect(quantity).toHaveCount(0);
	const view = card.getByRole("button", {
		name: "Ver en tu pedido",
		exact: true,
	});
	await expect(view).toBeVisible();
	await view.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	expect(await cartQuantities(page)).toEqual([chosen.replace(",", ".")]);
});

test("only a weighed product names its unit inside the quantity field", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const fields = page
		.locator("main [data-slot='card']")
		.getByRole("textbox", { name: /^Cantidad \(.+\)$/ });
	test.skip(
		(await fields.count()) === 0,
		"The current fixture has no catalog product with a stepper.",
	);

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
	// The generic subtitle gave way to the weekly closing the product joins.
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
