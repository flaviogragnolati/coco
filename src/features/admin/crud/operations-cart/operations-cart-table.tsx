"use client";

import { ArchiveXIcon, EyeIcon, Trash2Icon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Select } from "~/components/ui/select";
import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type {
	OperationsCartListItem,
	OperationsCartStatus,
} from "~/shared/common/admin-crud/operations-cart.types";
import {
	cartStatusLabelMap,
	cartStatusOptions,
	orderStatusLabelMap,
} from "./operations-cart.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

function CartLifecycleBadge({ status }: { status: OperationsCartStatus }) {
	const variant =
		status === "cancelled" || status === "aborted"
			? "destructive"
			: status === "submitted"
				? "default"
				: "outline";

	return <Badge variant={variant}>{cartStatusLabelMap[status]}</Badge>;
}

function PaymentSummary({ cart }: { cart: OperationsCartListItem }) {
	const summary = cart.paymentSummary;
	const hasTransactions = summary.transactionCount > 0;

	return (
		<div className="flex flex-col gap-0.5 text-xs">
			<span className="font-medium text-foreground">
				{hasTransactions
					? `${summary.transactionCount} pago${summary.transactionCount === 1 ? "" : "s"}`
					: "Sin pagos"}
			</span>
			<span className="text-muted-foreground">
				{cart.orderCount > 0
					? `${cart.orderCount} orden${cart.orderCount === 1 ? "" : "es"}${
							cart.latestOrderStatus
								? `, ${orderStatusLabelMap[cart.latestOrderStatus]}`
								: ""
						}`
					: "Sin orden"}
			</span>
			{hasTransactions ? (
				<span className="text-muted-foreground">
					OK {summary.completedAmount} / Pend. {summary.pendingAmount}
				</span>
			) : null}
		</div>
	);
}

const operationsCartColumns: CrudColumn<OperationsCartListItem>[] = [
	{
		key: "cart",
		header: "Carrito",
		className: "min-w-36",
		cell: (cart) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">{cart.code}</span>
				<span className="font-mono text-muted-foreground text-xs">
					#{cart.id}
				</span>
			</div>
		),
	},
	{
		key: "user",
		header: "Usuario",
		className: "min-w-48",
		cell: (cart) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">{cart.user.name}</span>
				<span className="text-muted-foreground text-xs">{cart.user.email}</span>
				{cart.user.deleted ? (
					<span className="text-destructive text-xs">Usuario eliminado</span>
				) : null}
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (cart) => (
			<div className="flex flex-col gap-1">
				<CartLifecycleBadge status={cart.status} />
				{cart.deleted ? <Badge variant="destructive">Eliminado</Badge> : null}
			</div>
		),
	},
	{
		key: "items",
		header: "Items",
		className: "min-w-56",
		cell: (cart) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">
					{cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} /{" "}
					{cart.totalQuantity}
				</span>
				<span className="text-muted-foreground text-xs">
					{cart.products.length > 0
						? cart.products
								.slice(0, 3)
								.map((product) => `${product.name} (${product.quantity})`)
								.join(", ")
						: "Sin productos activos"}
					{cart.products.length > 3 ? "..." : ""}
				</span>
			</div>
		),
	},
	{
		key: "orders",
		header: "Orden/Pagos",
		cell: (cart) => <PaymentSummary cart={cart} />,
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (cart) => dateFormatter.format(cart.updatedAt),
	},
];

export function OperationsCartTable({
	carts,
	isQuickStatusPending,
	onEdit,
	onSoftDelete,
	onHardDelete,
	onQuickStatusChange,
}: {
	carts: OperationsCartListItem[];
	isQuickStatusPending?: boolean;
	onEdit: (cart: OperationsCartListItem) => void;
	onSoftDelete: (cart: OperationsCartListItem) => void;
	onHardDelete: (cart: OperationsCartListItem) => void;
	onQuickStatusChange: (
		cart: OperationsCartListItem,
		status: OperationsCartStatus,
	) => void;
}) {
	const actions: CrudRowAction<OperationsCartListItem>[] = [
		{
			label: "Ver y editar",
			icon: EyeIcon,
			onSelect: onEdit,
			disabled: (cart) => cart.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (cart) => cart.deleted,
		},
		{
			label: "Eliminar definitivamente",
			icon: Trash2Icon,
			onSelect: onHardDelete,
			destructive: true,
		},
	];

	return (
		<CrudTable
			actions={(cart) => (
				<div className="flex items-center justify-end gap-2">
					<Select
						aria-label={`Cambiar estado de ${cart.code}`}
						className="w-36"
						disabled={cart.deleted || isQuickStatusPending}
						onChange={(event) =>
							onQuickStatusChange(
								cart,
								event.target.value as OperationsCartStatus,
							)
						}
						value={cart.status}
					>
						{cartStatusOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
					<CrudRowActions actions={actions} item={cart} />
				</div>
			)}
			columns={operationsCartColumns}
			getRowAriaLabel={(cart) => `Ver y editar carrito ${cart.code}`}
			getRowClassName={(cart) =>
				cart.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(cart) => cart.id}
			isRowClickDisabled={(cart) => cart.deleted}
			items={carts}
			onRowClick={onEdit}
		/>
	);
}
