"use client";

import { AlertTriangleIcon, ImageIcon } from "lucide-react";

import { CartItemRow } from "~/app/cart/_components/cart-item-row";
import { ProductCard } from "~/app/products/_components/product-card";
import { ProductImage } from "~/app/products/_components/product-image";
import { ProductPriceBlock } from "~/app/products/_components/product-price-block";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { FeaturedProductCard } from "~/features/home/_components/featured-product-card";
import type { ProductPreview } from "~/shared/common/admin-crud/product.types";
import type { CartItem } from "~/shared/common/cart.types";

type ProductPreviewDialogProps = {
	errorMessage?: string;
	isLoading?: boolean;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	preview?: ProductPreview;
};

const ignoreCartItem = (_item: CartItem) => undefined;
const ignoreCartQuantity = (_item: CartItem, _quantity: string) => undefined;
const ignoreProductId = (_productId: number) => undefined;
const ignoreRemove = (_productClientTermsId: number) => undefined;

function PreviewUnavailable({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex min-h-52 flex-col items-center justify-center gap-3 border bg-muted/30 p-6 text-center">
			<ImageIcon className="size-8 text-muted-foreground" />
			<div className="flex max-w-md flex-col gap-1">
				<p className="font-medium">{title}</p>
				<p className="text-muted-foreground text-sm/relaxed">{description}</p>
			</div>
		</div>
	);
}

function PreviewWarnings({ warnings }: { warnings: string[] }) {
	if (warnings.length === 0) return null;

	return (
		<div className="flex gap-3 border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
			<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
			<ul className="flex flex-col gap-1">
				{warnings.map((warning) => (
					<li key={warning}>{warning}</li>
				))}
			</ul>
		</div>
	);
}

function ProductDetailPreview({ preview }: { preview: ProductPreview }) {
	const { adminProduct, catalogProduct } = preview;
	const imageUrls = Array.from(
		new Set(
			[
				adminProduct.cardImageUrl,
				adminProduct.cartImageUrl,
				...adminProduct.images,
			].filter((url): url is string => Boolean(url)),
		),
	);

	return (
		<div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
			<div className="flex flex-col gap-3">
				<ProductImage
					className="flex aspect-[4/3] w-full items-center justify-center bg-center bg-cover bg-muted text-muted-foreground"
					imageUrl={
						catalogProduct?.imageUrl ??
						adminProduct.cardImageUrl ??
						adminProduct.cartImageUrl
					}
					name={adminProduct.name}
				/>
				{imageUrls.length > 1 ? (
					<div className="grid grid-cols-3 gap-2">
						{imageUrls.slice(0, 6).map((imageUrl) => (
							<ProductImage
								className="flex aspect-square items-center justify-center bg-center bg-cover bg-muted text-muted-foreground"
								imageUrl={imageUrl}
								key={imageUrl}
								name={adminProduct.name}
							/>
						))}
					</div>
				) : null}
			</div>

			<Card>
				<CardHeader>
					<div className="flex flex-wrap gap-2">
						<Badge variant={adminProduct.active ? "secondary" : "outline"}>
							{adminProduct.active ? "Activo" : "Inactivo"}
						</Badge>
						{adminProduct.deleted ? (
							<Badge variant="destructive">Eliminado</Badge>
						) : null}
					</div>
					<CardTitle>{adminProduct.name}</CardTitle>
					<CardDescription>
						{adminProduct.brand?.name ?? "Sin marca"}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<p className="text-muted-foreground text-sm/relaxed">
						{adminProduct.description ??
							"Producto sin descripción configurada en el catálogo."}
					</p>
					<div className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<p className="text-muted-foreground text-xs">Unidad</p>
							<p className="font-medium">{adminProduct.unit}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">
								Proveedor por defecto
							</p>
							<p className="font-medium">
								{adminProduct.defaultSupplier?.name ?? "Sin proveedor"}
							</p>
						</div>
					</div>
					{catalogProduct ? (
						<ProductPriceBlock product={catalogProduct} />
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}

export function ProductPreviewDialog({
	errorMessage,
	isLoading,
	onOpenChange,
	open,
	preview,
}: ProductPreviewDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Preview de producto</DialogTitle>
					<DialogDescription>
						Vista simulada del producto en los componentes públicos y de
						carrito.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="grid min-h-72 place-items-center border bg-muted/30 p-6 text-muted-foreground text-sm">
						Cargando preview...
					</div>
				) : errorMessage ? (
					<PreviewUnavailable
						description={errorMessage}
						title="No se pudo cargar el preview"
					/>
				) : preview ? (
					<div className="flex flex-col gap-4">
						<PreviewWarnings warnings={preview.warnings} />
						<Tabs defaultValue="card">
							<TabsList className="max-w-full overflow-x-auto" variant="line">
								<TabsTrigger value="card">Tarjeta</TabsTrigger>
								<TabsTrigger value="cart">Carrito</TabsTrigger>
								<TabsTrigger value="home">Home</TabsTrigger>
								<TabsTrigger value="detail">Detalle</TabsTrigger>
							</TabsList>
							<TabsContent value="card">
								{preview.catalogProduct ? (
									<div className="max-w-sm">
										<ProductCard
											cartItem={preview.cartItem ?? undefined}
											disabled
											onDecrement={ignoreCartItem}
											onDetails={ignoreProductId}
											onIncrement={ignoreCartItem}
											onQuantityCommit={ignoreCartQuantity}
											onSetItem={ignoreCartItem}
											product={preview.catalogProduct}
										/>
									</div>
								) : (
									<PreviewUnavailable
										description="La tarjeta pública necesita términos de cliente vigentes para mostrar precio y acciones."
										title="Tarjeta pública no disponible"
									/>
								)}
							</TabsContent>
							<TabsContent value="cart">
								{preview.cartItem ? (
									<CartItemRow
										disabled
										item={preview.cartItem}
										onDecrement={ignoreCartItem}
										onIncrement={ignoreCartItem}
										onQuantityCommit={ignoreCartQuantity}
										onRemove={ignoreRemove}
									/>
								) : (
									<PreviewUnavailable
										description="El carrito necesita términos de cliente vigentes para calcular cantidad mínima y subtotal."
										title="Preview de carrito no disponible"
									/>
								)}
							</TabsContent>
							<TabsContent value="home">
								{preview.featuredProduct ? (
									<div className="max-w-md">
										<FeaturedProductCard product={preview.featuredProduct} />
									</div>
								) : (
									<PreviewUnavailable
										description="La sección principal sólo muestra productos activos con términos vigentes."
										title="Preview de home no disponible"
									/>
								)}
							</TabsContent>
							<TabsContent value="detail">
								<ProductDetailPreview preview={preview} />
							</TabsContent>
						</Tabs>
					</div>
				) : (
					<PreviewUnavailable
						description="Seleccioná un producto desde el menú de acciones para revisar sus vistas."
						title="Sin producto seleccionado"
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
