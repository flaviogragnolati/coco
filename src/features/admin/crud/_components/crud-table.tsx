import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";

const interactiveSelector = [
	"a",
	"button",
	"input",
	"select",
	"textarea",
	"summary",
	"[contenteditable='true']",
	"[data-crud-row-interactive='true']",
	"[role='button']",
	"[role='checkbox']",
	"[role='link']",
	"[role='menuitem']",
	"[role='option']",
	"[role='radio']",
	"[role='switch']",
].join(",");

function originatedFromInteractiveElement(target: EventTarget | null) {
	return (
		target instanceof Element && Boolean(target.closest(interactiveSelector))
	);
}

export function CrudTable<TItem>({
	columns,
	items,
	getRowKey,
	actions,
	getRowClassName,
	onRowClick,
	isRowClickDisabled,
	getRowAriaLabel,
}: {
	columns: CrudColumn<TItem>[];
	items: TItem[];
	getRowKey: (item: TItem) => string | number;
	actions?: (item: TItem) => ReactNode;
	getRowClassName?: (item: TItem) => string | undefined;
	onRowClick?: (item: TItem) => void;
	isRowClickDisabled?: (item: TItem) => boolean;
	getRowAriaLabel?: (item: TItem) => string;
}) {
	return (
		<div className="rounded-none border">
			<Table>
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<TableHead className={column.className} key={column.key}>
								{column.header}
							</TableHead>
						))}
						{actions ? (
							<TableHead className="w-10 text-right">Acciones</TableHead>
						) : null}
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => {
						const rowClickDisabled = isRowClickDisabled?.(item) ?? false;
						const rowClickable = Boolean(onRowClick) && !rowClickDisabled;
						const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
							if (
								!rowClickable ||
								originatedFromInteractiveElement(event.target)
							) {
								return;
							}

							onRowClick?.(item);
						};
						const handleRowKeyDown = (
							event: KeyboardEvent<HTMLTableRowElement>,
						) => {
							if (
								!rowClickable ||
								originatedFromInteractiveElement(event.target)
							) {
								return;
							}

							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onRowClick?.(item);
							}
						};

						return (
							<TableRow
								aria-label={rowClickable ? getRowAriaLabel?.(item) : undefined}
								className={cn(
									getRowClassName?.(item),
									rowClickable &&
										"cursor-pointer focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
								)}
								key={getRowKey(item)}
								onClick={handleRowClick}
								onKeyDown={handleRowKeyDown}
								tabIndex={rowClickable ? 0 : undefined}
							>
								{columns.map((column) => (
									<TableCell className={column.className} key={column.key}>
										{column.cell(item)}
									</TableCell>
								))}
								{actions ? (
									<TableCell
										className="text-right"
										data-crud-row-interactive="true"
									>
										{actions(item)}
									</TableCell>
								) : null}
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
