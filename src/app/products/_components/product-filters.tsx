"use client";

import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";

export type ProductFilterState = {
	brandId: string;
	maxPrice: string;
	minPrice: string;
	search: string;
};

type ProductFiltersProps = {
	brands: Array<{ id: number; name: string }>;
	filters: ProductFilterState;
	onChange: (filters: ProductFilterState) => void;
	onReset: () => void;
};

export function ProductFilters({
	brands,
	filters,
	onChange,
	onReset,
}: ProductFiltersProps) {
	return (
		<div className="border bg-card p-3">
			<FieldGroup className="grid gap-3 md:grid-cols-[minmax(14rem,1.4fr)_minmax(10rem,1fr)_repeat(2,minmax(8rem,0.8fr))_auto] md:items-end">
				<Field>
					<FieldLabel htmlFor="products-search">Buscar</FieldLabel>
					<div className="relative">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-8"
							id="products-search"
							onChange={(event) =>
								onChange({ ...filters, search: event.target.value })
							}
							placeholder="Nombre del producto"
							value={filters.search}
						/>
					</div>
				</Field>
				<Field>
					<FieldLabel htmlFor="products-brand">Marca</FieldLabel>
					<Select
						id="products-brand"
						onChange={(event) =>
							onChange({ ...filters, brandId: event.target.value })
						}
						value={filters.brandId}
					>
						<option value="all">Todas</option>
						{brands.map((brand) => (
							<option key={brand.id} value={brand.id}>
								{brand.name}
							</option>
						))}
					</Select>
				</Field>
				<Field>
					<FieldLabel htmlFor="products-min-price">Precio min.</FieldLabel>
					<Input
						id="products-min-price"
						inputMode="decimal"
						onChange={(event) =>
							onChange({ ...filters, minPrice: event.target.value })
						}
						placeholder="0"
						value={filters.minPrice}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="products-max-price">Precio max.</FieldLabel>
					<Input
						id="products-max-price"
						inputMode="decimal"
						onChange={(event) =>
							onChange({ ...filters, maxPrice: event.target.value })
						}
						placeholder="Sin limite"
						value={filters.maxPrice}
					/>
				</Field>
				<Button onClick={onReset} type="button" variant="outline">
					<XIcon data-icon="inline-start" />
					Limpiar
				</Button>
			</FieldGroup>
		</div>
	);
}
