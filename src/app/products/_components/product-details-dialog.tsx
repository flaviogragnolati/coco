"use client";

import {
	AlertCircleIcon,
	CheckIcon,
	ImageIcon,
	ShoppingCartIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { formatQuantity } from "~/shared/common/commerce.helpers";
import { api } from "~/trpc/react";
import { ProductImage } from "./product-image";
import { ProductPriceBlock } from "./product-price-block";

type ProductDetailsDialogProps = {
	cartItem?: CartItem;
	disabled?: boolean;
	open: boolean;
	productId: number | null;
	onAdd: (product: CatalogProductListItem) => void;
	onDecrement: (item: CartItem) => void;
	onIncrement: (item: CartItem) => void;
	onOpenChange: (open: boolean) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
};

export function ProductDetailsDialog({
	cartItem,
	disabled,
	open,
	productId,
	onAdd,
	onDecrement,
	onIncrement,
	onOpenChange,
	onQuantityCommit,
}: ProductDetailsDialogProps) {
	const detailQuery = api.catalog.getProductDetail.useQuery(
		{ id: productId ?? 0 },
		{ enabled: open && productId !== null },
	);
	const product = detailQuery.data;
	const activeCartItem =
		product && cartItem?.productClientTermsId === product.terms.id
			? cartItem
			: undefined;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[min(56rem,calc(100%-2rem))]">
				<DialogHeader>
					<DialogTitle>{product?.name ?? "Detalle de producto"}</DialogTitle>
					<DialogDescription>
						Información comercial vigente para sumarte a una compra mayorista
						compartida.
					</DialogDescription>
				</DialogHeader>

				{detailQuery.isLoading ? (
					<div className="grid gap-4 md:grid-cols-[18rem_1fr]">
						<Skeleton className="aspect-4/3 w-full rounded-2xl" />
						<div className="flex flex-col gap-3">
							<Skeleton className="h-8 w-2/3" />
							<Skeleton className="h-20 w-full rounded-2xl" />
							<Skeleton className="h-24 w-full rounded-2xl" />
						</div>
					</div>
				) : detailQuery.isError ? (
					<Alert variant="destructive">
						<AlertCircleIcon />
						<AlertTitle>No se pudo cargar el producto</AlertTitle>
						<AlertDescription>
							{detailQuery.error.message ||
								"Intentá abrir el detalle otra vez."}
						</AlertDescription>
					</Alert>
				) : product ? (
					<div className="grid gap-5 md:grid-cols-[18rem_1fr]">
						<div className="flex flex-col gap-3">
							<ProductImage
								className="flex aspect-4/3 w-full items-center justify-center rounded-2xl bg-center bg-cover bg-muted text-muted-foreground"
								imageUrl={product.imageUrl}
								name={product.name}
							/>
							{product.images.length > 0 ? (
								<div className="grid grid-cols-3 gap-2">
									{product.images.slice(0, 6).map((imageUrl) => (
										<ProductImage
											className="flex aspect-square w-full items-center justify-center rounded-xl bg-center bg-cover bg-muted text-muted-foreground"
											imageUrl={imageUrl}
											key={imageUrl}
											name={product.name}
										/>
									))}
								</div>
							) : (
								<div className="flex items-center gap-2 text-muted-foreground text-xs">
									<ImageIcon />
									Sin galería adicional
								</div>
							)}
						</div>
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-1">
								<span className="flex items-center gap-2 text-muted-foreground text-xs">
									{product.brand?.name ?? "Sin marca"}
									{activeCartItem ? (
										<Badge variant="success">
											<CheckIcon data-icon="inline-start" />
											En carrito
										</Badge>
									) : null}
								</span>
								<h2 className="font-heading font-semibold text-xl">
									{product.name}
								</h2>
								<p className="text-muted-foreground text-sm/relaxed">
									{product.description ??
										"Producto disponible para pedidos mayoristas compartidos."}
								</p>
							</div>
							<ProductPriceBlock product={product} variant="detail" />
							<div className="grid gap-2 rounded-2xl bg-muted/40 p-3 text-xs">
								<div className="flex items-center justify-between gap-3">
									<span className="text-muted-foreground">MOQ</span>
									<span className="font-medium">
										{formatQuantity(product.terms.moq, product.unit)}
									</span>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-muted-foreground">Step</span>
									<span className="font-medium">
										{product.terms.step
											? formatQuantity(product.terms.step, product.unit)
											: "Sin incrementos"}
									</span>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-muted-foreground">Máximo</span>
									<span className="font-medium">
										{product.terms.max
											? formatQuantity(product.terms.max, product.unit)
											: "Sin máximo"}
									</span>
								</div>
							</div>
							{activeCartItem ? (
								<QuantityStepper
									disabled={disabled}
									onCommit={(quantity) =>
										onQuantityCommit(activeCartItem, quantity)
									}
									onDecrement={() => onDecrement(activeCartItem)}
									onIncrement={() => onIncrement(activeCartItem)}
									terms={activeCartItem.terms}
									unit={activeCartItem.product.unit}
									value={activeCartItem.quantity}
								/>
							) : null}
						</div>
					</div>
				) : null}

				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cerrar
					</Button>
					{product && !activeCartItem ? (
						<Button
							disabled={disabled}
							onClick={() => {
								onAdd(product);
								onOpenChange(false);
							}}
							type="button"
						>
							<ShoppingCartIcon data-icon="inline-start" />
							Agregar al carrito
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
