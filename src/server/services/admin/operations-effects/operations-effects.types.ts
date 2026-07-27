import type { Prisma } from "~/prisma/client";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import type { OperationsCartDetail } from "~/shared/common/admin-crud/operations-cart.types";

export type AdminOperationsMutationSource =
	| "cart"
	| "cartItem"
	| "lot"
	| "operation"
	| "package"
	| "shipment"
	| "supplierOrder"
	| "rollOver";

export type AdminOperationsEffectContext = {
	db: Prisma.TransactionClient;
	actor: AdminMutationActor;
	source: AdminOperationsMutationSource;
};

export type AdminOperationsEffectSummary = {
	handler: string;
	action: string;
	status: "skipped" | "completed";
	message: string;
};

export type AdminOperationsCartChangeSet = {
	cartId: number;
	before: OperationsCartDetail;
	after: OperationsCartDetail | null;
	changedItemIds?: number[];
	removedItemIds?: number[];
	addedItemIds?: number[];
};

export type AdminSupplierOrderLineChange = {
	lotId: number;
	lotItemId: number;
	allocations: Array<{
		cartItemId: number;
		cartId: number;
		quantity: string;
	}>;
};

export type AdminSupplierOrderRollOverChange = {
	rollOverId: number;
	operationId: number;
	cartItemId: number;
	cartId: number;
	quantity: string;
	reason: string;
};

export type AdminSupplierOrderChangeSet = {
	supplierOrderId: number;
	supplierOrderCode: string;
	operationId: number;
	requestedLines?: AdminSupplierOrderLineChange[];
	confirmedLines?: AdminSupplierOrderLineChange[];
	createdRollOvers?: AdminSupplierOrderRollOverChange[];
};

export type AdminSupplierOrderEffectHandler = {
	onSupplierOrderRequested: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onSupplierOrderConfirmed: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onSupplierOrderCancelled: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onSupplierOrderLineCancelled: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
};

/**
 * One package line and the demand it covers. `cartId` travels with each
 * allocation because every cart-item event payload carries it.
 */
export type AdminPackagedLineChange = {
	packageId: number;
	packageLotItemId: number;
	lotItemId: number;
	allocations: Array<{
		cartItemId: number;
		cartId: number;
		quantity: string;
	}>;
};

export type AdminShipmentChangeSet = {
	shipmentId: number;
	shipmentInternalCode: string;
	supplierOrderId?: number;
	/** Lines a dispatch registration just created. */
	packagedLines?: AdminPackagedLineChange[];
	/** Lines a departure, receipt or exception moved. */
	movedLines?: AdminPackagedLineChange[];
	createdRollOvers?: AdminSupplierOrderRollOverChange[];
	/** Set on the exception paths, where a reason is mandatory. */
	reason?: string;
	/** The exception status being recorded, so `delayed` and `failed` keys cannot collide. */
	exceptionStatus?: "delayed" | "failed";
	/** True when the shipment was `delayed` before being received, so the exception resolves. */
	resolvesException?: boolean;
};

export type AdminShipmentEffectHandler = {
	onDispatchRegistered: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onShipmentDispatched: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onShipmentReceived: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onShipmentDisrupted: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onShipmentRetried: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onEndUserDispatched: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onEndUserDelivered: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onPickupPointArrived: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
};

export type AdminPackageChangeSet = {
	packageId: number;
	packageName: string;
	/**
	 * The package's shipment, when it has one. Absent on depot pickup, which is
	 * exactly why the outbound event contract anchors on `packageId`.
	 */
	shipmentId?: number;
	writtenOffLines?: AdminPackagedLineChange[];
	/** Lines a fractionation just created on the outbound leg. */
	packagedLines?: AdminPackagedLineChange[];
	/** Lines a package-level exception affected, mirroring the shipment change set. */
	movedLines?: AdminPackagedLineChange[];
	createdRollOvers?: AdminSupplierOrderRollOverChange[];
	/** Mandatory on the write-off and exception paths, absent on fractionation. */
	reason?: string;
	/** The exception status being recorded, so `delayed` and `failed` keys cannot collide. */
	exceptionStatus?: "delayed" | "failed";
	/** True when the package was `delayed` before the command, so the exception resolves. */
	resolvesException?: boolean;
};

export type AdminPackageEffectHandler = {
	onPackageWrittenOff: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onPackageFractionated: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onPackageDisrupted: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onDeliveryConfirmed: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onPackageRecovered: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
};

export type AdminOperationChangeSet = {
	operationId: number;
	operationCode: string;
	reason: string;
	/** One entry per cart item whose demand the compensation returned to the pool. */
	excludedCartItems: Array<{
		cartItemId: number;
		cartId: number;
		quantity: string;
	}>;
};

export type AdminOperationEffectHandler = {
	onOperationCompensated: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
};

export type AdminRollOverChangeSet = {
	rollOverId: number;
	operationId: number;
	cartItemId: number;
	cartId: number;
	quantity: string;
	reason: string;
};

export type AdminRollOverEffectHandler = {
	onRollOverResolved: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminRollOverChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
};

export type AdminOperationsCartEffectHandler = {
	onCartUpdated: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onCartStatusChanged: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onCartItemsChanged: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
	onCartDeleted: (
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) => Promise<AdminOperationsEffectSummary[]>;
};
