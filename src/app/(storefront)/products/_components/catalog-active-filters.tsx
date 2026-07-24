"use client";

import { XIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { CatalogProductUnit } from "~/shared/common/catalog.types";
import { productUnitLabelMap } from "~/shared/common/commerce.helpers";
import type { CatalogBrandFacet, CatalogFilters } from "./catalog-filtering";

type CatalogActiveFiltersProps = {
	filters: CatalogFilters;
	brands: CatalogBrandFacet[];
	onRemoveBrand: (id: number) => void;
	onRemoveUnit: (unit: CatalogProductUnit) => void;
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
	onRemoveBrand,
	onRemoveUnit,
	onRemoveSearch,
	onRemovePrice,
	onRemoveInCart,
	onClearAll,
}: CatalogActiveFiltersProps) {
	const hasActive =
		filters.search.trim().length > 0 ||
		filters.brandIds.length > 0 ||
		filters.units.length > 0 ||
		filters.minPrice !== "" ||
		filters.maxPrice !== "" ||
		filters.inCartOnly;

	if (!hasActive) return null;

	const brandLabel = (id: number) =>
		brands.find((brand) => brand.id === id)?.label ?? `Marca ${id}`;
	const price = priceLabel(filters);

	return (
		<div className="flex flex-wrap items-center gap-2">
			{filters.search.trim() ? (
				<FilterChip
					label={`Búsqueda: ${filters.search.trim()}`}
					onRemove={onRemoveSearch}
				/>
			) : null}
			{filters.brandIds.map((id) => (
				<FilterChip
					key={`brand-${id}`}
					label={brandLabel(id)}
					onRemove={() => onRemoveBrand(id)}
				/>
			))}
			{filters.units.map((unit) => (
				<FilterChip
					key={`unit-${unit}`}
					label={productUnitLabelMap[unit]}
					onRemove={() => onRemoveUnit(unit)}
				/>
			))}
			{price ? <FilterChip label={price} onRemove={onRemovePrice} /> : null}
			{filters.inCartOnly ? (
				<FilterChip label="Solo en carrito" onRemove={onRemoveInCart} />
			) : null}
			<Button onClick={onClearAll} size="xs" type="button" variant="ghost">
				Limpiar todo
			</Button>
		</div>
	);
}
