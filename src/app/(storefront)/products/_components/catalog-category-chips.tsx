"use client";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import type { CatalogCategoryChip } from "./catalog-filtering";

const allCategoriesValue = "all";

export function CatalogCategoryChips({
	chips,
	value,
	onChange,
}: {
	chips: CatalogCategoryChip[];
	value: number | null;
	onChange: (id: number | null) => void;
}) {
	if (chips.length === 0) return null;

	return (
		// Padding keeps the focus ring inside the scroll container's clip.
		<div className="-m-1 overflow-x-auto p-1">
			<ToggleGroup
				aria-label="Filtrar por categoría"
				onValueChange={(next) => {
					// Radix reports "" when the pressed chip is clicked again.
					onChange(next && next !== allCategoriesValue ? Number(next) : null);
				}}
				type="single"
				value={value === null ? allCategoriesValue : String(value)}
				variant="outline"
			>
				<ToggleGroupItem value={allCategoriesValue}>Todos</ToggleGroupItem>
				{chips.map((chip) => (
					<ToggleGroupItem key={chip.id} value={String(chip.id)}>
						{chip.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
