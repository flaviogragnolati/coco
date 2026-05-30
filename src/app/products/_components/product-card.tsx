"use client";

import { EyeIcon, ShoppingCartIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import { catalogProductToCartItem } from "~/features/cart/cart-mappers";
import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { ProductImage } from "./product-image";
import { ProductPriceBlock } from "./product-price-block";

type ProductCardProps = {
	cartItem?: CartItem;
	disabled?: boolean;
	product: CatalogProductListItem;
	onDetails: (productId: number) => void;
	onDecrement: (item: CartItem) => void;
	onIncrement: (item: CartItem) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
	onSetItem: (item: CartItem) => void;
};

export function ProductCard({
	cartItem,
	disabled,
	product,
	onDetails,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onSetItem,
}: ProductCardProps) {
	return (
		<Card className="overflow-hidden">
			<ProductImage
				className="flex aspect-[4/3] w-full items-center justify-center bg-center bg-cover bg-muted text-muted-foreground"
				imageUrl={product.imageUrl}
				name={product.name}
			/>
			<CardHeader>
				<CardTitle className="line-clamp-2">{product.name}</CardTitle>
				<CardDescription>
					{product.brand?.name ?? "Marca disponible proximamente"}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<p className="line-clamp-3 min-h-12 text-muted-foreground text-xs/relaxed">
					{product.description ??
						"Producto disponible para sumar demanda a una compra mayorista compartida."}
				</p>
				<ProductPriceBlock product={product} />
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				<div className="flex w-full items-center gap-2">
					<Button
						className="flex-1"
						onClick={() =>
							cartItem
								? onQuantityCommit(cartItem, cartItem.quantity)
								: onSetItem(catalogProductToCartItem(product))
						}
						type="button"
					>
						<ShoppingCartIcon data-icon="inline-start" />
						{cartItem ? "En carrito" : "Agregar"}
					</Button>
					<Button
						aria-label="Ver detalles"
						onClick={() => onDetails(product.id)}
						size="icon"
						type="button"
						variant="outline"
					>
						<EyeIcon />
					</Button>
				</div>
				{cartItem ? (
					<QuantityStepper
						disabled={disabled}
						onCommit={(quantity) => onQuantityCommit(cartItem, quantity)}
						onDecrement={() => onDecrement(cartItem)}
						onIncrement={() => onIncrement(cartItem)}
						terms={cartItem.terms}
						unit={cartItem.product.unit}
						value={cartItem.quantity}
					/>
				) : null}
			</CardFooter>
		</Card>
	);
}
