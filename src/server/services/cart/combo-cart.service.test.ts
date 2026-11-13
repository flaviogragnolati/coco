import { beforeAll, beforeEach, expect, test, vi } from "vitest";

const cartData = { findActiveComboForCart: vi.fn() };
const cartService = { addItems: vi.fn() };

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({ db: { name: "db" } }));
vi.mock("./cart.data", () => cartData);
vi.mock("./cart.service", () => cartService);

let service: typeof import("./combo-cart.service");

beforeAll(async () => {
	service = await import("./combo-cart.service");
});

beforeEach(() => {
	vi.clearAllMocks();
});

test("an inactive, deleted or missing combo is not found", async () => {
	cartData.findActiveComboForCart.mockResolvedValue(null);

	await expect(service.addCombo("user-1", 7)).rejects.toMatchObject({
		code: "NOT_FOUND",
		message: "Ese combo ya no está disponible.",
	});
	expect(cartService.addItems).not.toHaveBeenCalled();
});

test("adds the combo's products with their quantities and names, in order", async () => {
	const output = { cart: { id: 3 }, lines: [] };
	cartData.findActiveComboForCart.mockResolvedValue({
		items: [
			{
				productId: 2,
				quantity: { toString: () => "1" },
				product: { name: "Granola" },
			},
			{
				productId: 1,
				quantity: { toString: () => "0.5" },
				product: { name: "Pasas" },
			},
		],
	});
	cartService.addItems.mockResolvedValue(output);

	await expect(service.addCombo("user-1", 7)).resolves.toBe(output);
	expect(cartData.findActiveComboForCart).toHaveBeenCalledWith(
		{ name: "db" },
		7,
	);
	expect(cartService.addItems).toHaveBeenCalledWith("user-1", [
		{ productId: 2, quantity: "1", name: "Granola" },
		{ productId: 1, quantity: "0.5", name: "Pasas" },
	]);
});
