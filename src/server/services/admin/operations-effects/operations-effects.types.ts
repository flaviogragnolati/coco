import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import type { OperationsCartDetail } from "~/shared/common/admin-crud/operations-cart.types";
import type { Prisma } from "../../../../../generated/prisma/client";

export type AdminOperationsMutationSource =
	| "cart"
	| "cartItem"
	| "lot"
	| "package"
	| "shipment";

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
