import { CartOperationEffects } from "./cart-operation-effects";
import { OperationEffects } from "./operation-effects";
import type {
	AdminOperationChangeSet,
	AdminOperationEffectHandler,
	AdminOperationsCartChangeSet,
	AdminOperationsCartEffectHandler,
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
	AdminPackageChangeSet,
	AdminPackageEffectHandler,
	AdminRollOverChangeSet,
	AdminRollOverEffectHandler,
	AdminShipmentChangeSet,
	AdminShipmentEffectHandler,
	AdminSupplierOrderChangeSet,
	AdminSupplierOrderEffectHandler,
} from "./operations-effects.types";
import { PackageEffects } from "./package-effects";
import { RollOverEffects } from "./roll-over-effects";
import { ShipmentEffects } from "./shipment-effects";
import { SupplierOrderEffects } from "./supplier-order-effects";

export class AdminOperationsSideEffects {
	// Every parameter stays defaulted: each service instantiates this at module
	// level with no arguments.
	constructor(
		private readonly cartHandlers: AdminOperationsCartEffectHandler[] = [
			new CartOperationEffects(),
		],
		private readonly supplierOrderHandlers: AdminSupplierOrderEffectHandler[] = [
			new SupplierOrderEffects(),
		],
		private readonly rollOverHandlers: AdminRollOverEffectHandler[] = [
			new RollOverEffects(),
		],
		private readonly operationHandlers: AdminOperationEffectHandler[] = [
			new OperationEffects(),
		],
		private readonly shipmentHandlers: AdminShipmentEffectHandler[] = [
			new ShipmentEffects(),
		],
		private readonly packageHandlers: AdminPackageEffectHandler[] = [
			new PackageEffects(),
		],
	) {}

	private async runCartHandlers(
		method: keyof AdminOperationsCartEffectHandler,
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	): Promise<AdminOperationsEffectSummary[]> {
		const summaries = await Promise.all(
			this.cartHandlers.map((handler) => handler[method](ctx, changeSet)),
		);

		return summaries.flat();
	}

	private async runSupplierOrderHandlers(
		method: keyof AdminSupplierOrderEffectHandler,
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	): Promise<AdminOperationsEffectSummary[]> {
		const summaries = await Promise.all(
			this.supplierOrderHandlers.map((handler) =>
				handler[method](ctx, changeSet),
			),
		);

		return summaries.flat();
	}

	private async runRollOverHandlers(
		method: keyof AdminRollOverEffectHandler,
		ctx: AdminOperationsEffectContext,
		changeSet: AdminRollOverChangeSet,
	): Promise<AdminOperationsEffectSummary[]> {
		const summaries = await Promise.all(
			this.rollOverHandlers.map((handler) => handler[method](ctx, changeSet)),
		);

		return summaries.flat();
	}

	private async runShipmentHandlers(
		method: keyof AdminShipmentEffectHandler,
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	): Promise<AdminOperationsEffectSummary[]> {
		const summaries = await Promise.all(
			this.shipmentHandlers.map((handler) => handler[method](ctx, changeSet)),
		);

		return summaries.flat();
	}

	private async runPackageHandlers(
		method: keyof AdminPackageEffectHandler,
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	): Promise<AdminOperationsEffectSummary[]> {
		const summaries = await Promise.all(
			this.packageHandlers.map((handler) => handler[method](ctx, changeSet)),
		);

		return summaries.flat();
	}

	onCartUpdated(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) {
		return this.runCartHandlers("onCartUpdated", ctx, changeSet);
	}

	onCartStatusChanged(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) {
		return this.runCartHandlers("onCartStatusChanged", ctx, changeSet);
	}

	onCartItemsChanged(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) {
		return this.runCartHandlers("onCartItemsChanged", ctx, changeSet);
	}

	onCartDeleted(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationsCartChangeSet,
	) {
		return this.runCartHandlers("onCartDeleted", ctx, changeSet);
	}

	onSupplierOrderRequested(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return this.runSupplierOrderHandlers(
			"onSupplierOrderRequested",
			ctx,
			changeSet,
		);
	}

	onSupplierOrderConfirmed(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return this.runSupplierOrderHandlers(
			"onSupplierOrderConfirmed",
			ctx,
			changeSet,
		);
	}

	onSupplierOrderCancelled(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return this.runSupplierOrderHandlers(
			"onSupplierOrderCancelled",
			ctx,
			changeSet,
		);
	}

	onSupplierOrderLineCancelled(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminSupplierOrderChangeSet,
	) {
		return this.runSupplierOrderHandlers(
			"onSupplierOrderLineCancelled",
			ctx,
			changeSet,
		);
	}

	onRollOverResolved(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminRollOverChangeSet,
	) {
		return this.runRollOverHandlers("onRollOverResolved", ctx, changeSet);
	}

	onDispatchRegistered(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onDispatchRegistered", ctx, changeSet);
	}

	onShipmentDispatched(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onShipmentDispatched", ctx, changeSet);
	}

	onShipmentReceived(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onShipmentReceived", ctx, changeSet);
	}

	onShipmentDisrupted(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onShipmentDisrupted", ctx, changeSet);
	}

	onShipmentRetried(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onShipmentRetried", ctx, changeSet);
	}

	onEndUserDispatched(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onEndUserDispatched", ctx, changeSet);
	}

	onEndUserDelivered(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onEndUserDelivered", ctx, changeSet);
	}

	onPickupPointArrived(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminShipmentChangeSet,
	) {
		return this.runShipmentHandlers("onPickupPointArrived", ctx, changeSet);
	}

	onPackageWrittenOff(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		return this.runPackageHandlers("onPackageWrittenOff", ctx, changeSet);
	}

	onPackageFractionated(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		return this.runPackageHandlers("onPackageFractionated", ctx, changeSet);
	}

	onPackageDisrupted(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		return this.runPackageHandlers("onPackageDisrupted", ctx, changeSet);
	}

	onDeliveryConfirmed(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		return this.runPackageHandlers("onDeliveryConfirmed", ctx, changeSet);
	}

	onPackageRecovered(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminPackageChangeSet,
	) {
		return this.runPackageHandlers("onPackageRecovered", ctx, changeSet);
	}

	async onOperationCompensated(
		ctx: AdminOperationsEffectContext,
		changeSet: AdminOperationChangeSet,
	): Promise<AdminOperationsEffectSummary[]> {
		const summaries = await Promise.all(
			this.operationHandlers.map((handler) =>
				handler.onOperationCompensated(ctx, changeSet),
			),
		);

		return summaries.flat();
	}
}
