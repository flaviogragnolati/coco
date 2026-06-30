"use client";

import { AlertCircleIcon, PackageSearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { catalogProductToCartItem } from "~/features/cart/cart-mappers";
import { useCartActions } from "~/features/cart/use-cart-sync";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import { useCartUiStore } from "~/store/cart-ui-store";
import { api } from "~/trpc/react";
import { CatalogActiveFilters } from "./catalog-active-filters";
import {
	computeBrandFacets,
	computeUnitFacets,
	filterCatalog,
	sortCatalog,
} from "./catalog-filtering";
import { CatalogFiltersSidebar } from "./catalog-filters-sidebar";
import { CatalogTable } from "./catalog-table";
import { CatalogToolbar } from "./catalog-toolbar";
import { ClientPagination } from "./client-pagination";
import { ProductDetailsDialog } from "./product-details-dialog";
import { ProductGrid } from "./product-grid";
import { useCatalogParams } from "./use-catalog-params";

const cardSkeletonKeys = ["a", "b", "c", "d", "e", "f"];
const tableSkeletonKeys = ["a", "b", "c", "d", "e", "f", "g", "h"];

function ProductGridSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
			{cardSkeletonKeys.map((key) => (
				<div
					className="flex flex-col gap-3 rounded-4xl bg-card p-4 shadow-md ring-1 ring-foreground/5"
					key={key}
				>
					<Skeleton className="aspect-4/3 w-full rounded-2xl" />
					<Skeleton className="h-5 w-2/3" />
					<Skeleton className="h-16 w-full rounded-2xl" />
					<Skeleton className="h-9 w-full rounded-3xl" />
				</div>
			))}
		</div>
	);
}

function CatalogTableSkeleton() {
	return (
		<div className="flex flex-col gap-2 rounded-3xl bg-card p-4 shadow-md ring-1 ring-foreground/5">
			{tableSkeletonKeys.map((key) => (
				<Skeleton className="h-12 w-full rounded-2xl" key={key} />
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
	const params = useCatalogParams();
	const { filters, sort, view, perPage } = params;
	const [selectedProductId, setSelectedProductId] = useState<number | null>(
		null,
	);
	const [filtersOpen, setFiltersOpen] = useState(false);

	const productsQuery = api.catalog.list.useQuery();
	const cartActions = useCartActions({ isAuthenticated, userId });
	const openMiniCart = useCartUiStore((state) => state.openMiniCart);

	const products = useMemo(
		() => productsQuery.data ?? [],
		[productsQuery.data],
	);

	const cartItems = cartActions.cart.items;
	const cartItemsByTermsId = useMemo(
		() => new Map(cartItems.map((item) => [item.productClientTermsId, item])),
		[cartItems],
	);
	const inCartTermsIds = useMemo(
		() => new Set(cartItems.map((item) => item.productClientTermsId)),
		[cartItems],
	);

	const brandFacets = useMemo(() => computeBrandFacets(products), [products]);
	const unitFacets = useMemo(() => computeUnitFacets(products), [products]);

	const filteredProducts = useMemo(
		() =>
			sortCatalog(
				filterCatalog(products, filters, { inCartTermsIds }),
				sort,
				filters.search,
			),
		[products, filters, sort, inCartTermsIds],
	);

	const total = filteredProducts.length;
	const pageCount = Math.max(1, Math.ceil(total / perPage));
	const page = Math.min(params.page, pageCount);
	const visibleProducts = filteredProducts.slice(
		(page - 1) * perPage,
		page * perPage,
	);

	// Keep the URL page within bounds once filters shrink the result set.
	useEffect(() => {
		if (!productsQuery.isLoading && params.page > pageCount) {
			params.setPage(pageCount);
		}
	}, [productsQuery.isLoading, params.page, pageCount, params.setPage]);

	const selectedCartItem =
		selectedProductId === null
			? undefined
			: cartItems.find((item) => item.product.id === selectedProductId);

	const handleAdd = (product: CatalogProductListItem) => {
		cartActions.setItem(catalogProductToCartItem(product));
		openMiniCart();
	};

	const sidebarProps = {
		brands: brandFacets,
		units: unitFacets,
		filters,
		onBrandIdsChange: params.setBrandIds,
		onUnitsChange: params.setUnits,
		onMinPriceChange: params.setMinPrice,
		onMaxPriceChange: params.setMaxPrice,
		onInCartOnlyChange: params.setInCartOnly,
		onReset: params.reset,
	};

	const gridProps = {
		cartItemsByTermsId,
		disabled: cartActions.isPending,
		onAdd: handleAdd,
		onDetails: setSelectedProductId,
		onDecrement: cartActions.decrement,
		onIncrement: cartActions.increment,
		onQuantityCommit: cartActions.updateQuantity,
		onRemove: cartActions.removeItem,
	};

	let content: React.ReactNode;
	if (productsQuery.isLoading) {
		content =
			view === "table" ? <CatalogTableSkeleton /> : <ProductGridSkeleton />;
	} else if (productsQuery.isError) {
		content = (
			<Alert variant="destructive">
				<AlertCircleIcon />
				<AlertTitle>No se pudo cargar el catálogo</AlertTitle>
				<AlertDescription>
					{productsQuery.error.message ||
						"Intentá nuevamente en unos instantes."}
				</AlertDescription>
			</Alert>
		);
	} else if (total === 0) {
		content = (
			<Empty className="border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<PackageSearchIcon />
					</EmptyMedia>
					<EmptyTitle>No hay productos para esos filtros</EmptyTitle>
					<EmptyDescription>
						Modificá la búsqueda, marca o rango de precios para ver más
						opciones.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={params.reset} type="button" variant="outline">
						Limpiar filtros
					</Button>
				</EmptyContent>
			</Empty>
		);
	} else {
		content = (
			<>
				{view === "table" ? (
					<CatalogTable products={visibleProducts} {...gridProps} />
				) : (
					<ProductGrid products={visibleProducts} {...gridProps} />
				)}
				<ClientPagination
					onPageChange={params.setPage}
					onPerPageChange={params.setPerPage}
					page={page}
					pageCount={pageCount}
					perPage={perPage}
					total={total}
				/>
			</>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<section className="flex flex-col gap-2">
				<span className="text-muted-foreground text-xs uppercase tracking-wide">
					Catálogo mayorista
				</span>
				<div className="flex max-w-3xl flex-col gap-2">
					<h1 className="font-heading font-semibold text-3xl tracking-normal">
						Productos disponibles
					</h1>
					<p className="text-muted-foreground text-sm/relaxed">
						Elegí productos, ajustá cantidades por MOQ y sumate a compras
						mayoristas compartidas.
					</p>
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:items-start">
				<aside className="hidden lg:sticky lg:top-20 lg:block">
					<CatalogFiltersSidebar idPrefix="desktop-filter" {...sidebarProps} />
				</aside>

				<div className="flex min-w-0 flex-col gap-4">
					<CatalogToolbar
						hasSearch={params.hasSearch}
						onOpenFilters={() => setFiltersOpen(true)}
						onSearchChange={params.setSearch}
						onSortChange={params.setSort}
						onViewChange={params.setView}
						search={params.searchInput}
						sort={sort}
						total={total}
						view={view}
					/>
					<CatalogActiveFilters
						brands={brandFacets}
						filters={filters}
						onClearAll={params.reset}
						onRemoveBrand={(id) =>
							params.setBrandIds(
								filters.brandIds.filter((brandId) => brandId !== id),
							)
						}
						onRemoveInCart={() => params.setInCartOnly(false)}
						onRemovePrice={() => params.setPriceRange("", "")}
						onRemoveSearch={() => params.setSearch("")}
						onRemoveUnit={(unit) =>
							params.setUnits(filters.units.filter((value) => value !== unit))
						}
					/>
					{content}
				</div>
			</div>

			<Sheet onOpenChange={setFiltersOpen} open={filtersOpen}>
				<SheetContent className="gap-0" side="left">
					<SheetHeader>
						<SheetTitle>Filtros</SheetTitle>
					</SheetHeader>
					<div className="flex-1 overflow-y-auto px-6 py-4">
						<CatalogFiltersSidebar idPrefix="mobile-filter" {...sidebarProps} />
					</div>
				</SheetContent>
			</Sheet>

			<ProductDetailsDialog
				cartItem={selectedCartItem}
				disabled={cartActions.isPending}
				onAdd={handleAdd}
				onDecrement={cartActions.decrement}
				onIncrement={cartActions.increment}
				onOpenChange={(open) => {
					if (!open) setSelectedProductId(null);
				}}
				onQuantityCommit={(item, quantity) =>
					cartActions.updateQuantity(item, quantity)
				}
				open={selectedProductId !== null}
				productId={selectedProductId}
			/>
		</main>
	);
}
