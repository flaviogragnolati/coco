import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import type { ReactNode } from "react";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";

export function CrudTable<TItem>({
	columns,
	items,
	getRowKey,
	actions,
	getRowClassName,
}: {
	columns: CrudColumn<TItem>[];
	items: TItem[];
	getRowKey: (item: TItem) => string | number;
	actions?: (item: TItem) => ReactNode;
	getRowClassName?: (item: TItem) => string | undefined;
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
					{items.map((item) => (
						<TableRow className={getRowClassName?.(item)} key={getRowKey(item)}>
							{columns.map((column) => (
								<TableCell className={column.className} key={column.key}>
									{column.cell(item)}
								</TableCell>
							))}
							{actions ? (
								<TableCell className="text-right">{actions(item)}</TableCell>
							) : null}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
