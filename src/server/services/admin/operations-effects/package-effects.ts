import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import {
	buildFractionationEvents,
	buildPackageDeliveryEvents,
	buildPackageExceptionEvents,
	buildPackageRecoveredEvents,
	buildWriteOffResolvedEvents,
	buildWriteOffRollOverEvents,
} from "./fulfillment-event-builders";
import type {
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
	AdminPackageChangeSet,
	AdminPackageEffectHandler,
} from "./operations-effects.types";

const HANDLER = "PackageEffects";

function completedSummary(
	action: string,
	eventKeys: string[],
): AdminOperationsEffectSummary[] {
	return [
		{
			handler: HANDLER,
			action,
			status: "completed",
			message: `${eventKeys.length} domain events published.`,
		},
	];
}

function skippedSummary(
	action: string,
	message: string,
): AdminOperationsEffectSummary[] {
	return [{ handler: HANDLER, action, status: "skipped", message }];
}

/**
 * A write-off is the terminal follow-up of a disrupted package: the quantity
 * leaves the package and re-enters the pool as a post-allocation roll over.
 *
 * The `fulfillment.exception.resolved` event it publishes is a **journey
 * notice**, not a status decision. Whether the cart item still reads `exception`
 * depends on whether any other live disrupted package survives in its lineage,
 * and that question belongs to derivation (ADR 0002) — never to a handler.
 */
export class PackageEffects implements AdminPackageEffectHandler {
	async onPackageWrittenOff(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		const events = [
			...buildWriteOffRollOverEvents(ctx, changeSet),
			...buildWriteOffResolvedEvents(ctx, changeSet),
		];

		if (events.length === 0) {
			return skippedSummary(
				"package.writtenOff",
				"No domain events were needed.",
			);
		}

		await DomainEventPublisher.publishMany(ctx.db, events);
		return completedSummary(
			"package.writtenOff",
			events.map((event) => event.eventKey),
		);
	}

	/**
	 * Fractionation publishes `package.cartItem.packaged` per outbound allocation.
	 * The outbound package is a **new** row, so its deterministic keys are new too
	 * — unlike promotion, which keeps the package id and therefore publishes
	 * nothing (see `promote` in `package.service.ts`).
	 */
	async onPackageFractionated(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		const events = buildFractionationEvents(ctx, changeSet);

		if (events.length === 0) {
			return skippedSummary(
				"package.fractionated",
				"No domain events were needed.",
			);
		}

		await DomainEventPublisher.publishMany(ctx.db, events);
		return completedSummary(
			"package.fractionated",
			events.map((event) => event.eventKey),
		);
	}

	async onPackageDisrupted(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		const events = buildPackageExceptionEvents(ctx, changeSet);

		if (events.length === 0) {
			return skippedSummary(
				"package.disrupted",
				"No domain events were needed.",
			);
		}

		await DomainEventPublisher.publishMany(ctx.db, events);
		return completedSummary(
			"package.disrupted",
			events.map((event) => event.eventKey),
		);
	}

	/**
	 * The per-package handover: depot pickup, or one customer collecting from a
	 * pickup point. Also resolves the package's own exception when it was recovered
	 * by being delivered — the same "resolved is a notice, not a status decision"
	 * rule the write-off follows.
	 */
	async onDeliveryConfirmed(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		const events = [
			...buildPackageDeliveryEvents(ctx, changeSet),
			...(changeSet.resolvesException
				? buildPackageRecoveredEvents(ctx, changeSet)
				: []),
		];

		if (events.length === 0) {
			return skippedSummary(
				"package.deliveryConfirmed",
				"No domain events were needed.",
			);
		}

		await DomainEventPublisher.publishMany(ctx.db, events);
		return completedSummary(
			"package.deliveryConfirmed",
			events.map((event) => event.eventKey),
		);
	}

	async onPackageRecovered(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		const events = buildPackageRecoveredEvents(ctx, changeSet);

		if (events.length === 0) {
			return skippedSummary(
				"package.recovered",
				"No domain events were needed.",
			);
		}

		await DomainEventPublisher.publishMany(ctx.db, events);
		return completedSummary(
			"package.recovered",
			events.map((event) => event.eventKey),
		);
	}
}
