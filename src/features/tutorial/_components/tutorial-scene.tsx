import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import type { TutorialScene as TutorialSceneState } from "~/features/tutorial/tutorial-script";
import { CartScene } from "./scenes/cart-scene";
import { CatalogScene } from "./scenes/catalog-scene";
import { CheckoutResultScene } from "./scenes/checkout-result-scene";
import { CheckoutScene } from "./scenes/checkout-scene";
import { HomeScene } from "./scenes/home-scene";
import { MyOrdersScene } from "./scenes/my-orders-scene";
import { OrderDetailScene } from "./scenes/order-detail-scene";

export function TutorialScene({
	scene,
	fixtures,
}: {
	scene: TutorialSceneState;
	fixtures: TutorialFixtures;
}) {
	switch (scene.id) {
		case "home":
			return <HomeScene />;
		case "catalog":
			return <CatalogScene added={scene.added} fixtures={fixtures} />;
		case "cart":
			return <CartScene fixtures={fixtures} />;
		case "checkout":
			return <CheckoutScene fixtures={fixtures} step={scene.step} />;
		case "checkoutResult":
			return <CheckoutResultScene fixtures={fixtures} />;
		case "myOrders":
			return <MyOrdersScene fixtures={fixtures} />;
		case "orderDetail":
			return <OrderDetailScene fixtures={fixtures} journey={scene.journey} />;
	}
}

/** What the simulated navbar shows: a guest until checkout, an empty order after paying. */
export function navbarStateFor(
	scene: TutorialSceneState,
	fixtures: TutorialFixtures,
) {
	switch (scene.id) {
		case "home":
			return { cartCount: 0, signedIn: false };
		case "catalog":
			return {
				cartCount: scene.added ? fixtures.cartAfterFirstAdd.itemCount : 0,
				signedIn: false,
			};
		case "cart":
			return { cartCount: fixtures.cart.itemCount, signedIn: false };
		case "checkout":
			return {
				cartCount: fixtures.checkoutState.cart.itemCount,
				signedIn: true,
			};
		default:
			return { cartCount: 0, signedIn: true };
	}
}
