"use client";

import {
	PurchaseActionButton,
	PurchasePanel,
	usePurchaseQuantity,
} from "~/features/catalog/_components/purchase-panel";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";

export type CatalogPurchaseHandlers = {
	onAdd: (product: CatalogProductListItem, quantity: string) => void;
	onViewInCart: () => void;
};

/** Key it by the terms id: the selection belongs to one set of terms. */
export function CatalogProductPurchase({
	disabled,
	inCartQuantity,
	product,
	showDiscount,
	size,
	onAdd,
	onViewInCart,
}: CatalogPurchaseHandlers & {
	disabled?: boolean;
	inCartQuantity: string | null;
	product: CatalogProductListItem;
	showDiscount?: boolean;
	size?: "compact" | "default";
}) {
	const [quantity, setQuantity] = usePurchaseQuantity(product.terms);
	return (
		<PurchasePanel
			action={
				<PurchaseActionButton
					disabled={disabled}
					inCart={inCartQuantity !== null}
					onAdd={() => onAdd(product, quantity)}
					onViewInCart={onViewInCart}
					size={size}
				/>
			}
			disabled={disabled}
			inCartQuantity={inCartQuantity}
			onQuantityChange={setQuantity}
			presentation={product}
			quantity={quantity}
			showDiscount={showDiscount}
			size={size}
			terms={product.terms}
			unit={product.unit}
		/>
	);
}
