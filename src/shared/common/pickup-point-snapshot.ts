import type { z } from "zod";

import type {
	pickupPointDataSchema,
	pickupPointSnapshotSchema,
	pickupPointSnapshotSourceSchema,
} from "~/schemas/pickup-point.schemas";

export type PickupPointData = z.output<typeof pickupPointDataSchema>;
export type PickupPointSnapshot = z.output<typeof pickupPointSnapshotSchema>;
export type PickupPointSnapshotSource = z.output<
	typeof pickupPointSnapshotSourceSchema
>;

/**
 * The single place a pickup point becomes order or shipment data. Copies only
 * the customer-facing fields, so admin flags never leak into a snapshot.
 */
export function buildPickupPointSnapshot(
	point: PickupPointData,
	source: PickupPointSnapshotSource,
	capturedAt: Date = new Date(),
): PickupPointSnapshot {
	return {
		source,
		capturedAt: capturedAt.toISOString(),
		pickupPoint: {
			id: point.id,
			name: point.name,
			line1: point.line1,
			line2: point.line2,
			city: point.city,
			state: point.state,
			postalCode: point.postalCode,
			country: point.country,
			googleMapsUrl: point.googleMapsUrl,
			hours: point.hours,
			instructions: point.instructions,
		},
	};
}
