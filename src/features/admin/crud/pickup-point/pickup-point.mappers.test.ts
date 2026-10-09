import { expect, test } from "vitest";

import {
	deactivationDescription,
	pickupPointAddressLine,
} from "./pickup-point.mappers";

test("the deactivation warning states how many paid orders keep the point", () => {
	expect(
		deactivationDescription({ name: "Centro", pendingOrderCount: 0 }),
	).toBe(
		'Ningún pedido pago en curso eligió este punto. El checkout deja de ofrecer "Centro" enseguida.',
	);
	expect(
		deactivationDescription({ name: "Centro", pendingOrderCount: 1 }),
	).toBe(
		'Hay 1 pedido pago que eligió este punto; lo conserva hasta que cambies su entrega. El checkout deja de ofrecer "Centro" enseguida.',
	);
	expect(
		deactivationDescription({ name: "Centro", pendingOrderCount: 3 }),
	).toContain("Hay 3 pedidos pagos que eligieron este punto; lo conservan");
});

test("the address line skips the empty second line", () => {
	expect(
		pickupPointAddressLine({
			line1: "San Martín 100",
			line2: null,
			city: "Ushuaia",
		}),
	).toBe("San Martín 100, Ushuaia");
});
