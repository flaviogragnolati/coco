"use client";

import { CheckIcon, EyeIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import { cn } from "~/lib/utils";
import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { ProductImage } from "./product-image";
import { ProductPriceBlock } from "./product-price-block";

type ProductCardProps = {
	cartItem?: CartItem;
	disabled?: boolean;
	product: CatalogProductListItem;
	onAdd: (product: CatalogProductListItem) => void;
	onDetails: (productId: number) => void;
	onDecrement: (item: CartItem) => void;
	onIncrement: (item: CartItem) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
	onRemove: (productClientTermsId: number) => void;
};

export function ProductCard({
	cartItem,
	disabled,
	product,
	onAdd,
	onDetails,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
}: ProductCardProps) {
	return (
		<Card
			className={cn(
				"overflow-hidden transition-shadow",
				cartItem && "ring-2 ring-success/40",
			)}
		>
			<ProductImage
				className="flex aspect-4/3 w-full items-center justify-center bg-center bg-cover bg-muted text-muted-foreground"
				imageUrl={product.imageUrl}
				name={product.name}
			/>
			<CardHeader>
				<CardTitle className="line-clamp-2">{product.name}</CardTitle>
				<CardDescription>
					{product.brand?.name ?? "Marca disponible próximamente"}
				</CardDescription>
				{cartItem ? (
					<CardAction>
						<Badge variant="success">
							<CheckIcon data-icon="inline-start" />
							En carrito
						</Badge>
					</CardAction>
				) : null}
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<p className="line-clamp-3 min-h-12 text-muted-foreground text-xs/relaxed">
					{product.description ??
						"Producto disponible para sumar demanda a una compra mayorista compartida."}
				</p>
				<ProductPriceBlock product={product} variant="card" />
			</CardContent>
			<CardFooter className="flex flex-col gap-3">
				{cartItem ? (
					<>
						<div className="flex w-full items-center justify-between gap-2">
							<QuantityStepper
								disabled={disabled}
								onCommit={(quantity) => onQuantityCommit(cartItem, quantity)}
								onDecrement={() => onDecrement(cartItem)}
								onIncrement={() => onIncrement(cartItem)}
								terms={cartItem.terms}
								unit={cartItem.product.unit}
								value={cartItem.quantity}
							/>
							<Button
								aria-label={`Quitar ${product.name}`}
								disabled={disabled}
								onClick={() => onRemove(cartItem.productClientTermsId)}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<Trash2Icon />
							</Button>
						</div>
						<div className="flex w-full items-center justify-between gap-2">
							<span className="text-muted-foreground text-xs">Subtotal</span>
							<span className="font-heading font-semibold">
								{formatCurrency(cartItem.lineTotal, cartItem.terms.currency)}
							</span>
						</div>
						<Button
							className="w-full"
							disabled={disabled}
							onClick={() => onDetails(product.id)}
							type="button"
							variant="outline"
						>
							<EyeIcon data-icon="inline-start" />
							Ver detalles
						</Button>
					</>
				) : (
					<div className="flex w-full items-center gap-2">
						<Button
							className="flex-1"
							disabled={disabled}
							onClick={() => onAdd(product)}
							type="button"
						>
							<ShoppingCartIcon data-icon="inline-start" />
							Agregar
						</Button>
						<Button
							aria-label="Ver detalles"
							disabled={disabled}
							onClick={() => onDetails(product.id)}
							size="icon"
							type="button"
							variant="outline"
						>
							<EyeIcon />
						</Button>
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
