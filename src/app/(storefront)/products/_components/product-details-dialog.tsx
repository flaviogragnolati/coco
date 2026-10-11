"use client";

import { AlertCircleIcon, ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import { ProductImage } from "~/features/catalog/_components/product-image";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
	CatalogProductPurchase,
	type CatalogPurchaseHandlers,
} from "./catalog-product-purchase";
import { SimilarProductsSection } from "./similar-products-section";

type ProductDetailsDialogProps = CatalogPurchaseHandlers & {
	/** Quantities already in the order, by terms id. */
	cartQuantities: Map<number, string>;
	disabled?: boolean;
	open: boolean;
	productId: number | null;
	onDetails: (productId: number) => void;
	onOpenChange: (open: boolean) => void;
};

const thumbnailSkeletonKeys = ["a", "b", "c"];

export function ProductDetailsDialog({
	cartQuantities,
	disabled,
	open,
	productId,
	onAdd,
	onDetails,
	onOpenChange,
	onViewInCart,
}: ProductDetailsDialogProps) {
	const detailQuery = api.catalog.getProductDetail.useQuery(
		{ id: productId ?? 0 },
		{ enabled: open && productId !== null },
	);
	const product = detailQuery.data;

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
					{product?.brand ? (
						<p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
							{product.brand.name}
						</p>
					) : null}
					<DialogTitle className="font-semibold text-xl leading-snug">
						{product?.name ?? "Detalle de producto"}
					</DialogTitle>
					<DialogDescription>
						Información comercial vigente para sumarte a una compra mayorista
						compartida.
					</DialogDescription>
				</DialogHeader>

				<div
					className="-mx-1 flex min-h-0 flex-col gap-5 overflow-y-auto px-1"
					ref={bodyRef}
				>
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
									<CatalogProductPurchase
										disabled={disabled}
										inCartQuantity={
											cartQuantities.get(product.terms.id) ?? null
										}
										key={product.terms.id}
										onAdd={(selected, quantity) => {
											onAdd(selected, quantity);
											onOpenChange(false);
										}}
										onViewInCart={() => {
											onOpenChange(false);
											onViewInCart();
										}}
										product={product}
										showDiscount
									/>
								</div>
							</div>
							<SimilarProductsSection
								cartQuantities={cartQuantities}
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
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
