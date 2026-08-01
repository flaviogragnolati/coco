import { expect, test } from "vitest";
import {
	operationDisclosures,
	rollOverDisclosures,
} from "~/features/admin/crud/operation/operation.effects";
import { packageDisclosures } from "~/features/admin/crud/package/package.effects";
import { shipmentDisclosures } from "~/features/admin/crud/shipment/shipment.effects";
import { supplierOrderDisclosures } from "~/features/admin/crud/supplier-order/supplier-order.effects";
import { operationStatusSchema } from "~/schemas/admin/operation.schemas";
import { packageLotItemStatusSchema } from "~/schemas/admin/package.schemas";
import { rollOverStatusSchema } from "~/schemas/admin/roll-over.schemas";
import {
	COMMAND_EVENT_TYPES,
	type LifecycleCommandId,
	lifecycleCommandIds,
} from "~/shared/common/fulfillment-command-events";
import {
	isLegalTransition,
	lotItemTransitions,
	lotTransitions,
	packageTransitions,
	shipmentTransitions,
	supplierOrderTransitions,
} from "~/shared/common/fulfillment-transitions";
import {
	appliedEffectLabels,
	resolveDisclosure,
	statusLabelMaps,
} from "./fulfillment-effects";
import type {
	CommandDisclosure,
	EffectRecordKey,
} from "./fulfillment-effects.types";

type Registered = [LifecycleCommandId, CommandDisclosure<never>];

function entriesOf(
	entity: string,
	disclosures: Record<string, CommandDisclosure<never>>,
): Registered[] {
	return Object.entries(disclosures).map(([command, disclosure]) => [
		`${entity}.${command}` as LifecycleCommandId,
		disclosure,
	]);
}

const registry: Registered[] = [
	...entriesOf("operation", operationDisclosures),
	...entriesOf("rollOver", rollOverDisclosures),
	...entriesOf("supplierOrder", supplierOrderDisclosures),
	...entriesOf("shipment", shipmentDisclosures),
	...entriesOf("package", packageDisclosures),
];

/** Records whose statuses a shared ladder governs (architecture §15 #5). */
const laddersByRecord = {
	supplierOrder: supplierOrderTransitions,
	lot: lotTransitions,
	lotItem: lotItemTransitions,
	package: packageTransitions,
	shipment: shipmentTransitions,
} as const satisfies Partial<
	Record<EffectRecordKey, Record<string, ReadonlySet<string>>>
>;

/**
 * The records with **no** ladder. `fulfillment-transitions.ts` exports six and
 * these are not among them, deliberately: an exported map no service consults
 * would be a second truth. They are enum-checked instead, so a typo still fails.
 */
const statusSchemaByRecord = {
	operation: operationStatusSchema,
	packageLine: packageLotItemStatusSchema,
	rollOver: rollOverStatusSchema,
} as const satisfies Partial<
	Record<
		EffectRecordKey,
		{ safeParse: (value: string) => { success: boolean } }
	>
>;

const commandKeysByEntity = lifecycleCommandIds.reduce<
	Record<string, Set<string>>
>((accumulator, id) => {
	const [entity = "", command = ""] = id.split(".");
	const keys = accumulator[entity] ?? new Set<string>();
	keys.add(command);
	accumulator[entity] = keys;
	return accumulator;
}, {});

function transitions(disclosure: CommandDisclosure<never>) {
	return disclosure.effects.filter((effect) => effect.kind === "transition");
}

test("every lifecycle command has a disclosure and no entry is an orphan", () => {
	const registered = registry.map(([id]) => id);

	expect(registered).toHaveLength(new Set(registered).size);
	expect([...registered].sort()).toEqual([...lifecycleCommandIds].sort());
});

test.each(registry)("%s declares only legal transitions", (_id, disclosure) => {
	for (const effect of transitions(disclosure)) {
		const ladder =
			laddersByRecord[effect.record as keyof typeof laddersByRecord];
		if (!ladder) continue;

		expect(Object.keys(ladder)).toContain(effect.to);
		if (effect.from !== undefined) {
			expect(
				isLegalTransition(
					ladder as Record<string, ReadonlySet<string>>,
					effect.from,
					effect.to,
				),
			).toBe(true);
		}
	}
});

test.each(
	registry,
)("%s declares valid statuses for the records with no ladder", (_id, disclosure) => {
	for (const effect of transitions(disclosure)) {
		const schema =
			statusSchemaByRecord[effect.record as keyof typeof statusSchemaByRecord];
		if (!schema) continue;

		expect(schema.safeParse(effect.to).success).toBe(true);
		if (effect.from !== undefined) {
			expect(schema.safeParse(effect.from).success).toBe(true);
		}
	}
});

test.each(
	registry,
)("%s only claims customer-visible facts it actually publishes", (id, disclosure) => {
	const published = COMMAND_EVENT_TYPES[id];
	const claimed = disclosure.effects.filter(
		(effect) => effect.kind === "customer",
	);

	if (published.length === 0) expect(claimed).toHaveLength(0);
	for (const effect of claimed) {
		expect(published).toContain(effect.publishes);
	}
});

test.each(
	registry,
)("%s declares statuses that resolve to Spanish", (_id, disclosure) => {
	for (const effect of transitions(disclosure)) {
		expect(statusLabelMaps[effect.record][effect.to]).toBeDefined();
		if (effect.from !== undefined) {
			expect(statusLabelMaps[effect.record][effect.from]).toBeDefined();
		}
	}
});

test.each(
	registry,
)("%s cross-references real commands in undo and next", (_id, disclosure) => {
	if (disclosure.undo.kind === "command") {
		expect(commandKeysByEntity[disclosure.undo.entity]).toContain(
			disclosure.undo.command,
		);
	}
	for (const option of disclosure.next) {
		expect(commandKeysByEntity[option.entity]).toContain(option.command);
	}
});

test("every applied code has a Spanish rendering, and every rendering is used", () => {
	const declared = new Set(
		registry.flatMap(([, disclosure]) => disclosure.appliedCodes ?? []),
	);

	expect([...declared].sort()).toEqual(Object.keys(appliedEffectLabels).sort());
});

test("an illegal transition would fail rule 2", () => {
	// The negative of the rule above: `received` is terminal for a shipment, so
	// nothing may leave it. If this ever passes, the guard has stopped guarding.
	expect(isLegalTransition(shipmentTransitions, "received", "inTransit")).toBe(
		false,
	);
});

test("a customer line naming an unpublished event would fail rule 4", () => {
	expect(COMMAND_EVENT_TYPES["package.promote"]).toEqual([]);
	expect(COMMAND_EVENT_TYPES["shipment.dispatch"]).not.toContain(
		"rollover.resolved",
	);
});

type ResolverCtx = { lots: number; quantity: string | null };

const resolverDisclosure: CommandDisclosure<ResolverCtx> = {
	effects: [
		{ kind: "creates", record: "shipment", count: () => 1 },
		{
			kind: "transition",
			record: "lot",
			from: "assembling",
			to: "requested",
			count: (ctx) => ctx.lots,
		},
		{ kind: "transition", record: "package", to: "cancelled", count: () => 2 },
		{ kind: "transition", record: "package", to: "received", count: () => 0 },
		{
			kind: "quantity",
			label: "Cantidad",
			quantity: (ctx) => ctx.quantity,
		},
		{
			kind: "customer",
			publishes: "supplier.cartItem.requested",
			count: () => 3,
			note: "{n} cliente(s) ven la etapa 4",
		},
	],
	demand: { moves: false, note: "No mueve demanda." },
	undo: { kind: "none", note: "No se deshace." },
	next: [
		{
			entity: "supplierOrder",
			command: "confirm",
			label: "Sólo cuando hay lotes",
			when: (ctx) => ctx.lots > 0,
		},
		{ entity: "supplierOrder", command: "cancel", label: "Si no, cancelar" },
	],
};

test("the resolver takes the first next option whose condition holds", () => {
	expect(
		resolveDisclosure(resolverDisclosure, { lots: 1, quantity: null })
			.nextLabel,
	).toBe("Sólo cuando hay lotes");
	expect(
		resolveDisclosure(resolverDisclosure, { lots: 0, quantity: null })
			.nextLabel,
	).toBe("Si no, cancelar");
});

test("the resolver renders singular, plural and from-less transitions", () => {
	const resolved = resolveDisclosure(resolverDisclosure, {
		lots: 1,
		quantity: "12.5000",
	});

	expect(resolved.lines.map((line) => line.text)).toEqual([
		"+ 1 envío",
		"1 lote: Armando → Solicitado",
		"2 paquetes → Cancelado",
		"Cantidad: 12.5000",
		"3 cliente(s) ven la etapa 4",
	]);
});

test("the resolver drops zero-count and empty-quantity lines", () => {
	const resolved = resolveDisclosure(resolverDisclosure, {
		lots: 0,
		quantity: "0",
	});

	expect(resolved.lines.map((line) => line.text)).toEqual([
		"+ 1 envío",
		"2 paquetes → Cancelado",
		"3 cliente(s) ven la etapa 4",
	]);
});

test("the resolver passes decimal quantities through untouched", () => {
	const resolved = resolveDisclosure(resolverDisclosure, {
		lots: 2,
		quantity: "0.0001",
	});

	expect(resolved.lines.map((line) => line.text)).toContain("Cantidad: 0.0001");
	expect(resolved.lines.map((line) => line.text)).toContain(
		"2 lotes: Armando → Solicitado",
	);
});
