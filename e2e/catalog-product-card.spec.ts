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
		.getByRole("button", { name: "Agregar", exact: true })
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

	// One line: the unit price and what it is per share a paragraph and a row.
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

	const quantity = card.getByRole("textbox", { name: /^Cantidad \(.+\)$/ });
	const minimum = await quantity.inputValue();
	const total = card.getByText(/^Total /);
	const minimumTotal = (await total.textContent()) ?? "";

	await card.getByRole("button", { name: "Aumentar cantidad" }).click();
	await expect(quantity).not.toHaveValue(minimum);
	await expect(total).not.toHaveText(minimumTotal);
	const chosen = await quantity.inputValue();

	const add = card.getByRole("button", { name: "Agregar", exact: true });
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

test("a catalog card's image and name open the product detail", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);

	const card = page.locator("main [data-slot='card']").first();
	test.skip((await card.count()) === 0, "The current fixture has no products.");
	const name = (await card.getByRole("heading").textContent()) ?? "";

	await card.getByRole("button", { name: `Ver ${name}`, exact: true }).click();
	await expect(page).toHaveURL(/[?&]product=\d+/);
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.getByRole("button", { name: "Cerrar" }).last().click();
	await expect(page).not.toHaveURL(/[?&]product=/);

	await card.getByRole("button", { name, exact: true }).click();
	await expect(page).toHaveURL(/[?&]product=\d+/);
	await expect(page.getByRole("dialog")).toBeVisible();
});
