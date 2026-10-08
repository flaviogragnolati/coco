"use client";

import { Fragment, type ReactNode, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import type { CatalogProductUnit } from "~/shared/common/catalog.types";
import {
	getOfferUnitFilters,
	selectVisibleOffers,
} from "../home-offers-filter";

export type HomeOffersGridItem = {
	key: number;
	unit: CatalogProductUnit;
	card: ReactNode;
};

const allUnitsValue = "all";

/**
 * Cards arrive already rendered on the server; this island only decides which
 * of them the grid shows.
 */
export function HomeOffersGrid({
	items,
	visibleCount,
}: {
	items: HomeOffersGridItem[];
	visibleCount: number;
}) {
	const [selected, setSelected] = useState(allUnitsValue);
	const unitFilters = getOfferUnitFilters(items);
	const showFilters = unitFilters.length >= 2;
	const unitLabel = showFilters && selected !== allUnitsValue ? selected : null;
	const visibleItems = selectVisibleOffers(items, unitLabel, visibleCount);

	return (
		<div className="flex flex-col gap-5">
			{showFilters ? (
				<ToggleGroup
					aria-label="Filtrar ofertas por unidad"
					className="flex-wrap"
					onValueChange={(value) => {
						if (value) setSelected(value);
					}}
					type="single"
					value={selected}
					variant="outline"
				>
					<ToggleGroupItem value={allUnitsValue}>Todos</ToggleGroupItem>
					{unitFilters.map((label) => (
						<ToggleGroupItem key={label} value={label}>
							{label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			) : null}
			<div className="grid grid-cols-[repeat(auto-fill,minmax(min(255px,100%),1fr))] gap-5">
				{visibleItems.map((item) => (
					<Fragment key={item.key}>{item.card}</Fragment>
				))}
			</div>
		</div>
	);
}
