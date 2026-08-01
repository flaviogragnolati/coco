import { lotStatusLabelMap } from "~/features/admin/crud/lot/lot.mappers";
import { operationStatusLabelMap } from "~/features/admin/crud/operation/operation.mappers";
import { fulfillmentStatusLabelMap } from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import {
	packageLotItemStatusLabelMap,
	packageStatusLabelMap,
} from "~/features/admin/crud/package/package.mappers";
import { rollOverStatusLabelMap } from "~/features/admin/crud/roll-over/roll-over.mappers";
import { shipmentStatusLabelMap } from "~/features/admin/crud/shipment/shipment.mappers";
import { supplierOrderStatusLabelMap } from "~/features/admin/crud/supplier-order/supplier-order.mappers";
import { toScaled } from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import type { AppliedEffect } from "~/shared/common/admin-crud/applied-effects.types";
import type {
	CommandDisclosure,
	EffectRecordKey,
	ResolvedDisclosure,
} from "./fulfillment-effects.types";

export const recordLabels: Record<
	EffectRecordKey,
	[singular: string, plural: string]
> = {
	operation: ["operación", "operaciones"],
	lot: ["lote", "lotes"],
	lotItem: ["línea de lote", "líneas de lote"],
	supplierOrder: ["orden de proveedor", "órdenes de proveedor"],
	rollOver: ["rollover", "rollovers"],
	shipment: ["envío", "envíos"],
	package: ["paquete", "paquetes"],
	packageLine: ["línea de paquete", "líneas de paquete"],
	cartItem: ["ítem de demanda", "ítems de demanda"],
};

/**
 * One Spanish vocabulary per record, reusing the maps the tables and badges
 * already render from, the way `glossary/data/operation.ts` does. Lot items share
 * `lotStatusLabelMap` — their statuses are the lot vocabulary minus `assembling`,
 * which is why no `lotItemStatusLabelMap` exists.
 *
 * `operation` and `packageLine` deliberately have **no transition ladder**
 * (architecture §15 #5: an exported map no service consults would be a second
 * truth); the anti-drift suite checks those two against their zod status schemas
 * instead.
 */
export const statusLabelMaps: Record<
	EffectRecordKey,
	Readonly<Record<string, string>>
> = {
	operation: operationStatusLabelMap,
	lot: lotStatusLabelMap,
	lotItem: lotStatusLabelMap,
	supplierOrder: supplierOrderStatusLabelMap,
	rollOver: rollOverStatusLabelMap,
	shipment: shipmentStatusLabelMap,
	package: packageStatusLabelMap,
	packageLine: packageLotItemStatusLabelMap,
	cartItem: fulfillmentStatusLabelMap,
};

export function statusLabel(record: EffectRecordKey, status: string): string {
	return statusLabelMaps[record][status] ?? status;
}

function recordLabel(record: EffectRecordKey, count: number) {
	const [singular, plural] = recordLabels[record];
	return count === 1 ? singular : plural;
}

/** A quantity worth showing: a parseable decimal string above zero. */
function isPositiveQuantity(value: string | null): value is string {
	if (value === null) return false;
	const scaled = toScaled(value);
	return scaled !== null && scaled > 0n;
}

/**
 * Turns a declared disclosure into the Spanish the panel renders. Lines whose
 * count resolves to zero are dropped here rather than in each catalog entry: an
 * empty count is noise, and dropping it centrally is what lets one entry serve
 * both delivery modes.
 */
export function resolveDisclosure<TCtx>(
	disclosure: CommandDisclosure<TCtx>,
	ctx: TCtx,
): ResolvedDisclosure {
	const lines: ResolvedDisclosure["lines"] = [];

	for (const effect of disclosure.effects) {
		if (effect.kind === "quantity") {
			const quantity = effect.quantity(ctx);
			if (!isPositiveQuantity(quantity)) continue;
			lines.push({ icon: "quantity", text: `${effect.label}: ${quantity}` });
			continue;
		}

		const count = effect.count(ctx);
		if (count <= 0) continue;

		if (effect.kind === "creates" || effect.kind === "deletes") {
			const sign = effect.kind === "creates" ? "+" : "−";
			const label = `${sign} ${count} ${recordLabel(effect.record, count)}`;
			lines.push({
				icon: effect.kind,
				text: effect.note ? `${label} (${effect.note})` : label,
			});
			continue;
		}

		if (effect.kind === "transition") {
			const subject = `${count} ${recordLabel(effect.record, count)}`;
			const target = statusLabel(effect.record, effect.to);
			lines.push({
				icon: "transition",
				text:
					effect.from === undefined
						? `${subject} → ${target}`
						: `${subject}: ${statusLabel(effect.record, effect.from)} → ${target}`,
			});
			continue;
		}

		if (effect.kind === "note") {
			lines.push({
				icon: "note",
				text: effect.text.replaceAll("{n}", String(count)),
			});
			continue;
		}

		lines.push({
			icon: "customer",
			text: effect.note.replaceAll("{n}", String(count)),
		});
	}

	const next = disclosure.next.find((option) => option.when?.(ctx) ?? true);

	return {
		lines,
		demandNote: disclosure.demand.note,
		undoNote: disclosure.undo.note,
		nextLabel: next?.label ?? null,
		detail: disclosure.detail?.(ctx) ?? [],
	};
}

/**
 * The Spanish for every code a command's `applied` summary can carry. The server
 * sends codes and numbers only, so this map is the single place the operator-facing
 * wording lives — and the anti-drift suite checks it against the `appliedCodes` of
 * every catalog entry in both directions.
 */
export const appliedEffectLabels = {
	lotsCancelled: "lotes cancelados",
	linesCancelled: "líneas canceladas",
	ordersCancelled: "órdenes de proveedor canceladas",
	ownRollOversCancelled: "rollovers propios cancelados",
	consumedRollOversReopened: "rollovers consumidos reabiertos",
	cartItemsExcluded: "ítems de demanda liberados",
	linesConfirmed: "líneas confirmadas",
	rollOverQuantity: "cantidad a rollover",
	cartItemsCut: "ítems de demanda recortados",
	shipmentsCreated: "envíos creados",
	packagesCreated: "paquetes creados",
	linesPackaged: "líneas empaquetadas",
	dispatchedQuantity: "cantidad despachada",
	linesReceived: "líneas recibidas",
	shortfallQuantity: "faltante",
	rollOversCreated: "rollovers creados",
	cartItemsAffected: "ítems de demanda afectados",
	writtenOffQuantity: "cantidad dada de baja",
	customersServed: "clientes con paquete propio",
	fractionatedQuantity: "cantidad fraccionada",
	movedQuantity: "cantidad movida",
} as const satisfies Record<string, string>;

export type AppliedEffectCode = keyof typeof appliedEffectLabels;

/**
 * Past tense, from what the server reports it actually did. Zero-valued entries
 * are dropped for the same reason the panel drops zero-count lines.
 */
export function describeApplied(applied: AppliedEffect[]): string[] {
	return applied.flatMap((effect) => {
		const label = appliedEffectLabels[effect.code as AppliedEffectCode];
		if (!label) return [];

		if (effect.quantity !== null) {
			return isPositiveQuantity(effect.quantity)
				? [`${effect.quantity} ${label}`]
				: [];
		}
		if (effect.count !== null && effect.count > 0) {
			return [`${effect.count} ${label}`];
		}
		return [];
	});
}

/** The report for the seven commands whose outcome the admin's own input decides. */
export function buildAppliedToast(
	title: string,
	applied: AppliedEffect[],
): { title: string; description: string } {
	const parts = describeApplied(applied);
	return {
		title,
		description:
			parts.length > 0 ? parts.join(" · ") : "Sin cambios que reportar",
	};
}

/**
 * The report for every other command: a successful pure-ladder command performed
 * exactly the cascade it announced, so the announcement resolved against the
 * **pre-command** context *is* what happened — which is why callers pass the
 * detail they were showing, not the one the mutation returned.
 */
export function buildAnnouncedToast<TCtx>(
	title: string,
	disclosure: CommandDisclosure<TCtx>,
	ctx: TCtx,
): { title: string; description: string } {
	const resolved = resolveDisclosure(disclosure, ctx);
	// Records and quantities only: the customer-facing and contextual lines belong
	// in the panel, where there is room for them.
	const parts = resolved.lines
		.filter((line) => line.icon !== "customer" && line.icon !== "note")
		.map((line) => line.text.replace(/^[+−] /, ""));

	return {
		title,
		description:
			parts.length > 0 ? parts.join(" · ") : (resolved.lines[0]?.text ?? title),
	};
}
