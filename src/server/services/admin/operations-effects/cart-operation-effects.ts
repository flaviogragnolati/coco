import type {
	AdminOperationsCartChangeSet,
	AdminOperationsCartEffectHandler,
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
} from "./operations-effects.types";

export class CartOperationEffects implements AdminOperationsCartEffectHandler {
	private skipped(action: string): AdminOperationsEffectSummary[] {
		return [
			{
				handler: "CartOperationEffects",
				action,
				status: "skipped",
				message: "V1 side effects are registered but not implemented yet.",
			},
		];
	}

	async onCartUpdated(
		_ctx: AdminOperationsEffectContext,
		_changeSet: AdminOperationsCartChangeSet,
	) {
		return this.skipped("cart.updated");
	}

	async onCartStatusChanged(
		_ctx: AdminOperationsEffectContext,
		_changeSet: AdminOperationsCartChangeSet,
	) {
		return this.skipped("cart.statusChanged");
	}

	async onCartItemsChanged(
		_ctx: AdminOperationsEffectContext,
		_changeSet: AdminOperationsCartChangeSet,
	) {
		return this.skipped("cart.itemsChanged");
	}

	async onCartDeleted(
		_ctx: AdminOperationsEffectContext,
		_changeSet: AdminOperationsCartChangeSet,
	) {
		return this.skipped("cart.deleted");
	}
}
