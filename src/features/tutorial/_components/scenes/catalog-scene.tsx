"use client";

import { useCallback } from "react";

import { CatalogCategoryChips } from "~/app/(storefront)/products/_components/catalog-category-chips";
import {
	computeBrandFacets,
	computeCategoryChips,
	emptyCatalogFilters,
	sortCatalog,
} from "~/app/(storefront)/products/_components/catalog-filtering";
import { CatalogFiltersSidebar } from "~/app/(storefront)/products/_components/catalog-filters-sidebar";
import { CatalogToolbar } from "~/app/(storefront)/products/_components/catalog-toolbar";
import { ProductCard } from "~/app/(storefront)/products/_components/product-card";
import { CartSheetView } from "~/features/cart/_components/cart-sheet-view";
import {
	TUTORIAL_TRANSFER_DISCOUNT_PERCENT,
	type TutorialFixtures,
} from "~/features/tutorial/tutorial-fixtures";
import {
	TUTORIAL_TARGET_ATTRIBUTE,
	tutorialTarget,
} from "~/features/tutorial/tutorial-script";
import { noop } from "./noop";

/**
 * `ProductCard` has no slot for the purchase block, so the scene tags the
 * card's content region after it renders; the real card stays untouched.
 */
function useTagPurchaseBlock() {
	return useCallback((node: HTMLDivElement | null) => {
		node
			?.querySelector('[data-slot="card-content"]')
			?.setAttribute(TUTORIAL_TARGET_ATTRIBUTE, "product-purchase");
	}, []);
}

export function CatalogScene({
	added,
	fixtures,
}: {
	added: boolean;
	fixtures: TutorialFixtures;
}) {
	const tagPurchaseBlock = useTagPurchaseBlock();
	const products = sortCatalog(fixtures.catalogProducts, "name-asc", "");
	const featured = fixtures.featuredProduct;
	const filters = emptyCatalogFilters;
	const sidebarProps = {
		brands: computeBrandFacets(products),
		filters,
		onBrandIdsChange: noop,
		onMinPriceChange: noop,
		onMaxPriceChange: noop,
		onInCartOnlyChange: noop,
		onReset: noop,
	};
	const featuredInCart = added
		? (fixtures.cartAfterFirstAdd.items[0]?.quantity ?? null)
		: null;

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<section className="flex flex-col gap-2">
				<div className="flex max-w-3xl flex-col gap-2">
					<h1 className="font-heading font-semibold text-3xl tracking-normal">
						Productos disponibles
					</h1>
					<p className="text-muted-foreground text-sm/relaxed">
						Elegí lo que necesitás y sumalo a tu pedido de la semana.
					</p>
					<p className="text-muted-foreground text-sm/relaxed">
						Seleccionamos productos de primera calidad.
					</p>
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:items-start">
				<aside className="hidden lg:sticky lg:top-20 lg:block">
					<CatalogFiltersSidebar idPrefix="desktop-filter" {...sidebarProps} />
				</aside>

				<div className="flex min-w-0 flex-col gap-4">
					<div
						className="flex flex-col gap-4"
						{...tutorialTarget("catalog-categories")}
					>
						<CatalogToolbar
							hasSearch={false}
							onOpenFilters={noop}
							onSearchChange={noop}
							onSortChange={noop}
							search=""
							sort="relevance"
							total={products.length}
						/>
						<CatalogCategoryChips
							chips={computeCategoryChips(products)}
							onChange={noop}
							value={null}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{products.map((product) => {
							const card = (
								<ProductCard
									inCartQuantity={
										product.id === featured.id ? featuredInCart : null
									}
									key={product.id}
									onAdd={noop}
									onDetails={noop}
									onViewInCart={noop}
									product={product}
								/>
							);
							return product.id === featured.id ? (
								<div
									className="contents"
									key={product.id}
									ref={tagPurchaseBlock}
									{...tutorialTarget("product-card")}
								>
									{card}
								</div>
							) : (
								card
							);
						})}
					</div>
				</div>
			</div>

			{added ? (
				<CartSheetView
					cart={fixtures.cartAfterFirstAdd}
					hasHydrated
					inert
					isAuthenticated={false}
					isPending={false}
					mergeBlocked={false}
					modal={false}
					onDecrement={noop}
					onIncrement={noop}
					onNavigate={noop}
					onOpenChange={noop}
					onQuantityCommit={noop}
					onRemove={noop}
					open
					targets={{ content: tutorialTarget("mini-cart") }}
					transferDiscountPercent={TUTORIAL_TRANSFER_DISCOUNT_PERCENT}
				/>
			) : null}
		</main>
	);
}
