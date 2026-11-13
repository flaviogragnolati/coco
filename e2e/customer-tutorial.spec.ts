import { expect, type Page, test } from "@playwright/test";

const CART_STORAGE_KEY = "coco.cart.v1";

const counter = (page: Page) => page.getByTestId("tutorial-step-counter");

function readCart(page: Page) {
	return page.evaluate((key) => localStorage.getItem(key), CART_STORAGE_KEY);
}

/** Every tRPC call the page makes from now on. */
function recordTrpcCalls(page: Page) {
	const calls: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/api/trpc")) calls.push(request.url());
	});
	return calls;
}

/** Whether some of the highlighted area is inside the viewport. */
function cutoutOnScreen(page: Page) {
	return page.getByTestId("tutorial-cutout").evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return (
			rect.height > 0 &&
			rect.bottom > 0 &&
			rect.top < window.innerHeight &&
			rect.right > 0 &&
			rect.left < window.innerWidth
		);
	});
}

/**
 * Clicks through the whole script. The first and last steps are centered
 * dialogs; every other step must find a visible target and cut it out.
 */
async function walk(page: Page, total: number) {
	for (let step = 1; step <= total; step += 1) {
		await expect(counter(page)).toHaveText(`${step} / ${total}`);
		const cutout = page.getByTestId("tutorial-cutout");
		if (step === 1 || step === total) {
			await expect(cutout).toHaveCount(0);
		} else {
			await expect(cutout, `step ${step} highlights its target`).toHaveCount(1);
			await expect
				.poll(() => cutoutOnScreen(page), {
					message: `step ${step} scrolls its target into view`,
				})
				.toBe(true);
		}
		if (step < total) {
			await page.getByRole("button", { name: "Siguiente" }).click();
		}
	}
}

test("the help menu opens the express tutorial, which steps, reloads and exits", async ({
	page,
}) => {
	await page.goto("/products");
	await page.getByRole("button", { name: "Ayuda" }).click();
	await page.getByRole("menuitem", { name: "Tutorial rápido · 1 min" }).click();

	await expect(page).toHaveURL(
		/\/tutorial\?version=rapido&volver=%2Fproducts$/,
	);
	await expect(counter(page)).toHaveText("1 / 12");
	await expect(
		page.getByText("Modo tutorial · datos de ejemplo"),
	).toBeVisible();

	await page.getByRole("button", { name: "Siguiente" }).click();
	await expect(counter(page)).toHaveText("2 / 12");
	await page.getByRole("button", { name: "Atrás" }).click();
	await expect(counter(page)).toHaveText("1 / 12");

	await page.keyboard.press("ArrowRight");
	await expect(counter(page)).toHaveText("2 / 12");
	await expect(page).toHaveURL(/paso=2/);

	await page.reload();
	await expect(counter(page)).toHaveText("2 / 12");

	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/products$/);
});

test("the help menu offers both versions, the FAQ and contact", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("button", { name: "Ayuda" }).click();
	const menu = page.getByRole("menu");
	await expect(menu.getByRole("menuitem")).toHaveText([
		"Tutorial rápido · 1 min",
		"Tutorial completo · 3 min",
		"Preguntas frecuentes",
		"Contacto",
	]);
	await expect(
		menu.getByRole("menuitem", { name: "Tutorial completo · 3 min" }),
	).toHaveAttribute("href", "/tutorial?version=completo");
});

test("the complete tutorial walks every step without touching the real cart", async ({
	page,
}) => {
	await page.goto("/products");
	await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);
	const cartBefore = await readCart(page);

	const trpcCalls = recordTrpcCalls(page);
	await page.goto("/tutorial?version=completo&volver=/products");
	await walk(page, 21);

	await expect(
		page.getByRole("button", { name: "Ir al catálogo" }),
	).toBeVisible();
	expect(await readCart(page)).toBe(cartBefore);
	expect(trpcCalls).toEqual([]);

	await page.getByRole("button", { name: "Terminar" }).click();
	await expect(page).toHaveURL(/\/products$/);
});

test("the express closing step leads into the complete version", async ({
	page,
}) => {
	await page.goto("/tutorial?version=rapido&paso=12");
	await expect(counter(page)).toHaveText("12 / 12");
	await page.getByRole("button", { name: "Ver el tutorial completo" }).click();
	await expect(counter(page)).toHaveText("1 / 21");
	await expect(page).toHaveURL(/version=completo/);
});

test("a return path the URL parser would take off-site falls back home", async ({
	page,
}) => {
	await page.goto("/tutorial?version=rapido&volver=%2F%09%2Fevil.example");
	await expect(counter(page)).toHaveText("1 / 12");
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("a deep link opens its step and an unsafe return path falls back home", async ({
	page,
}) => {
	await page.goto("/tutorial?version=completo&paso=19&volver=//evil.com");
	await expect(counter(page)).toHaveText("19 / 21");
	await expect(page.getByRole("heading", { name: "Envío" })).toBeVisible();
	await page
		.getByRole("button", { name: "Salir del tutorial" })
		.first()
		.click();
	await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("the order detail shows the price paid per unit and no repeat button", async ({
	page,
}) => {
	await page.goto("/tutorial?version=rapido&paso=11");
	await expect(counter(page)).toHaveText("11 / 12");
	await expect(
		page.getByText(/0,5 kg × \$\s?22\.600 \/ kg/).first(),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Repetir pedido" }),
	).toHaveCount(0);
});

test.describe("on a phone", () => {
	test.use({ viewport: { width: 375, height: 740 } });

	test("the express tutorial highlights a visible element on every step", async ({
		page,
	}) => {
		await page.goto("/tutorial");
		await walk(page, 12);
		await expect(page.getByRole("button", { name: "Terminar" })).toBeVisible();
	});

	test("the navbar keeps the help icon without wrapping", async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto("/");
		const help = page.getByRole("button", { name: "Ayuda" });
		await expect(help).toBeVisible();
		const nav = page.locator("header nav");
		const box = await nav.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.height).toBeLessThan(80);
	});
});
