import { expect, test } from "vitest";

import type { PackageListItem } from "~/shared/common/admin-crud/package.types";
import { groupOutboundPackages } from "./outbound-package-groups";

function pkg(
	id: number,
	order: PackageListItem["order"],
	orderCount = order ? 1 : 0,
): PackageListItem {
	return { id, name: `Paquete ${id}`, order, orderCount } as PackageListItem;
}

const centro = (orderId: number) => ({
	orderId,
	orderCode: `ORD-${orderId}`,
	customerName: `Cliente ${orderId}`,
	deliveryPreference: "pickupPoint" as const,
	pickupPointId: 3,
	pickupPointName: "Centro",
});

test("groups packages by pickup point, home order, no choice and several orders", () => {
	const groups = groupOutboundPackages([
		pkg(1, {
			...centro(10),
			deliveryPreference: "homeDelivery",
			pickupPointId: null,
			pickupPointName: null,
		}),
		pkg(2, centro(11)),
		pkg(3, centro(12)),
		pkg(4, { ...centro(13), deliveryPreference: null, pickupPointId: null }),
		pkg(5, null),
		pkg(6, null, 2),
	]);

	expect(
		groups.map((group) => [
			group.label,
			group.packages.map((item) => item.id),
			group.delivery,
		]),
	).toEqual([
		[
			"Punto de retiro · Centro",
			[2, 3],
			{ mode: "pickupPoint", pickupPointId: 3 },
		],
		[
			"A domicilio · Cliente 10 · ORD-10",
			[1],
			{ mode: "homeDelivery", pickupPointId: null },
		],
		["Sin elección", [4, 5], null],
		["Varios pedidos", [6], null],
	]);
});
