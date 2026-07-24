import { describe, expect, it } from "vitest";

import { adminHome, adminNavGroups, findAdminNavItem } from "./admin-nav";

const allItems = [adminHome, ...adminNavGroups.flatMap((group) => group.items)];

describe("adminNavGroups", () => {
	it("exposes unique hrefs", () => {
		const hrefs = allItems.map((item) => item.href);

		expect(new Set(hrefs).size).toBe(hrefs.length);
	});

	it("keeps every href under /admin and without a trailing slash", () => {
		for (const item of allItems) {
			expect(item.href === "/admin" || item.href.startsWith("/admin/")).toBe(
				true,
			);
			expect(item.href.endsWith("/")).toBe(false);
		}
	});

	it("labels the four expected groups", () => {
		expect(adminNavGroups.map((group) => group.label)).toEqual([
			"Operación",
			"Pagos",
			"Catálogo",
			"Usuarios",
		]);
	});
});

describe("findAdminNavItem", () => {
	it("resolves the dashboard for /admin", () => {
		expect(findAdminNavItem("/admin")?.item).toBe(adminHome);
	});

	it("prefers the longest matching href over the dashboard", () => {
		const match = findAdminNavItem("/admin/carts/abc");

		expect(match?.item.title).toBe("Carritos");
		expect(match?.group?.label).toBe("Operación");
	});

	it("matches an exact section href", () => {
		expect(findAdminNavItem("/admin/tracking")?.item.title).toBe("Tracking");
	});

	it("does not treat a shared prefix as a match", () => {
		expect(findAdminNavItem("/admin/cartsomething")?.item).toBe(adminHome);
	});

	it("returns null outside the admin area", () => {
		expect(findAdminNavItem("/products")).toBeNull();
	});
});
