"use client";

import { useMemo } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import type { CatalogProductDetail } from "~/shared/common/catalog.types";
import { api } from "~/trpc/react";
import { selectSimilarProducts } from "./catalog-filtering";
import { ProductMiniCard } from "./product-mini-card";

type SimilarProductsSectionProps = {
	inCartTermsIds: Set<number>;
	product: CatalogProductDetail;
	onSelect: (productId: number) => void;
};

const skeletonKeys = ["a", "b", "c"];

export function SimilarProductsSection({
	inCartTermsIds,
	product,
	onSelect,
}: SimilarProductsSectionProps) {
	// Deduped by React Query against the query ProductsClient already issued, so
	// opening the dialog costs no extra request.
	const catalogQuery = api.catalog.list.useQuery();
	const catalog = catalogQuery.data;

	const similar = useMemo(
		() => (catalog ? selectSimilarProducts(catalog, product, 3) : []),
		[catalog, product],
	);

	if (catalogQuery.isLoading) {
		return (
			<div className="grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-3">
				{skeletonKeys.map((key) => (
					<Skeleton className="h-20 w-full rounded-2xl" key={key} />
				))}
			</div>
		);
	}

	// A failed or empty similars lookup stays silent: the customer opened the
	// dialog for the main product, not for this section.
	if (similar.length === 0) return null;

	return (
		<section className="flex flex-col gap-3 border-t pt-4">
			<h3 className="font-heading font-semibold text-sm">
				Productos similares
			</h3>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				{similar.map((candidate) => (
					<ProductMiniCard
						inCart={inCartTermsIds.has(candidate.terms.id)}
						key={candidate.id}
						onSelect={onSelect}
						product={candidate}
					/>
				))}
			</div>
		</section>
	);
}
