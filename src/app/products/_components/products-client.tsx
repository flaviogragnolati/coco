"use client";

import { AlertCircleIcon, PackageSearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { Skeleton } from "~/components/ui/skeleton";
import { useCartActions } from "~/features/cart/use-cart-sync";
import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { getDisplayPrice, toNumber } from "~/shared/common/commerce.helpers";
import { api } from "~/trpc/react";
import { ClientPagination } from "./client-pagination";
import { ProductDetailsDialog } from "./product-details-dialog";
import { type ProductFilterState, ProductFilters } from "./product-filters";
import { ProductGrid } from "./product-grid";
import {
	ProductSortSelect,
	type ProductSortValue,
} from "./product-sort-select";

const pageSize = 9;

const defaultFilters: ProductFilterState = {
	brandId: "all",
	maxPrice: "",
	minPrice: "",
	search: "",
};

function normalizeSearch(value: string) {
	return value
		.trim()
		.toLocaleLowerCase("es")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");
}

function productMatchesSearch(product: CatalogProductListItem, search: string) {
	if (!search) return true;

	return normalizeSearch(
		[product.name, product.description ?? "", product.brand?.name ?? ""].join(
			" ",
		),
	).includes(search);
}

function productPrice(product: CatalogProductListItem) {
	return toNumber(getDisplayPrice(product.terms)) ?? 0;
}

function filterProducts(
	products: CatalogProductListItem[],
	filters: ProductFilterState,
) {
	const search = normalizeSearch(filters.search);
	const minPrice = toNumber(filters.minPrice);
	const maxPrice = toNumber(filters.maxPrice);

	return products.filter((product) => {
		const price = productPrice(product);

		return (
			(filters.brandId === "all" ||
				product.brand?.id === Number(filters.brandId)) &&
			productMatchesSearch(product, search) &&
			(minPrice === null || price >= minPrice) &&
			(maxPrice === null || price <= maxPrice)
		);
	});
}

function sortProducts(
	products: CatalogProductListItem[],
	sortValue: ProductSortValue,
) {
	return [...products].sort((left, right) => {
		switch (sortValue) {
			case "name-desc":
				return right.name.localeCompare(left.name, "es");
			case "price-asc":
				return productPrice(left) - productPrice(right);
			case "price-desc":
				return productPrice(right) - productPrice(left);
			default:
				return left.name.localeCompare(right.name, "es");
		}
	});
}

const skeletonKeys = ["first", "second", "third", "fourth", "fifth", "sixth"];

function ProductGridSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{skeletonKeys.map((key) => (
				<div className="flex flex-col gap-3 border p-3" key={key}>
					<Skeleton className="aspect-[4/3] w-full" />
					<Skeleton className="h-5 w-2/3" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			))}
		</div>
	);
}

export function ProductsClient({
	isAuthenticated,
	userId,
}: {
	isAuthenticated: boolean;
	userId: string | null;
}) {
	const [filters, setFilters] = useState(defaultFilters);
	const [sortValue, setSortValue] = useState<ProductSortValue>("name-asc");
	const [page, setPage] = useState(1);
	const [selectedProductId, setSelectedProductId] = useState<number | null>(
		null,
	);
	const productsQuery = api.catalog.list.useQuery();
	const cartActions = useCartActions({ isAuthenticated, userId });

	const products = productsQuery.data ?? [];
	const brands = useMemo(() => {
		const brandMap = new Map<number, string>();

		for (const product of products) {
			if (product.brand) brandMap.set(product.brand.id, product.brand.name);
		}

		return Array.from(brandMap.entries())
			.map(([id, name]) => ({ id, name }))
			.sort((left, right) => left.name.localeCompare(right.name, "es"));
	}, [products]);

	const filteredProducts = useMemo(
		() => sortProducts(filterProducts(products, filters), sortValue),
		[filters, products, sortValue],
	);
	const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
	const visibleProducts = filteredProducts.slice(
		(page - 1) * pageSize,
		page * pageSize,
	);
	const cartItemsByTermsId = useMemo(
		() =>
			new Map(
				cartActions.cart.items.map((item) => [item.productClientTermsId, item]),
			),
		[cartActions.cart.items],
	);
	const selectedCartItem =
		selectedProductId === null
			? undefined
			: cartActions.cart.items.find(
					(item) => item.product.id === selectedProductId,
				);

	const handleFiltersChange = (nextFilters: ProductFilterState) => {
		setFilters(nextFilters);
		setPage(1);
	};

	const handleSortChange = (nextSortValue: ProductSortValue) => {
		setSortValue(nextSortValue);
		setPage(1);
	};

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<section className="flex flex-col gap-2">
				<span className="text-muted-foreground text-xs uppercase tracking-wide">
					Catalogo mayorista
				</span>
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div className="flex max-w-3xl flex-col gap-2">
						<h1 className="font-heading font-semibold text-3xl tracking-normal">
							Productos disponibles
						</h1>
						<p className="text-muted-foreground text-sm/relaxed">
							Elegi productos, ajusta cantidades por MOQ y sumate a compras
							mayoristas compartidas.
						</p>
					</div>
					<ProductSortSelect onChange={handleSortChange} value={sortValue} />
				</div>
			</section>

			<ProductFilters
				brands={brands}
				filters={filters}
				onChange={handleFiltersChange}
				onReset={() => handleFiltersChange(defaultFilters)}
			/>

			{productsQuery.isLoading ? (
				<ProductGridSkeleton />
			) : productsQuery.isError ? (
				<Alert variant="destructive">
					<AlertCircleIcon />
					<AlertTitle>No se pudo cargar el catalogo</AlertTitle>
					<AlertDescription>
						{productsQuery.error.message ||
							"Intenta nuevamente en unos instantes."}
					</AlertDescription>
				</Alert>
			) : filteredProducts.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>No hay productos para esos filtros</EmptyTitle>
						<EmptyDescription>
							Modifica la busqueda, marca o rango de precios para ver mas
							opciones.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="flex items-center justify-between gap-3">
						<p className="text-muted-foreground text-xs">
							{filteredProducts.length} producto
							{filteredProducts.length === 1 ? "" : "s"} encontrado
							{filteredProducts.length === 1 ? "" : "s"}
						</p>
					</div>
					<ProductGrid
						cartItemsByTermsId={cartItemsByTermsId}
						disabled={cartActions.isPending}
						onDecrement={cartActions.decrement}
						onDetails={setSelectedProductId}
						onIncrement={cartActions.increment}
						onQuantityCommit={(item: CartItem, quantity) =>
							cartActions.updateQuantity(item, quantity)
						}
						onSetItem={cartActions.setItem}
						products={visibleProducts}
					/>
					<ClientPagination
						onPageChange={setPage}
						page={page}
						pageCount={pageCount}
					/>
				</>
			)}

			<ProductDetailsDialog
				cartItem={selectedCartItem}
				disabled={cartActions.isPending}
				onDecrement={cartActions.decrement}
				onIncrement={cartActions.increment}
				onOpenChange={(open) => {
					if (!open) setSelectedProductId(null);
				}}
				onQuantityCommit={(item, quantity) =>
					cartActions.updateQuantity(item, quantity)
				}
				onSetItem={cartActions.setItem}
				open={selectedProductId !== null}
				productId={selectedProductId}
			/>
		</main>
	);
}
