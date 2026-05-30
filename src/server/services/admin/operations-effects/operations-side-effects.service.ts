import { CartOperationEffects } from "./cart-operation-effects";
import type {
	AdminOperationsCartChangeSet,
	AdminOperationsCartEffectHandler,
	AdminOperationsEffectContext,
	AdminOperationsEffectSummary,
} from "./operations-effects.types";

export class AdminOperationsSideEffects {
	constructor(
		private readonly cartHandlers: AdminOperationsCartEffectHandler[] = [
			new CartOperationEffects(),
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
}
