/**
 * Which domain events each fulfillment lifecycle command publishes. The
 * counterpart of `fulfillment-transitions.ts`: that module says what a command
 * may do to a *status*, this one says what it tells the *customer*.
 *
 * Pure data with no runtime dependency, like its sibling, so a client bundle can
 * consume it. `fulfillment-effects.test.ts` (server side) asserts every non-empty
 * entry against the pure event builders, which is what keeps this honest.
 */

import type { DomainEventType } from "./domain-events.types";
import type {
	PackageCommandKey,
	ShipmentCommandKey,
	SupplierOrderCommandKey,
} from "./fulfillment-transitions";

export type LifecycleEntityKey =
	| "operation"
	| "rollOver"
	| "supplierOrder"
	| "shipment"
	| "package";

/**
 * `createDraft` and `createEndUser` widen the ladder unions deliberately: a
 * creation is a command an operator runs and a disclosure has to cover, but it
 * has no `from` status, so `*AvailableActions` never had a key for it.
 */
export type OperationLifecycleCommandKey =
	| "createDraft"
	| "execute"
	| "cancel"
	| "rerun"
	| "delete";

export type RollOverLifecycleCommandKey = "resolve";

export type ShipmentLifecycleCommandKey = ShipmentCommandKey | "createEndUser";

export type LifecycleCommandKey<E extends LifecycleEntityKey> =
	E extends "operation"
		? OperationLifecycleCommandKey
		: E extends "rollOver"
			? RollOverLifecycleCommandKey
			: E extends "supplierOrder"
				? SupplierOrderCommandKey
				: E extends "shipment"
					? ShipmentLifecycleCommandKey
					: E extends "package"
						? PackageCommandKey
						: never;

export type LifecycleCommandId = {
	[E in LifecycleEntityKey]: `${E}.${LifecycleCommandKey<E>}`;
}[LifecycleEntityKey];

/**
 * Read off the effects handlers, command by command. An empty list is a
 * statement, not an omission: creating a draft, creating an end-user shipment and
 * adding packages to one publish nothing because nothing moved (architecture §8).
 *
 * `shipment.deliver` carries the **union** of both delivery modes: a home
 * delivery publishes `shipment.endUser.delivered`, a pickup-point arrival
 * publishes `shipment.endUser.arrivedAtPickupPoint`, and the disclosure picks by
 * mode. Collapsing them would let a pickup-point dialog claim a handover that did
 * not happen.
 */
export const COMMAND_EVENT_TYPES: Record<
	LifecycleCommandId,
	readonly DomainEventType[]
> = {
	// A draft materializes nothing, and deleting one (or a childless failed run)
	// removes a row nothing ever derived from.
	"operation.createDraft": [],
	"operation.execute": [
		"operation.cartItem.included",
		"operation.cartItem.allocatedToLotItem",
		"rollover.preAllocation.created",
	],
	"operation.cancel": ["operation.cartItem.excluded"],
	// A re-run compensates (when its source is `completed`) and then executes.
	"operation.rerun": [
		"operation.cartItem.excluded",
		"operation.cartItem.included",
		"operation.cartItem.allocatedToLotItem",
		"rollover.preAllocation.created",
	],
	"operation.delete": [],

	"rollOver.resolve": ["rollover.resolved"],

	"supplierOrder.request": ["supplier.cartItem.requested"],
	"supplierOrder.confirm": [
		"supplier.lotItem.confirmed",
		"rollover.postAllocation.created",
	],
	"supplierOrder.registerDispatch": ["package.cartItem.packaged"],
	"supplierOrder.cancel": ["rollover.postAllocation.created"],
	"supplierOrder.cancelLine": ["rollover.postAllocation.created"],

	"shipment.createEndUser": [],
	"shipment.addPackages": [],
	// The two legs publish different facts; `dispatch` serves both.
	"shipment.dispatch": [
		"shipment.internal.dispatched",
		"shipment.endUser.dispatched",
	],
	"shipment.receive": [
		"shipment.internal.received",
		"rollover.postAllocation.created",
		"fulfillment.exception.resolved",
	],
	"shipment.deliver": [
		"shipment.endUser.delivered",
		"shipment.endUser.arrivedAtPickupPoint",
		"fulfillment.exception.resolved",
	],
	"shipment.markDelayed": ["fulfillment.exception.created"],
	"shipment.markFailed": ["fulfillment.exception.created"],
	"shipment.retry": ["fulfillment.exception.resolved"],

	"package.fractionate": ["package.cartItem.packaged"],
	// Promotion keeps the package id, so `package.cartItem.packaged` would dedupe
	// into silence against the one `registerDispatch` already published.
	"package.promote": [],
	// A split moves quantity between packages the same customer already owns; no
	// fact about the goods changed.
	"package.split": [],
	"package.writeOff": [
		"rollover.postAllocation.created",
		"fulfillment.exception.resolved",
	],
	"package.confirmDelivery": [
		"shipment.endUser.delivered",
		"fulfillment.exception.resolved",
	],
	"package.recover": ["fulfillment.exception.resolved"],
	"package.markDelayed": ["fulfillment.exception.created"],
	"package.markFailed": ["fulfillment.exception.created"],
};

export const lifecycleCommandIds = Object.keys(
	COMMAND_EVENT_TYPES,
) as LifecycleCommandId[];
