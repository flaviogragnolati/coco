import { expect, test } from "vitest";

import { pickupPointSnapshotSchema } from "~/schemas/pickup-point.schemas";
import { buildPickupPointSnapshot } from "./pickup-point-snapshot";

const point = {
	id: 3,
	name: "Centro",
	line1: "San Martín 100",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: null,
	country: "AR",
	googleMapsUrl: "https://maps.example/centro",
	hours: "Lun a vie 10 a 18 h",
	instructions: null,
};

test("copies only the customer-facing fields, nulls included", () => {
	const snapshot = buildPickupPointSnapshot(
		{ ...point, active: false, deleted: true } as typeof point,
		"checkout",
		new Date("2026-10-09T12:00:00.000Z"),
	);

	expect(snapshot).toEqual({
		source: "checkout",
		capturedAt: "2026-10-09T12:00:00.000Z",
		pickupPoint: point,
	});
	expect(pickupPointSnapshotSchema.parse(snapshot)).toEqual(snapshot);
});
