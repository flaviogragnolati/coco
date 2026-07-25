"use client";

import { useId } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Select } from "~/components/ui/select";

export const crudPageSizeOptions = [10, 25, 50, 100] as const;

export type CrudPageSize = (typeof crudPageSizeOptions)[number];

/**
 * Result counter plus page controls for the server-paginated admin lists. The
 * page-size select lives here rather than among the filters because it shapes
 * the result window, not the result set.
 *
 * `onPageSizeChange` is expected to reset the page to 1 — the bar does not do
 * it, so the owner keeps a single place where filter changes reset paging.
 */
export function CrudPaginationBar({
	page,
	pageCount,
	total,
	totalLabel,
	truncated,
	isLoading,
	pageSize,
	pageSizeOptions = crudPageSizeOptions,
	onPageChange,
	onPageSizeChange,
}: {
	page: number;
	pageCount: number;
	total: number;
	totalLabel: { singular: string; plural: string };
	truncated?: boolean;
	isLoading?: boolean;
	pageSize: number;
	pageSizeOptions?: readonly number[];
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
}) {
	const pageSizeId = useId();
	const resolvedPageCount = Math.max(pageCount, 1);

	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-sm">
					{isLoading
						? `Cargando ${totalLabel.plural}`
						: `${total} ${total === 1 ? totalLabel.singular : totalLabel.plural}`}
				</span>
				{truncated ? (
					<span className="text-muted-foreground text-xs">
						Resultados limitados a 1000.
					</span>
				) : null}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Field className="w-auto" orientation="horizontal">
					<FieldLabel
						className="text-muted-foreground text-xs"
						htmlFor={pageSizeId}
					>
						Por página
					</FieldLabel>
					<Select
						className="w-20"
						id={pageSizeId}
						onChange={(event) => onPageSizeChange(Number(event.target.value))}
						value={String(pageSize)}
					>
						{pageSizeOptions.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</Select>
				</Field>
				<Button
					disabled={page <= 1 || isLoading}
					onClick={() => onPageChange(Math.max(1, page - 1))}
					type="button"
					variant="outline"
				>
					Anterior
				</Button>
				<span className="text-sm">
					Página {page} de {resolvedPageCount}
				</span>
				<Button
					disabled={pageCount === 0 || page >= pageCount || isLoading}
					onClick={() => onPageChange(page + 1)}
					type="button"
					variant="outline"
				>
					Siguiente
				</Button>
			</div>
		</div>
	);
}
