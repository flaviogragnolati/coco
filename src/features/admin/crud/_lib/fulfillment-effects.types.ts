import type { DomainEventType } from "~/shared/common/domain-events.types";
import type {
	LifecycleCommandKey,
	LifecycleEntityKey,
} from "~/shared/common/fulfillment-command-events";

/**
 * The vocabulary an effect disclosure is written in. Effects are **data, not
 * prose**: a transition is a `(record, from, to)` triple checked against
 * `fulfillment-transitions.ts` and a customer-facing effect names a
 * `DomainEventType` checked against what the command's builders emit, so a ladder
 * or event change breaks `fulfillment-effects.test.ts` instead of leaving a
 * dialog lying (CONTEXT.md, "Effect disclosure").
 *
 * `TCtx` is the entity's detail plus whatever the dialog's own form or selection
 * contributes. A `count` reading a field that does not exist fails compilation —
 * that type parameter is the point of the module.
 */
export type EffectRecordKey =
	| "operation"
	| "lot"
	| "lotItem"
	| "supplierOrder"
	| "rollOver"
	| "shipment"
	| "package"
	| "packageLine"
	| "cartItem";

export type EffectLineKind =
	| "creates"
	| "deletes"
	| "transition"
	| "quantity"
	| "customer"
	| "note";

export type EffectLine<TCtx> =
	| {
			kind: "creates";
			record: EffectRecordKey;
			count: (ctx: TCtx) => number;
			/** Appended in parentheses; use it for the *why*, never to restate the count. */
			note?: string;
	  }
	| {
			/**
			 * A row that goes away. Only `operation.delete` uses it — everywhere else
			 * the lifecycle moves statuses and deletes nothing (architecture §15 #11),
			 * so a second use is a signal that something is wrong, not a new pattern.
			 */
			kind: "deletes";
			record: EffectRecordKey;
			count: (ctx: TCtx) => number;
			note?: string;
	  }
	| {
			kind: "transition";
			record: EffectRecordKey;
			/** Omitted when the command reaches its target from more than one status. */
			from?: string;
			to: string;
			count: (ctx: TCtx) => number;
	  }
	| {
			kind: "quantity";
			label: string;
			/** A decimal string, passed through untouched — never `Number()`. */
			quantity: (ctx: TCtx) => string | null;
	  }
	| {
			kind: "customer";
			publishes: DomainEventType;
			count: (ctx: TCtx) => number;
			/** Spanish, in the customer's terms. `{n}` interpolates the count. */
			note: string;
	  }
	| {
			/**
			 * A counted effect that is neither a create nor a status move: a package
			 * changing which shipment holds it, a cascade the server decides on data
			 * the dialog cannot see. Nothing here is checkable, so reach for it only
			 * when the alternative is staying silent about something real.
			 */
			kind: "note";
			count: (ctx: TCtx) => number;
			/** `{n}` interpolates the count. */
			text: string;
	  };

export type DisclosureDetailRow = { label: string; value: string };

export type DisclosureUndo =
	| { kind: "none"; note: string }
	| {
			kind: "command";
			entity: LifecycleEntityKey;
			command: string;
			note: string;
	  };

/**
 * What the operator does next. A list rather than a single value so a
 * mode-dependent command can declare both follow-ups and still have every command
 * reference checked statically; the resolver takes the first whose `when` holds.
 */
export type DisclosureNextOption<TCtx> = {
	entity: LifecycleEntityKey;
	command: string;
	label: string;
	when?: (ctx: TCtx) => boolean;
};

export type CommandDisclosure<TCtx> = {
	effects: EffectLine<TCtx>[];
	demand: { moves: boolean; note: string };
	undo: DisclosureUndo;
	next: DisclosureNextOption<TCtx>[];
	/** The nominal rows behind "Ver detalle": which customers, which items. */
	detail?: (ctx: TCtx) => DisclosureDetailRow[];
	/**
	 * The codes this command's `applied` summary may carry. Present only on the
	 * commands whose outcome the admin's own quantities decide.
	 */
	appliedCodes?: readonly string[];
};

/** Render-ready: the panel receives this and computes nothing. */
export type ResolvedDisclosure = {
	lines: Array<{ icon: EffectLineKind; text: string }>;
	demandNote: string;
	undoNote: string;
	nextLabel: string | null;
	detail: DisclosureDetailRow[];
};

export type EntityDisclosures<E extends LifecycleEntityKey, TCtx> = Record<
	LifecycleCommandKey<E>,
	CommandDisclosure<TCtx>
>;
