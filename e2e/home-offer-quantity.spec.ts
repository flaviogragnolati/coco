import { expect, type Page, test } from "@playwright/test";

async function storedQuantities(page: Page) {
	return page.evaluate(() =>
		Object.values(
			JSON.parse(localStorage.getItem("coco.cart.v1") ?? "{}").state?.items ??
				{},
		).map((item) => (item as { quantity: string }).quantity),
	);
}

test("a home offer card adds its minimum and edits it from the card", async ({
	page,
}) => {
	await page.goto("/");
	const add = page
		.locator("#ofertas")
		.getByRole("button", { name: /^Sumar .+ a tu pedido$/ })
		.first();
	test.skip(
		(await add.count()) === 0,
		"The current fixture has no active home offers.",
	);
	await expect(add).toBeEnabled();
	await expect(add).toHaveText("Sumar");
	const name = ((await add.getAttribute("aria-label")) ?? "")
		.replace(/^Sumar /, "")
		.replace(/ a tu pedido$/, "");
	const card = page.locator("#ofertas [data-slot='card']").filter({
		has: page.getByRole("heading", { name, exact: true }),
	});
	await expect(card.getByRole("textbox")).toHaveCount(0);

	await add.click();
	await expect(page.getByRole("dialog", { name: "Tu pedido" })).toBeVisible();
	await page
		.getByRole("button", { name: "Cerrar", exact: true })
		.last()
		.click();

	const quantity = card.getByRole("textbox", { name: /^Cantidad \(.+\)$/ });
	const minimum = await quantity.inputValue();
	// The input shows es-AR decimals ("1,5"); the cart stores "1.5".
	expect(await storedQuantities(page)).toEqual([minimum.replace(",", ".")]);
	await expect(
		card.getByRole("button", { name: "Ver en tu pedido", exact: true }),
	).toHaveCount(0);

	const more = card.getByRole("button", { name: /^Sumar .+ más de / });
	if (await more.isEnabled()) {
		await more.click();
		await expect(quantity).not.toHaveValue(minimum);
		await card.getByRole("button", { name: /^Restar .+ de / }).click();
		await expect(quantity).toHaveValue(minimum);
	}

	await card
		.getByRole("button", { name: `Quitar ${name} de tu pedido`, exact: true })
		.click();
	await expect(quantity).toHaveCount(0);
	await expect(add).toBeVisible();
	expect(await storedQuantities(page)).toEqual([]);
});
