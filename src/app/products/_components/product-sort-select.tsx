"use client";

import { Select } from "~/components/ui/select";
import type { CatalogSort } from "./catalog-filtering";

export function ProductSortSelect({
	value,
	onChange,
	showRelevance = false,
	id = "products-sort",
	className,
}: {
	value: CatalogSort;
	onChange: (value: CatalogSort) => void;
	showRelevance?: boolean;
	id?: string;
	className?: string;
}) {
	return (
		<Select
			aria-label="Ordenar"
			className={className}
			id={id}
			onChange={(event) => onChange(event.target.value as CatalogSort)}
			value={value}
		>
			{showRelevance ? <option value="relevance">Relevancia</option> : null}
			<option value="name-asc">Alfabético A-Z</option>
			<option value="name-desc">Alfabético Z-A</option>
			<option value="price-asc">Precio menor a mayor</option>
			<option value="price-desc">Precio mayor a menor</option>
			<option value="newest">Recién agregados</option>
		</Select>
	);
}
