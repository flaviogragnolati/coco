"use client";

import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { CatalogSort } from "./catalog-filtering";
import { ProductSortSelect } from "./product-sort-select";

type CatalogToolbarProps = {
	search: string;
	hasSearch: boolean;
	sort: CatalogSort;
	total: number;
	onSearchChange: (value: string) => void;
	onSortChange: (sort: CatalogSort) => void;
	onOpenFilters: () => void;
};

export function CatalogToolbar({
	search,
	hasSearch,
	sort,
	total,
	onSearchChange,
	onSortChange,
	onOpenFilters,
}: CatalogToolbarProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-0 flex-1">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Buscar productos"
						className="pl-9"
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder="Buscar por nombre, marca o descripción"
						value={search}
					/>
					{search ? (
						<Button
							aria-label="Limpiar búsqueda"
							className="absolute top-1/2 right-1.5 -translate-y-1/2"
							onClick={() => onSearchChange("")}
							size="icon-xs"
							type="button"
							variant="ghost"
						>
							<XIcon />
						</Button>
					) : null}
				</div>
				<Button
					className="lg:hidden"
					onClick={onOpenFilters}
					type="button"
					variant="outline"
				>
					<SlidersHorizontalIcon data-icon="inline-start" />
					Filtros
				</Button>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-muted-foreground text-xs">
					{total} {total === 1 ? "producto" : "productos"}
				</p>
				<ProductSortSelect
					className="w-52"
					onChange={onSortChange}
					showRelevance={hasSearch}
					value={sort}
				/>
			</div>
		</div>
	);
}
