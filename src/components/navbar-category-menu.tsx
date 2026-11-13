"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { CatalogCategorySummary } from "~/shared/common/catalog.types";

export function NavbarCategoryMenu({
	categories,
}: {
	categories: CatalogCategorySummary[];
}) {
	if (categories.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className="hidden shrink-0 rounded-full md:inline-flex"
					type="button"
					variant="ghost"
				>
					Categorías
					<ChevronDownIcon data-icon="inline-end" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
				<DropdownMenuGroup>
					{categories.map((category) => (
						<DropdownMenuItem asChild key={category.id}>
							<Link href={`/products?categoria=${category.id}`}>
								{category.name}
							</Link>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
