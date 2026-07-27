import "server-only";

import type {
	CartItemFulfillmentStatus,
	CartItemTrackingEventType,
	Prisma,
} from "~/prisma/client";
import { fulfillmentStageRank } from "~/shared/common/fulfillment-transitions";
import {
	type AdminTrackingStageKey,
	adminTrackingStageByEventType,
	adminTrackingStageKeys,
} from "~/shared/common/tracking-display";
import { appLogger } from "../logging/app-logger.service";
import { loadFulfillmentLineageSnapshot } from "./fulfillment-lineage.data";
import { deriveFulfillmentStatus } from "./fulfillment-status.derivation";

export type TrackingStatusProjectionInput = {
	cartItemId: number;
	eventKey?: string;
	eventType?: CartItemTrackingEventType;
};

const stageKeys: ReadonlySet<string> = new Set(adminTrackingStageKeys);

function isStageKey(
	status: CartItemFulfillmentStatus,
): status is AdminTrackingStageKey {
	return stageKeys.has(status);
}

/**
 * Observability only: the arriving event implies a stage the lineage cannot
 * back yet, so the evidence it claims is missing. Deviations
 * (cancelled/exception/rolled over) are legitimate and stay silent.
 */
function warnWhenEventOutrunsDerivation(
	input: TrackingStatusProjectionInput,
	derived: CartItemFulfillmentStatus,
) {
	if (!input.eventType || !isStageKey(derived)) return;

	const expectedStage = adminTrackingStageByEventType[input.eventType];
	if (!expectedStage) return;
	if (fulfillmentStageRank(expectedStage) <= fulfillmentStageRank(derived)) {
		return;
	}

	appLogger.warn("trackingStatusProjectionSkipped", {
		eventKey: input.eventKey,
		eventType: input.eventType,
		cartItemId: input.cartItemId,
		expectedStage,
		derivedStatus: derived,
	});
}

// biome-ignore lint/complexity/noStaticOnlyClass: This class is a logical grouping of related functionality and is not expected to be instantiated or extended.
export class TrackingStatusProjector {
	static async project(
		tx: Prisma.TransactionClient,
		input: TrackingStatusProjectionInput,
	): Promise<void> {
		const snapshot = await loadFulfillmentLineageSnapshot(tx, input.cartItemId);
		if (!snapshot) return;

		const derived = deriveFulfillmentStatus(snapshot);

		warnWhenEventOutrunsDerivation(input, derived);

		await tx.cartItem.updateMany({
			where: {
				id: input.cartItemId,
				fulfillmentStatus: { not: derived },
			},
			data: { fulfillmentStatus: derived },
		});
	}
}
