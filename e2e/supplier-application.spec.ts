import { expect, test } from "@playwright/test";

test("the footer leads to the supplier page", async ({ page }) => {
	await page.goto("/");

	await page
		.locator("footer#contacto")
		.getByRole("link", { name: "Sé proveedor" })
		.click();

	await expect(page).toHaveURL(/\/proveedores$/);
	await expect(
		page.getByRole("heading", { level: 1, name: "Sé proveedor de Coco" }),
	).toBeVisible();
});

// Stops short of a valid submit: the suite runs against a shared database.
test("the supplier form asks for a way to reach the sender", async ({
	page,
}) => {
	await page.goto("/proveedores");

	await page.getByLabel("Tu nombre").fill("Ana Pérez");
	await page.getByLabel("Empresa").fill("Distribuidora Sur");
	await page.getByLabel("¿Qué ofrecés?").fill("Yerba por bulto");
	await page.getByRole("button", { name: "Enviar solicitud" }).click();

	await expect(
		page.getByText("Dejanos un email o un teléfono para contactarte", {
			exact: true,
		}),
	).toBeVisible();
});
