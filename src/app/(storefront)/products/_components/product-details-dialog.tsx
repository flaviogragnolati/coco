"use client";

import {
	AlertCircleIcon,
	CheckIcon,
	ImageIcon,
	ShoppingCartIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { ProductImage } from "~/features/catalog/_components/product-image";
import { cn } from "~/lib/utils";
import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	formatCurrency,
	formatQuantity,
	productUnitLabelMap,
} from "~/shared/common/commerce.helpers";
import { api } from "~/trpc/react";
import { ProductPriceBlock } from "./product-price-block";
import { SimilarProductsSection } from "./similar-products-section";

type ProductDetailsDialogProps = {
	cartItem?: CartItem;
	disabled?: boolean;
	inCartTermsIds: Set<number>;
	open: boolean;
	productId: number | null;
	onAdd: (product: CatalogProductListItem) => void;
	onDecrement: (item: CartItem) => void;
	onDetails: (productId: number) => void;
	onIncrement: (item: CartItem) => void;
	onOpenChange: (open: boolean) => void;
	onQuantityCommit: (item: CartItem, quantity: string) => void;
	onRemove: (productClientTermsId: number) => void;
};

const thumbnailSkeletonKeys = ["a", "b", "c"];

export function ProductDetailsDialog({
	cartItem,
	disabled,
	inCartTermsIds,
	open,
	productId,
	onAdd,
	onDecrement,
	onDetails,
	onIncrement,
	onOpenChange,
	onQuantityCommit,
	onRemove,
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

	const bodyRef = useRef<HTMLDivElement>(null);
	const [activeImage, setActiveImage] = useState<string | null>(null);

	// The dialog stays mounted while the customer swaps products, so per-product
	// view state has to be dropped by hand.
	// biome-ignore lint/correctness/useExhaustiveDependencies: productId is the change this effect reacts to, not a value it reads.
	useEffect(() => {
		setActiveImage(null);
		bodyRef.current?.scrollTo({ top: 0 });
	}, [productId]);

	const galleryImages = product
		? Array.from(
				new Set(
					[product.imageUrl, ...product.images].filter(
						(imageUrl): imageUrl is string => imageUrl !== null,
					),
				),
			)
		: [];
	const mainImage = activeImage ?? galleryImages[0] ?? null;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="grid max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-[min(56rem,calc(100%-2rem))]">
				<DialogHeader className="pr-10">
					{product ? (
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">{product.terms.currency}</Badge>
							<Badge variant="outline">
								{productUnitLabelMap[product.unit]}
							</Badge>
							{product.terms.max ? (
								<Badge variant="outline">
									Máx {formatQuantity(product.terms.max, product.unit)}
								</Badge>
							) : null}
						</div>
					) : null}
					<DialogTitle className="font-semibold text-xl leading-snug">
						{product?.name ?? "Detalle de producto"}
					</DialogTitle>
					{product ? (
						<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
							{product.brand?.name ?? "Sin marca"}
							{activeCartItem ? (
								<Badge variant="success">
									<CheckIcon data-icon="inline-start" />
									En carrito
								</Badge>
							) : null}
						</div>
					) : null}
					<DialogDescription>
						Información comercial vigente para sumarte a una compra mayorista
						compartida.
					</DialogDescription>
				</DialogHeader>

				<div className="-mx-1 flex min-h-0 flex-col gap-5 overflow-y-auto px-1">
					{detailQuery.isLoading ? (
						<div className="grid gap-5 md:grid-cols-[18rem_1fr]">
							<div className="flex flex-col gap-3">
								<Skeleton className="aspect-4/3 w-full rounded-2xl" />
								<div className="grid grid-cols-3 gap-2">
									{thumbnailSkeletonKeys.map((key) => (
										<Skeleton
											className="aspect-square w-full rounded-xl"
											key={key}
										/>
									))}
								</div>
							</div>
							<div className="flex flex-col gap-4">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-28 w-full rounded-2xl" />
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
						<>
							<div className="grid gap-5 md:grid-cols-[18rem_1fr]">
								<div className="flex flex-col gap-3">
									<ProductImage
										className="flex aspect-4/3 w-full items-center justify-center rounded-2xl bg-center bg-cover bg-muted text-muted-foreground"
										imageUrl={mainImage}
										name={product.name}
									/>
									{galleryImages.length > 1 ? (
										<div className="grid grid-cols-3 gap-2">
											{galleryImages.slice(0, 6).map((imageUrl, index) => (
												<button
													aria-label={`Ver imagen ${index + 1} de ${product.name}`}
													className={cn(
														"overflow-hidden rounded-xl ring-1 ring-foreground/10 transition focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
														imageUrl === mainImage && "ring-2 ring-primary",
													)}
													key={imageUrl}
													onClick={() => setActiveImage(imageUrl)}
													type="button"
												>
													<ProductImage
														className="flex aspect-square w-full items-center justify-center bg-center bg-cover bg-muted text-muted-foreground"
														imageUrl={imageUrl}
														name={product.name}
													/>
												</button>
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
									<p className="text-muted-foreground text-sm/relaxed">
										{product.description ??
											"Producto disponible para pedidos mayoristas compartidos."}
									</p>
									<ProductPriceBlock product={product} variant="detail" />
									<div className="grid gap-2 rounded-2xl bg-card p-3 text-xs ring-1 ring-foreground/5 dark:ring-foreground/10">
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
										<div className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/5 dark:ring-foreground/10">
											<div className="flex items-center justify-between gap-2">
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
												<Button
													aria-label={`Quitar ${product.name}`}
													disabled={disabled}
													onClick={() =>
														onRemove(activeCartItem.productClientTermsId)
													}
													size="icon-sm"
													type="button"
													variant="ghost"
												>
													<Trash2Icon />
												</Button>
											</div>
											<div className="flex items-center justify-between gap-2">
												<span className="text-muted-foreground text-xs">
													Subtotal
												</span>
												<span className="font-heading font-semibold">
													{formatCurrency(
														activeCartItem.lineTotal,
														activeCartItem.terms.currency,
													)}
												</span>
											</div>
										</div>
									) : null}
								</div>
							</div>
							<SimilarProductsSection
								inCartTermsIds={inCartTermsIds}
								onSelect={onDetails}
								product={product}
							/>
						</>
					) : null}
				</div>

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
