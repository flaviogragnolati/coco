"use client";

import { ArrowUpDownIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { CrudSortDirection } from "~/shared/common/admin-crud/crud.types";

/**
 * Single-button date sort, mirroring the storefront my-orders toggle: it shows
 * the direction currently applied and flips to the other one on click.
 * Stateless — the owning list holds `sortDirection` and feeds it back.
 */
export function CrudSortToggle({
	value,
	onChange,
	recentLabel = "Más recientes",
	oldestLabel = "Más antiguos",
}: {
	value: CrudSortDirection;
	onChange: (value: CrudSortDirection) => void;
	recentLabel?: string;
	oldestLabel?: string;
}) {
	return (
		<Button
			aria-pressed={value === "asc"}
			onClick={() => onChange(value === "desc" ? "asc" : "desc")}
			size="sm"
			type="button"
			variant="ghost"
		>
			<ArrowUpDownIcon data-icon="inline-start" />
			{value === "desc" ? recentLabel : oldestLabel}
		</Button>
	);
}
