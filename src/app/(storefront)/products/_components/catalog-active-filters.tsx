"use client";

import { XIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type {
	CatalogBrandFacet,
	CatalogCategoryChip,
	CatalogFilters,
} from "./catalog-filtering";

type CatalogActiveFiltersProps = {
	filters: CatalogFilters;
	brands: CatalogBrandFacet[];
	categories: CatalogCategoryChip[];
	onRemoveCategory: () => void;
	onRemoveBrand: (id: number) => void;
	onRemoveSearch: () => void;
	onRemovePrice: () => void;
	onRemoveInCart: () => void;
	onClearAll: () => void;
};

function FilterChip({
	label,
	onRemove,
}: {
	label: string;
	onRemove: () => void;
}) {
	return (
		<Badge className="gap-1 pr-1" variant="secondary">
			<span className="truncate">{label}</span>
			<button
				aria-label={`Quitar ${label}`}
				className="flex size-4 items-center justify-center rounded-full hover:bg-foreground/10"
				onClick={onRemove}
				type="button"
			>
				<XIcon className="size-3" />
			</button>
		</Badge>
	);
}

function priceLabel(filters: CatalogFilters): string | null {
	if (filters.minPrice && filters.maxPrice) {
		return `Precio ${filters.minPrice}–${filters.maxPrice}`;
	}
	if (filters.minPrice) return `Desde ${filters.minPrice}`;
	if (filters.maxPrice) return `Hasta ${filters.maxPrice}`;
	return null;
}

export function CatalogActiveFilters({
	filters,
	brands,
	categories,
	onRemoveCategory,
	onRemoveBrand,
	onRemoveSearch,
	onRemovePrice,
	onRemoveInCart,
	onClearAll,
}: CatalogActiveFiltersProps) {
	const hasActive =
		filters.search.trim().length > 0 ||
		filters.categoryId !== null ||
		filters.brandIds.length > 0 ||
		filters.minPrice !== "" ||
		filters.maxPrice !== "" ||
		filters.inCartOnly;

	if (!hasActive) return null;

	const brandLabel = (id: number) =>
		brands.find((brand) => brand.id === id)?.label ?? `Marca ${id}`;
	const category = categories.find((chip) => chip.id === filters.categoryId);
	const price = priceLabel(filters);

	return (
		<div className="flex flex-wrap items-center gap-2">
			{filters.search.trim() ? (
				<FilterChip
					label={`Búsqueda: ${filters.search.trim()}`}
					onRemove={onRemoveSearch}
				/>
			) : null}
			{category ? (
				<FilterChip label={category.label} onRemove={onRemoveCategory} />
			) : null}
			{filters.brandIds.map((id) => (
				<FilterChip
					key={`brand-${id}`}
					label={brandLabel(id)}
					onRemove={() => onRemoveBrand(id)}
				/>
			))}
			{price ? <FilterChip label={price} onRemove={onRemovePrice} /> : null}
			{filters.inCartOnly ? (
				<FilterChip label="Solo en mi pedido" onRemove={onRemoveInCart} />
			) : null}
			<Button onClick={onClearAll} size="xs" type="button" variant="ghost">
				Limpiar todo
			</Button>
		</div>
	);
}
