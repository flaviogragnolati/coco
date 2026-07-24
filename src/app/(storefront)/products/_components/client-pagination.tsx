"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Select } from "~/components/ui/select";
import { PER_PAGE_OPTIONS } from "./use-catalog-params";

type PageItem = number | "ellipsis-left" | "ellipsis-right";

function getPageItems(page: number, pageCount: number): PageItem[] {
	if (pageCount <= 7) {
		return Array.from({ length: pageCount }, (_, index) => index + 1);
	}

	const items: PageItem[] = [1];
	const left = Math.max(2, page - 1);
	const right = Math.min(pageCount - 1, page + 1);

	if (left > 2) items.push("ellipsis-left");
	for (let current = left; current <= right; current += 1) items.push(current);
	if (right < pageCount - 1) items.push("ellipsis-right");
	items.push(pageCount);

	return items;
}

export function ClientPagination({
	page,
	pageCount,
	perPage,
	total,
	onPageChange,
	onPerPageChange,
}: {
	page: number;
	pageCount: number;
	perPage: number;
	total: number;
	onPageChange: (page: number) => void;
	onPerPageChange: (perPage: number) => void;
}) {
	if (total === 0) return null;

	const rangeStart = (page - 1) * perPage + 1;
	const rangeEnd = Math.min(page * perPage, total);

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center gap-4">
				<p className="text-muted-foreground text-xs">
					{rangeStart}–{rangeEnd} de {total}
				</p>
				<Field className="flex-row items-center gap-2" orientation="horizontal">
					<FieldLabel
						className="whitespace-nowrap text-muted-foreground text-xs"
						htmlFor="catalog-per-page"
					>
						Por página
					</FieldLabel>
					<Select
						className="w-20"
						id="catalog-per-page"
						onChange={(event) => onPerPageChange(Number(event.target.value))}
						value={String(perPage)}
					>
						{PER_PAGE_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</Select>
				</Field>
			</div>

			{pageCount > 1 ? (
				<div className="flex items-center gap-1">
					<Button
						aria-label="Página anterior"
						disabled={page <= 1}
						onClick={() => onPageChange(page - 1)}
						size="icon-sm"
						type="button"
						variant="outline"
					>
						<ChevronLeftIcon />
					</Button>
					{getPageItems(page, pageCount).map((item) =>
						typeof item === "number" ? (
							<Button
								aria-current={item === page ? "page" : undefined}
								aria-label={`Página ${item}`}
								key={item}
								onClick={() => onPageChange(item)}
								size="icon-sm"
								type="button"
								variant={item === page ? "default" : "outline"}
							>
								{item}
							</Button>
						) : (
							<span className="px-1 text-muted-foreground text-xs" key={item}>
								…
							</span>
						),
					)}
					<Button
						aria-label="Página siguiente"
						disabled={page >= pageCount}
						onClick={() => onPageChange(page + 1)}
						size="icon-sm"
						type="button"
						variant="outline"
					>
						<ChevronRightIcon />
					</Button>
				</div>
			) : null}
		</div>
	);
}
