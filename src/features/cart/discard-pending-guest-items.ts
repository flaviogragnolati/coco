import { useCartStore } from "~/store/cart-store";

/**
 * The way out of a refused guest merge: drop the local-only items and reload,
 * so the bootstrap adopts the frozen server cart and its checkout can resume.
 */
export function discardPendingGuestItems() {
	useCartStore.getState().clear();
	window.location.reload();
}
