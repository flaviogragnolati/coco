import { expect, test } from "@playwright/test";

// The order page is where a customer finishes (ADR 0015). Without a session
// e2e can cover the guest side only; the signed-in panel is checked by hand
// (docs/plans/checkout-en-tu-pedido-y-seguimiento.md, §11).

test("the old checkout address lands on the order page", async ({ page }) => {
	await page.goto("/checkout");
	await expect(page).toHaveURL(/\/cart$/);
	await expect(
		page.getByRole("heading", { name: "Tu pedido de la semana" }),
	).toBeVisible();
});

test("a guest sees the closing, the total and how to sign in to finish", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const add = page
		.getByRole("button", { name: /^Sumar .+ a tu pedido$/ })
		.first();
	test.skip(
		(await add.count()) === 0,
		"The current fixture has no purchasable products.",
	);
	// The buttons stay disabled until the cart store hydrates.
	await expect(add).toBeEnabled();
	await add.click();
	await expect(page.getByRole("dialog", { name: "Tu pedido" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Ver pedido completo" }),
	).toHaveAttribute("href", "/cart");

	await page.goto("/cart");
	const main = page.getByRole("main");
	await expect(
		main.getByRole("complementary", { name: "Cierre del pedido" }),
	).toBeVisible();
	const finish = main.getByRole("region", { name: "Finalizar" });
	await expect(finish).toContainText(/Total · 1 producto/);
	await expect(
		finish.getByRole("link", { name: "Registrarme o iniciar sesión" }),
	).toHaveAttribute("href", "/login?callbackURL=/cart");
	await expect(main).not.toContainText(/Código de armado|checkout/i);
});

test("a Mercado Pago return without a known order explains it in plain words", async ({
	page,
}) => {
	const cases = [
		["success", "Volviste de Mercado Pago"],
		["pending", "Mercado Pago está procesando tu pago"],
		["failure", "Mercado Pago no aprobó el pago"],
	] as const;

	for (const [route, title] of cases) {
		// Signed out, a real-looking reference still resolves to nothing.
		await page.goto(
			`/checkout/mercadopago/${route}?external_reference=user_transaction:1&status=approved`,
		);
		const main = page.getByRole("main");
		await expect(main.getByRole("heading", { name: title })).toBeVisible();
		await expect(
			main.getByRole("link", { name: "Ver mis pedidos" }),
		).toHaveAttribute("href", "/my-orders");
		await expect(main).not.toContainText(/webhook|reconcili/i);
	}
});
