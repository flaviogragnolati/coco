"use client";

import { ArchiveXIcon, EyeIcon, RouteIcon, Trash2Icon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { OperationsCartListItem } from "~/shared/common/admin-crud/operations-cart.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { cartStatusConfig, orderStatusConfig } from "./operations-cart.mappers";

function plural(count: number, singular: string, pluralForm: string) {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

function PaymentAmounts({ cart }: { cart: OperationsCartListItem }) {
	const summary = cart.paymentSummary;
	const [currency] = summary.currencies;

	// Amounts across currencies cannot be added up, so only a single-currency
	// cart gets formatted totals.
	const format = (amount: string) =>
		summary.currencies.length === 1 && currency
			? formatCurrency(amount, currency)
			: amount;

	return (
		<span className="flex flex-col whitespace-nowrap text-muted-foreground">
			<span>Cobrado {format(summary.completedAmount)}</span>
			<span>Pendiente {format(summary.pendingAmount)}</span>
		</span>
	);
}

function OrderAndPayments({ cart }: { cart: OperationsCartListItem }) {
	const transactionCount = cart.paymentSummary.transactionCount;

	return (
		<div className="flex flex-col items-start gap-1 text-xs">
			{cart.latestOrderStatus ? (
				<StatusChip config={orderStatusConfig[cart.latestOrderStatus]} />
			) : (
				<span className="text-muted-foreground">Sin orden</span>
			)}
			<span className="font-medium text-foreground">
				{transactionCount > 0
					? plural(transactionCount, "pago", "pagos")
					: "Sin pagos"}
			</span>
			{transactionCount > 0 ? <PaymentAmounts cart={cart} /> : null}
		</div>
	);
}

const operationsCartColumns: CrudColumn<OperationsCartListItem>[] = [
	{
		key: "cart",
		header: "Carrito",
		cell: (cart) => (
			<div className="flex max-w-56 flex-col gap-0.5">
				<span className="font-medium text-foreground">{cart.code}</span>
				<span className="truncate text-muted-foreground text-xs">
					{cart.user.name}
				</span>
				<span className="truncate text-muted-foreground text-xs">
					{cart.user.email}
				</span>
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
			<div className="flex flex-col items-start gap-1">
				<StatusChip config={cartStatusConfig[cart.status]} />
				{cart.deleted ? <Badge variant="destructive">Eliminado</Badge> : null}
			</div>
		),
	},
	{
		key: "items",
		header: "Ítems",
		cell: (cart) => {
			const productNames = cart.products
				.map((product) => product.name)
				.join(", ");

			return (
				<div className="flex max-w-52 flex-col gap-0.5">
					<span className="font-medium text-foreground">
						{plural(cart.itemCount, "ítem", "ítems")} · {cart.totalQuantity}
					</span>
					<span
						className="line-clamp-1 text-muted-foreground text-xs"
						title={productNames || undefined}
					>
						{productNames || "Sin productos activos"}
					</span>
				</div>
			);
		},
	},
	{
		key: "orders",
		header: "Orden / Pago",
		cell: (cart) => <OrderAndPayments cart={cart} />,
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		cell: (cart) => (
			<span className="whitespace-nowrap">
				{formatDateTimeShort(cart.updatedAt)}
			</span>
		),
	},
];

export function OperationsCartTable({
	carts,
	onEdit,
	onTrace,
	onSoftDelete,
	onHardDelete,
}: {
	carts: OperationsCartListItem[];
	onEdit: (cart: OperationsCartListItem) => void;
	onTrace: (cart: OperationsCartListItem) => void;
	onSoftDelete: (cart: OperationsCartListItem) => void;
	onHardDelete: (cart: OperationsCartListItem) => void;
}) {
	const actions: CrudRowAction<OperationsCartListItem>[] = [
		{
			label: "Ver y editar",
			icon: EyeIcon,
			onSelect: onEdit,
			disabled: (cart) => cart.deleted,
		},
		{
			label: "Rastrear",
			icon: RouteIcon,
			onSelect: onTrace,
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
			actions={(cart) => <CrudRowActions actions={actions} item={cart} />}
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
