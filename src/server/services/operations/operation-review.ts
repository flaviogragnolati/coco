import { createHash } from "node:crypto";
import { Prisma } from "~/prisma/client";
import type {
	DemandItem,
	ResolvedAssignment,
	RollOverInput,
} from "./operation-execution.service";

/**
 * An admin's standing decision to keep demand out of an operation, taken before
 * it executes. Both halves are persisted on the draft and re-applied on every
 * recomputation: `userIds` is a standing decision about a customer, not a bulk
 * toggle expanded at click time (ADR 0006).
 */
export type DemandOmissions = {
	sourceKeys: string[];
	userIds: string[];
};

/**
 * Frozen because it is shared by every caller that starts from "nothing omitted";
 * pushing onto it would silently omit demand across unrelated drafts.
 */
export const emptyOmissions: DemandOmissions = Object.freeze({
	sourceKeys: Object.freeze([]) as unknown as string[],
	userIds: Object.freeze([]) as unknown as string[],
});

export function applyOmissions(
	items: DemandItem[],
	omissions: DemandOmissions,
): { effective: DemandItem[]; omitted: DemandItem[] } {
	const sourceKeys = new Set(omissions.sourceKeys);
	const userIds = new Set(omissions.userIds);

	const effective: DemandItem[] = [];
	const omitted: DemandItem[] = [];

	for (const item of items) {
		if (sourceKeys.has(item.sourceKey) || userIds.has(item.userId)) {
			omitted.push(item);
		} else {
			effective.push(item);
		}
	}

	return { effective, omitted };
}

/**
 * Drops omissions that no longer match any demand — the parameters moved and the
 * item they named fell out of the window. Reported rather than silently discarded
 * so the review can tell the admin what it forgot on their behalf.
 */
export function pruneOmissions(
	items: DemandItem[],
	omissions: DemandOmissions,
): {
	omissions: DemandOmissions;
	droppedSourceKeys: string[];
	droppedUserIds: string[];
} {
	const presentSourceKeys = new Set(items.map((item) => item.sourceKey));
	const presentUserIds = new Set(items.map((item) => item.userId));

	const keptSourceKeys: string[] = [];
	const droppedSourceKeys: string[] = [];
	for (const sourceKey of omissions.sourceKeys) {
		if (presentSourceKeys.has(sourceKey)) keptSourceKeys.push(sourceKey);
		else droppedSourceKeys.push(sourceKey);
	}

	const keptUserIds: string[] = [];
	const droppedUserIds: string[] = [];
	for (const userId of omissions.userIds) {
		if (presentUserIds.has(userId)) keptUserIds.push(userId);
		else droppedUserIds.push(userId);
	}

	return {
		omissions: { sourceKeys: keptSourceKeys, userIds: keptUserIds },
		droppedSourceKeys,
		droppedUserIds,
	};
}

/**
 * Identity of the demand set an admin approved. Two properties earn the shape:
 * sorting makes it independent of the order `buildDemand` happened to return, and
 * carrying the quantity makes an edited order line count as a change.
 *
 * It must be computed over the *effective* set — demand minus omissions — so new
 * demand from an already-omitted user does not block execution (ADR 0006).
 * `Prisma.Decimal#toString()` and never `Number()`: the column is 18,4 and float
 * coercion would make the fingerprint lie about what was reviewed.
 */
export function buildDemandFingerprint(effective: DemandItem[]): string {
	const lines = effective
		.map((item) => `${item.sourceKey}:${item.quantity.toString()}`)
		.sort();

	return createHash("sha256").update(lines.join("\n")).digest("hex");
}

const sumQuantities = (values: Prisma.Decimal[]) =>
	values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));

const distinctCartItems = (items: { cartItemId: number }[]) =>
	new Set(items.map((item) => item.cartItemId)).size;

type SupplierGroupSummary = {
	supplier: { id: number; name: string; active: boolean; deleted: boolean };
	lotItemCount: number;
	quantity: Prisma.Decimal;
};

/**
 * Shapes the review payload. Two properties of the arithmetic upstream make this
 * safe to do in one pass:
 *
 * - `resolved` is computed over the **whole** demand set, omitted rows included.
 *   `calculateAssignableQuantity` is applied per demand item, so an item's
 *   supplier, assigned quantity and roll over never depend on which other items
 *   are present. That is what lets the dialog recompute totals client-side as
 *   omissions toggle, exactly, without a server round trip.
 * - `totals`, `groups` and `fingerprint` are taken over the **effective** set
 *   only — demand minus omissions — which is what the execution will actually
 *   run and what the conflict check compares (ADR 0006).
 */
export function buildReviewProjection(input: {
	items: DemandItem[];
	omissions: DemandOmissions;
	resolved: { assignments: ResolvedAssignment[]; rollOvers: RollOverInput[] };
	supplierGroups: SupplierGroupSummary[];
}) {
	const { effective, omitted } = applyOmissions(input.items, input.omissions);
	const omittedKeys = new Set(omitted.map((item) => item.sourceKey));

	const assignmentByKey = new Map(
		input.resolved.assignments.map((assignment) => [
			assignment.demand.sourceKey,
			assignment,
		]),
	);
	const rollOverByKey = new Map(
		input.resolved.rollOvers.map((rollOver) => [
			rollOver.demand.sourceKey,
			rollOver,
		]),
	);

	const rows = input.items.map((item) => {
		const assignment = assignmentByKey.get(item.sourceKey);
		const rollOver = rollOverByKey.get(item.sourceKey);

		return {
			sourceKey: item.sourceKey,
			source:
				item.sourceRollOverId === undefined
					? ("orderItem" as const)
					: ("rollOver" as const),
			cartItemId: item.cartItemId,
			cartItemCode: item.cartItemCode,
			cartId: item.cartId,
			cartCode: item.cartCode,
			user: { id: item.userId, name: item.userName, email: item.userEmail },
			product: {
				id: item.product.id,
				name: item.product.name,
				unit: item.product.unit,
			},
			quantity: item.quantity.toString(),
			supplier: assignment?.supplierTerm.supplier ?? null,
			productSupplierTermsId: assignment?.supplierTerm.id ?? null,
			assignedQuantity: (
				assignment?.assignedQuantity ?? new Prisma.Decimal(0)
			).toString(),
			rollOverQuantity: (
				rollOver?.quantity ?? new Prisma.Decimal(0)
			).toString(),
			rollOverReason: rollOver?.reason ?? null,
			omitted: omittedKeys.has(item.sourceKey),
		};
	});

	const effectiveAssignments = input.resolved.assignments.filter(
		(assignment) => !omittedKeys.has(assignment.demand.sourceKey),
	);
	const effectiveRollOvers = input.resolved.rollOvers.filter(
		(rollOver) => !omittedKeys.has(rollOver.demand.sourceKey),
	);

	return {
		rows,
		groups: input.supplierGroups.map((group) => ({
			supplier: group.supplier,
			lotItemCount: group.lotItemCount,
			quantity: group.quantity.toString(),
		})),
		totals: {
			eligibleItemCount: effective.length,
			eligibleQuantity: sumQuantities(
				effective.map((item) => item.quantity),
			).toString(),
			omittedItemCount: omitted.length,
			omittedQuantity: sumQuantities(
				omitted.map((item) => item.quantity),
			).toString(),
			assignedItemCount: distinctCartItems(
				effectiveAssignments.map((assignment) => assignment.demand),
			),
			assignedQuantity: sumQuantities(
				effectiveAssignments.map((assignment) => assignment.assignedQuantity),
			).toString(),
			rollOverItemCount: distinctCartItems(
				effectiveRollOvers.map((rollOver) => rollOver.demand),
			),
			rollOverQuantity: sumQuantities(
				effectiveRollOvers.map((rollOver) => rollOver.quantity),
			).toString(),
			lotCount: input.supplierGroups.length,
			supplierOrderCount: input.supplierGroups.length,
		},
		fingerprint: buildDemandFingerprint(effective),
		effective,
		omitted,
	};
}
