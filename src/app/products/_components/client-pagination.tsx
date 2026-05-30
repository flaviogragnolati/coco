"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

export function ClientPagination({
	page,
	pageCount,
	onPageChange,
}: {
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
}) {
	if (pageCount <= 1) return null;

	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-xs">
				Pagina {page} de {pageCount}
			</p>
			<div className="flex items-center gap-2">
				<Button
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
					type="button"
					variant="outline"
				>
					<ChevronLeftIcon data-icon="inline-start" />
					Anterior
				</Button>
				<Button
					disabled={page >= pageCount}
					onClick={() => onPageChange(page + 1)}
					type="button"
					variant="outline"
				>
					Siguiente
					<ChevronRightIcon data-icon="inline-end" />
				</Button>
			</div>
		</div>
	);
}
