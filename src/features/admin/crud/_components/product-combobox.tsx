"use client";

import { useMemo } from "react";

import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import type { ProductListItem } from "~/shared/common/admin-crud/product.types";

export function ProductCombobox({
	products,
	value,
	onChange,
	currentProductId,
	disabled,
	invalid,
	id,
}: {
	products: ProductListItem[];
	value: number;
	onChange: (productId: number) => void;
	currentProductId?: number;
	disabled?: boolean;
	invalid?: boolean;
	id?: string;
}) {
	const options = useMemo<ComboboxOption[]>(
		() =>
			products.map((product) => ({
				value: String(product.id),
				label: `${product.name}${product.deleted ? " (eliminado)" : ""}`,
				disabled: product.deleted && product.id !== currentProductId,
			})),
		[products, currentProductId],
	);

	return (
		<Combobox
			disabled={disabled}
			emptyText="Sin resultados"
			id={id}
			invalid={invalid}
			onChange={(next) => onChange(Number(next))}
			options={options}
			placeholder="Seleccionar producto"
			searchPlaceholder="Buscar producto..."
			value={value === 0 ? null : String(value)}
		/>
	);
}
