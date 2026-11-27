import { expect, test } from "@playwright/test";
import { buildEmailPreviewDocument } from "../src/features/admin/notifications/email-preview-document";

test("the frozen mail retains its layout and text with links and external resources disabled", async ({
	page,
}) => {
	const requests: string[] = [];
	await page.route("https://mail-assets.invalid/**", (route) => {
		requests.push(route.request().url());
		return route.abort();
	});
	const preview = await page.evaluate(
		buildEmailPreviewDocument,
		`<html><body style="background-color:#fbf1df"><main><h1>Retiro del pedido ORD-12</h1>
		<p>Arroz &amp; coco</p><a href="https://mail-assets.invalid/pedido">Ver mi pedido</a>
		<img alt="" src="https://mail-assets.invalid/logo.png"></main></body></html>`,
	);
	await page.setContent('<iframe sandbox="" title="Mail"></iframe>');
	await page.locator("iframe").evaluate((frame, srcDoc) => {
		frame.setAttribute("srcdoc", srcDoc);
	}, preview);
	const frame = page.frameLocator("iframe");
	await expect(frame.getByRole("heading")).toHaveText(
		"Retiro del pedido ORD-12",
	);
	await expect(frame.locator("body")).toHaveCSS(
		"background-color",
		"rgb(251, 241, 223)",
	);
	await expect(frame.getByText("Arroz & coco")).toBeVisible();
	await expect(frame.getByText("Ver mi pedido")).toBeVisible();
	await expect(frame.getByRole("link")).toHaveCount(0);
	await expect(frame.locator("img")).toHaveCount(0);
	expect(requests).toEqual([]);
});
