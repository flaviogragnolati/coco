"use client";

import { Field, FieldLabel } from "~/components/ui/field";
import { Select } from "~/components/ui/select";

export type ProductSortValue =
	| "name-asc"
	| "name-desc"
	| "price-asc"
	| "price-desc";

export function ProductSortSelect({
	value,
	onChange,
}: {
	value: ProductSortValue;
	onChange: (value: ProductSortValue) => void;
}) {
	return (
		<Field className="min-w-52">
			<FieldLabel htmlFor="products-sort">Ordenar</FieldLabel>
			<Select
				id="products-sort"
				onChange={(event) => onChange(event.target.value as ProductSortValue)}
				value={value}
			>
				<option value="name-asc">Alfabetico A-Z</option>
				<option value="name-desc">Alfabetico Z-A</option>
				<option value="price-asc">Precio menor a mayor</option>
				<option value="price-desc">Precio mayor a menor</option>
			</Select>
		</Field>
	);
}
