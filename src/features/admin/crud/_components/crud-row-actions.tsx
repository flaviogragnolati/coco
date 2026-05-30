"use client";

import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import type { CrudRowAction } from "~/shared/common/admin-crud/crud.types";

export function CrudRowActions<TItem>({
	item,
	actions,
}: {
	item: TItem;
	actions: CrudRowAction<TItem>[];
}) {
	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button aria-label="Abrir acciones" size="icon-sm" variant="ghost">
							<MoreHorizontalIcon />
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>Acciones</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuGroup>
					{actions.map((action) => {
						const Icon = action.icon;
						const disabled = action.disabled?.(item) ?? false;

						return (
							<DropdownMenuItem
								disabled={disabled}
								key={action.label}
								onSelect={(event) => {
									event.preventDefault();
									if (!disabled) action.onSelect(item);
								}}
								variant={action.destructive ? "destructive" : "default"}
							>
								{Icon ? <Icon data-icon="inline-start" /> : null}
								{action.label}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
