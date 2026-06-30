"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CatalogProductUnit } from "~/shared/common/catalog.types";
import type { CatalogFilters, CatalogSort } from "./catalog-filtering";

export type CatalogView = "cards" | "table";

export const PER_PAGE_OPTIONS = [12, 24, 48] as const;
const DEFAULT_PER_PAGE = 12;
const VIEW_STORAGE_KEY = "coco.catalog.view";
const SEARCH_DEBOUNCE_MS = 250;

const SORT_VALUES: CatalogSort[] = [
	"relevance",
	"name-asc",
	"name-desc",
	"price-asc",
	"price-desc",
	"newest",
];

const UNIT_VALUES: CatalogProductUnit[] = [
	"kg",
	"lb",
	"piece",
	"box",
	"gr",
	"other",
];

function parseCsvNumbers(value: string | null): number[] {
	if (!value) return [];
	return value
		.split(",")
		.map((part) => Number(part))
		.filter((part) => Number.isInteger(part) && part > 0);
}

function parseUnits(value: string | null): CatalogProductUnit[] {
	if (!value) return [];
	return value
		.split(",")
		.filter((part): part is CatalogProductUnit =>
			UNIT_VALUES.includes(part as CatalogProductUnit),
		);
}

function isSort(value: string | null): value is CatalogSort {
	return value !== null && SORT_VALUES.includes(value as CatalogSort);
}

export function useCatalogParams() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const searchParamsRef = useRef(searchParams);
	searchParamsRef.current = searchParams;

	const commit = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParamsRef.current.toString());
			for (const [key, value] of Object.entries(updates)) {
				if (value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, value);
				}
			}
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router],
	);

	const qParam = searchParams.get("q") ?? "";
	const hasSearch = qParam.trim().length > 0;

	// Local mirror of the search input; the URL `q` param stays the source of
	// truth, written through a debounce so typing does not spam history.
	const [searchInput, setSearchInput] = useState(qParam);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setSearchInput(qParam);
	}, [qParam]);

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const setSearch = useCallback(
		(value: string) => {
			setSearchInput(value);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				commit({ q: value.trim() ? value : null, page: null });
			}, SEARCH_DEBOUNCE_MS);
		},
		[commit],
	);

	const filters: CatalogFilters = useMemo(
		() => ({
			search: searchParams.get("q") ?? "",
			brandIds: parseCsvNumbers(searchParams.get("brand")),
			units: parseUnits(searchParams.get("unit")),
			minPrice: searchParams.get("min") ?? "",
			maxPrice: searchParams.get("max") ?? "",
			inCartOnly: searchParams.get("inCart") === "1",
		}),
		[searchParams],
	);

	const rawSort = searchParams.get("sort");
	const sort: CatalogSort = isSort(rawSort)
		? rawSort
		: hasSearch
			? "relevance"
			: "name-asc";
	const effectiveSort: CatalogSort =
		sort === "relevance" && !hasSearch ? "name-asc" : sort;

	const [storedView, setStoredView] = useState<CatalogView | null>(null);
	useEffect(() => {
		try {
			const value = localStorage.getItem(VIEW_STORAGE_KEY);
			if (value === "cards" || value === "table") setStoredView(value);
		} catch {
			// localStorage unavailable; fall back to default view.
		}
	}, []);

	const rawView = searchParams.get("view");
	const view: CatalogView =
		rawView === "cards" || rawView === "table"
			? rawView
			: (storedView ?? "cards");

	const rawPage = Number(searchParams.get("page"));
	const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

	const rawPerPage = Number(searchParams.get("perPage"));
	const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(rawPerPage)
		? rawPerPage
		: DEFAULT_PER_PAGE;

	const setBrandIds = useCallback(
		(ids: number[]) =>
			commit({ brand: ids.length ? ids.join(",") : null, page: null }),
		[commit],
	);
	const setUnits = useCallback(
		(units: CatalogProductUnit[]) =>
			commit({ unit: units.length ? units.join(",") : null, page: null }),
		[commit],
	);
	const setMinPrice = useCallback(
		(value: string) => commit({ min: value || null, page: null }),
		[commit],
	);
	const setMaxPrice = useCallback(
		(value: string) => commit({ max: value || null, page: null }),
		[commit],
	);
	const setPriceRange = useCallback(
		(min: string, max: string) =>
			commit({ min: min || null, max: max || null, page: null }),
		[commit],
	);
	const setInCartOnly = useCallback(
		(value: boolean) => commit({ inCart: value ? "1" : null, page: null }),
		[commit],
	);
	const setSort = useCallback(
		(next: CatalogSort) => commit({ sort: next, page: null }),
		[commit],
	);
	const setView = useCallback(
		(next: CatalogView) => {
			try {
				localStorage.setItem(VIEW_STORAGE_KEY, next);
			} catch {
				// ignore persistence failures
			}
			setStoredView(next);
			commit({ view: next });
		},
		[commit],
	);
	const setPage = useCallback(
		(next: number) => commit({ page: next > 1 ? String(next) : null }),
		[commit],
	);
	const setPerPage = useCallback(
		(next: number) =>
			commit({
				perPage: next === DEFAULT_PER_PAGE ? null : String(next),
				page: null,
			}),
		[commit],
	);

	const reset = useCallback(() => {
		setSearchInput("");
		if (debounceRef.current) clearTimeout(debounceRef.current);
		commit({
			q: null,
			brand: null,
			unit: null,
			min: null,
			max: null,
			inCart: null,
			sort: null,
			page: null,
		});
	}, [commit]);

	return {
		filters,
		searchInput,
		sort: effectiveSort,
		hasSearch,
		view,
		page,
		perPage,
		setSearch,
		setBrandIds,
		setUnits,
		setMinPrice,
		setMaxPrice,
		setPriceRange,
		setInCartOnly,
		setSort,
		setView,
		setPage,
		setPerPage,
		reset,
	};
}
