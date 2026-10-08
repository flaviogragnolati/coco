import { expect, test } from "@playwright/test";

test("a home offer adds the quantity chosen on its card", async ({ page }) => {
	await page.goto("/");
	const add = page
		.locator("#ofertas")
		.getByRole("button", { name: "Sumar al pedido", exact: true })
		.first();
	test.skip(
		(await add.count()) === 0,
		"The current fixture has no active home offers.",
	);
	await expect(add).toBeEnabled();

	const cards = page.locator("#ofertas [data-slot='card']");
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
		"The current fixture has no home offer with room above its MOQ.",
	);
	// The stepper leaves the card once the product is in the order, so pin the
	// card by its product name instead of by the stepper.
	const name = (await steppable.locator("h3").textContent()) ?? "";
	const card = cards.filter({
		has: page.getByRole("heading", { name, exact: true }),
	});

	const quantity = card.getByRole("textbox", { name: /^Cantidad en / });
	const minimum = await quantity.inputValue();
	await expect(
		card.getByRole("button", { name: "Reducir cantidad" }),
	).toBeDisabled();
	const total = card.getByText(/^Total /);
	const minimumTotal = (await total.textContent()) ?? "";

	await card.getByRole("button", { name: "Aumentar cantidad" }).click();
	await expect(quantity).not.toHaveValue(minimum);
	await expect(total).not.toHaveText(minimumTotal);
	const chosen = await quantity.inputValue();

	await card
		.getByRole("button", { name: "Sumar al pedido", exact: true })
		.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	const quantities = await page.evaluate(() =>
		Object.values(
			JSON.parse(localStorage.getItem("coco.cart.v1") ?? "{}").state.items,
		).map((item) => (item as { quantity: string }).quantity),
	);
	expect(quantities).toEqual([chosen]);

	await page
		.getByRole("button", { name: "Cerrar", exact: true })
		.last()
		.click();
	await expect(card.getByText(/^Ya tenés .+ en tu pedido$/)).toBeVisible();
	await expect(
		card.getByRole("button", { name: "Ver en tu pedido", exact: true }),
	).toBeVisible();
});
