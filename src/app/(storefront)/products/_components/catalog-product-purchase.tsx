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
	addLabel,
	disabled,
	inCartQuantity,
	product,
	showDiscount,
	onAdd,
	onViewInCart,
}: CatalogPurchaseHandlers & {
	addLabel?: string;
	disabled?: boolean;
	inCartQuantity: string | null;
	product: CatalogProductListItem;
	showDiscount?: boolean;
}) {
	const [quantity, setQuantity] = usePurchaseQuantity(product.terms);
	return (
		<PurchasePanel
			action={
				<PurchaseActionButton
					addLabel={addLabel}
					disabled={disabled}
					inCart={inCartQuantity !== null}
					onAdd={() => onAdd(product, quantity)}
					onViewInCart={onViewInCart}
				/>
			}
			disabled={disabled}
			inCartQuantity={inCartQuantity}
			onQuantityChange={setQuantity}
			presentation={product}
			quantity={quantity}
			showDiscount={showDiscount}
			terms={product.terms}
			unit={product.unit}
		/>
	);
}
