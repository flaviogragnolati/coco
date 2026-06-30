"use client";

import { CheckIcon, EyeIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import { cn } from "~/lib/utils";
import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	formatCurrency,
	formatQuantity,
	productUnitLabelMap,
} from "~/shared/common/commerce.helpers";
import { ProductImage } from "./product-image";
import { ProductPriceBlock } from "./product-price-block";

type CatalogTableProps = {
	products: CatalogProductListItem[];
	cartItemsByTermsId: Map<number, CartItem>;
	disabled?: boolean;
	onAdd: (product: CatalogProductListItem) => void;
	onDetails: (productId: number) => void;
	onDecrement: (item: CartItem) => void;
	onIncrement: (item: CartItem) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
	onRemove: (productClientTermsId: number) => void;
};

const headClassName = "sticky top-0 z-10 bg-background";

export function CatalogTable({
	products,
	cartItemsByTermsId,
	disabled,
	onAdd,
	onDetails,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
}: CatalogTableProps) {
	return (
		<div className="overflow-hidden rounded-3xl bg-card shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className={cn(headClassName, "w-12")} />
						<TableHead className={headClassName}>Producto</TableHead>
						<TableHead className={headClassName}>Precio</TableHead>
						<TableHead className={headClassName}>MOQ</TableHead>
						<TableHead className={headClassName}>Cantidad</TableHead>
						<TableHead className={cn(headClassName, "text-right")}>
							Subtotal
						</TableHead>
						<TableHead className={cn(headClassName, "text-right")}>
							Acciones
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{products.map((product) => {
						const cartItem = cartItemsByTermsId.get(product.terms.id);
						return (
							<TableRow
								className={cn(cartItem && "bg-success/5 hover:bg-success/10")}
								key={product.id}
							>
								<TableCell>
									<ProductImage
										className="flex aspect-square w-12 items-center justify-center rounded-xl bg-center bg-cover bg-muted text-muted-foreground"
										imageUrl={product.imageUrl}
										name={product.name}
									/>
								</TableCell>
								<TableCell className="whitespace-normal">
									<div className="flex min-w-0 flex-col gap-0.5">
										<span className="flex items-center gap-2 font-medium">
											{product.name}
											{cartItem ? (
												<Badge variant="success">
													<CheckIcon data-icon="inline-start" />
													En carrito
												</Badge>
											) : null}
										</span>
										<span className="text-muted-foreground text-xs">
											{product.brand?.name ?? "Sin marca"} ·{" "}
											{productUnitLabelMap[product.unit]}
										</span>
									</div>
								</TableCell>
								<TableCell>
									<ProductPriceBlock product={product} variant="table" />
								</TableCell>
								<TableCell>
									<Badge variant="info">
										{formatQuantity(product.terms.moq, product.unit)}
									</Badge>
								</TableCell>
								<TableCell>
									{cartItem ? (
										<QuantityStepper
											disabled={disabled}
											onCommit={(quantity) =>
												onQuantityCommit(cartItem, quantity)
											}
											onDecrement={() => onDecrement(cartItem)}
											onIncrement={() => onIncrement(cartItem)}
											terms={cartItem.terms}
											unit={cartItem.product.unit}
											value={cartItem.quantity}
										/>
									) : (
										<Button
											disabled={disabled}
											onClick={() => onAdd(product)}
											size="sm"
											type="button"
										>
											<ShoppingCartIcon data-icon="inline-start" />
											Agregar
										</Button>
									)}
								</TableCell>
								<TableCell className="text-right font-medium">
									{cartItem
										? formatCurrency(
												cartItem.lineTotal,
												cartItem.terms.currency,
											)
										: "—"}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Button
											aria-label={`Ver detalles de ${product.name}`}
											disabled={disabled}
											onClick={() => onDetails(product.id)}
											size="icon-sm"
											type="button"
											variant="outline"
										>
											<EyeIcon />
										</Button>
										{cartItem ? (
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
										) : null}
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
