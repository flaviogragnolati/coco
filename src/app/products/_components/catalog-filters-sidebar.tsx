"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import type { CatalogProductUnit } from "~/shared/common/catalog.types";
import type {
	CatalogBrandFacet,
	CatalogFilters,
	CatalogUnitFacet,
} from "./catalog-filtering";
import { normalizeSearch } from "./catalog-filtering";

const BRAND_SEARCH_THRESHOLD = 8;

type CatalogFiltersSidebarProps = {
	brands: CatalogBrandFacet[];
	units: CatalogUnitFacet[];
	filters: CatalogFilters;
	idPrefix?: string;
	onBrandIdsChange: (ids: number[]) => void;
	onUnitsChange: (units: CatalogProductUnit[]) => void;
	onMinPriceChange: (value: string) => void;
	onMaxPriceChange: (value: string) => void;
	onInCartOnlyChange: (value: boolean) => void;
	onReset: () => void;
};

function FacetOption({
	checked,
	label,
	count,
	onToggle,
}: {
	checked: boolean;
	label: string;
	count: number;
	onToggle: () => void;
}) {
	return (
		<button
			aria-pressed={checked}
			className={cn(
				"flex w-full items-center justify-between gap-2 rounded-2xl px-2.5 py-1.5 text-left text-sm transition-colors",
				checked ? "bg-primary/10 text-foreground" : "hover:bg-muted",
			)}
			onClick={onToggle}
			type="button"
		>
			<span className="flex min-w-0 items-center gap-2">
				<span
					className={cn(
						"flex size-4 shrink-0 items-center justify-center rounded-md border",
						checked
							? "border-primary bg-primary text-primary-foreground"
							: "border-input",
					)}
				>
					{checked ? <CheckIcon className="size-3" /> : null}
				</span>
				<span className="truncate">{label}</span>
			</span>
			<span className="shrink-0 text-muted-foreground text-xs">{count}</span>
		</button>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
			{children}
		</span>
	);
}

export function CatalogFiltersSidebar({
	brands,
	units,
	filters,
	idPrefix = "catalog-filter",
	onBrandIdsChange,
	onUnitsChange,
	onMinPriceChange,
	onMaxPriceChange,
	onInCartOnlyChange,
	onReset,
}: CatalogFiltersSidebarProps) {
	const [brandQuery, setBrandQuery] = useState("");
	const minPriceId = `${idPrefix}-min-price`;
	const maxPriceId = `${idPrefix}-max-price`;
	const inCartId = `${idPrefix}-in-cart`;

	const hasActiveFilters =
		filters.brandIds.length > 0 ||
		filters.units.length > 0 ||
		filters.minPrice !== "" ||
		filters.maxPrice !== "" ||
		filters.inCartOnly;

	const normalizedBrandQuery = normalizeSearch(brandQuery);
	const visibleBrands = normalizedBrandQuery
		? brands.filter((brand) =>
				normalizeSearch(brand.label).includes(normalizedBrandQuery),
			)
		: brands;

	const toggleBrand = (id: number) => {
		onBrandIdsChange(
			filters.brandIds.includes(id)
				? filters.brandIds.filter((brandId) => brandId !== id)
				: [...filters.brandIds, id],
		);
	};

	const toggleUnit = (unit: CatalogProductUnit) => {
		onUnitsChange(
			filters.units.includes(unit)
				? filters.units.filter((value) => value !== unit)
				: [...filters.units, unit],
		);
	};

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between gap-2">
				<span className="font-heading font-medium text-sm">Filtros</span>
				{hasActiveFilters ? (
					<Button onClick={onReset} size="xs" type="button" variant="ghost">
						<XIcon data-icon="inline-start" />
						Limpiar
					</Button>
				) : null}
			</div>

			{brands.length > 0 ? (
				<div className="flex flex-col gap-2">
					<SectionTitle>Marca</SectionTitle>
					{brands.length > BRAND_SEARCH_THRESHOLD ? (
						<Input
							aria-label="Buscar marca"
							className="h-8"
							onChange={(event) => setBrandQuery(event.target.value)}
							placeholder="Buscar marca"
							value={brandQuery}
						/>
					) : null}
					<div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
						{visibleBrands.map((brand) => (
							<FacetOption
								checked={filters.brandIds.includes(brand.id)}
								count={brand.count}
								key={brand.id}
								label={brand.label}
								onToggle={() => toggleBrand(brand.id)}
							/>
						))}
						{visibleBrands.length === 0 ? (
							<span className="px-2.5 py-1.5 text-muted-foreground text-xs">
								Sin coincidencias
							</span>
						) : null}
					</div>
				</div>
			) : null}

			{units.length > 0 ? (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						<SectionTitle>Unidad</SectionTitle>
						<div className="flex flex-col gap-0.5">
							{units.map((unit) => (
								<FacetOption
									checked={filters.units.includes(unit.unit)}
									count={unit.count}
									key={unit.unit}
									label={unit.label}
									onToggle={() => toggleUnit(unit.unit)}
								/>
							))}
						</div>
					</div>
				</>
			) : null}

			<Separator />
			<div className="flex flex-col gap-2">
				<SectionTitle>Precio</SectionTitle>
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label
							className="text-muted-foreground text-xs"
							htmlFor={minPriceId}
						>
							Mín.
						</Label>
						<Input
							id={minPriceId}
							inputMode="decimal"
							onChange={(event) => onMinPriceChange(event.target.value)}
							placeholder="0"
							value={filters.minPrice}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label
							className="text-muted-foreground text-xs"
							htmlFor={maxPriceId}
						>
							Máx.
						</Label>
						<Input
							id={maxPriceId}
							inputMode="decimal"
							onChange={(event) => onMaxPriceChange(event.target.value)}
							placeholder="Sin límite"
							value={filters.maxPrice}
						/>
					</div>
				</div>
			</div>

			<Separator />
			<Label
				className="flex items-center justify-between gap-2"
				htmlFor={inCartId}
			>
				<span className="text-sm">Solo en carrito</span>
				<Switch
					checked={filters.inCartOnly}
					id={inCartId}
					onCheckedChange={onInCartOnlyChange}
				/>
			</Label>
		</div>
	);
}
