import { expect, type Page, test } from "@playwright/test";

// The seed's "Desayuno (e2e)" group: 1 person (2 products) and 2 people (3).
const COMBO_NAME = "Combo desayuno (e2e)";
const TWO_PEOPLE_QUANTITIES = {
	"Tomate perita fresco": 40,
	"Aceite de oliva extra virgen 5L": 4,
	"Arroz largo fino bolsa 25kg": 10,
};

type StoredItem = { quantity: string; product: { name: string } };

async function storedQuantities(page: Page) {
	const items = await page.evaluate(
		() =>
			JSON.parse(localStorage.getItem("coco.cart.v1") ?? "{}").state?.items ??
			{},
	);
	return Object.fromEntries(
		(Object.values(items) as StoredItem[]).map((item) => [
			item.product.name,
			Number(item.quantity),
		]),
	);
}

test("a guest picks the people on a combo card and adds every product as its own line", async ({
	page,
}) => {
	await page.goto("/");
	const card = page.locator("#ofertas [data-slot='card']").filter({
		has: page.getByRole("heading", { name: COMBO_NAME, exact: true }),
	});
	test.skip(
		(await card.count()) === 0,
		"The fixture has no featured combo (seed it with prisma/seed.ts).",
	);

	const people = card.getByRole("group", { name: "Cantidad de personas" });
	await expect(people.getByRole("radio", { name: "1 persona" })).toBeChecked();
	await expect(card.locator("ul > li")).toHaveCount(2);
	const onePersonTotal = await card
		.getByText("Total hoy")
		.locator("..")
		.textContent();

	await people.getByRole("radio", { name: "2 personas" }).click();
	await expect(people.getByRole("radio", { name: "2 personas" })).toBeChecked();
	await expect(card.locator("ul > li")).toHaveCount(3);
	await expect(card.getByText("Total hoy").locator("..")).not.toHaveText(
		onePersonTotal ?? "",
	);

	const add = card.getByRole("button", { name: "Sumar combo", exact: true });
	await expect(add).toBeEnabled();
	await add.click();
	await expect(page.getByRole("dialog", { name: "Tu pedido" })).toBeVisible();
	await expect
		.poll(() => storedQuantities(page))
		.toEqual(TWO_PEOPLE_QUANTITIES);

	await page
		.getByRole("button", { name: "Cerrar", exact: true })
		.last()
		.click();
	await add.click();
	await expect
		.poll(() => storedQuantities(page))
		.toEqual(
			Object.fromEntries(
				Object.entries(TWO_PEOPLE_QUANTITIES).map(([name, quantity]) => [
					name,
					quantity * 2,
				]),
			),
		);
});
