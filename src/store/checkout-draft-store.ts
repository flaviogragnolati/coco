import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
	EMPTY_FINISH_DRAFT,
	type FinishDraft,
} from "~/features/checkout/finish-order";

/**
 * The delivery and payment the customer picked on the order page, kept for the
 * browser session so a reload or a trip to the catalog does not undo them. The
 * terms acceptance is never kept: it is given at the moment of confirming.
 * Bound to one user, so a shared browser never shows another person's choice.
 */
type CheckoutDraftState = {
	userId: string | null;
	draft: FinishDraft;
	updateDraft: (userId: string, patch: Partial<FinishDraft>) => void;
	clearDraft: () => void;
};

export const useCheckoutDraftStore = create<CheckoutDraftState>()(
	persist(
		(set) => ({
			userId: null,
			draft: EMPTY_FINISH_DRAFT,
			updateDraft: (userId, patch) =>
				set((state) => ({
					userId,
					draft: {
						...(state.userId === userId ? state.draft : EMPTY_FINISH_DRAFT),
						...patch,
					},
				})),
			clearDraft: () => set({ userId: null, draft: EMPTY_FINISH_DRAFT }),
		}),
		{
			name: "coco.checkout-draft.v1",
			storage: createJSONStorage(() => sessionStorage),
			partialize: ({ userId, draft }) => ({ userId, draft }),
		},
	),
);

/** The draft of `userId`, empty when the stored one belongs to someone else. */
export function useCheckoutDraft(userId: string) {
	return useCheckoutDraftStore((state) =>
		state.userId === userId ? state.draft : EMPTY_FINISH_DRAFT,
	);
}
