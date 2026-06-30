"use client";

import {
	CheckCircle2Icon,
	ClockIcon,
	CreditCardIcon,
	LayersIcon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { CrudDeleteDialog } from "~/features/admin/crud/_components/crud-delete-dialog";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import {
	cartItemStatusOptions,
	cartStatusOptions,
	fulfillmentStatusOptions,
	orderStatusOptions,
	transactionStatusOptions,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import { OperationsCartDetailForm } from "~/features/admin/crud/operations-cart/operations-cart-detail-form";
import { OperationsCartTable } from "~/features/admin/crud/operations-cart/operations-cart-table";
import type {
	OperationsCartFormValues,
	OperationsCartItemFulfillmentStatus,
	OperationsCartItemStatus,
	OperationsCartListItem,
	OperationsCartStatus,
	OperationsUserOrderStatus,
	OperationsUserTransactionStatus,
} from "~/shared/common/admin-crud/operations-cart.types";
import { api } from "~/trpc/react";

const allValue = "all";

export function UserCartsClient() {
	const router = useRouter();
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [cartStatus, setCartStatus] = useState<OperationsCartStatus | "all">(
		"all",
	);
	const [cartItemStatus, setCartItemStatus] = useState<
		OperationsCartItemStatus | "all"
	>("all");
	const [fulfillmentStatus, setFulfillmentStatus] = useState<
		OperationsCartItemFulfillmentStatus | "all"
	>("all");
	const [orderStatus, setOrderStatus] = useState<
		OperationsUserOrderStatus | "all"
	>("all");
	const [paymentStatus, setPaymentStatus] = useState<
		OperationsUserTransactionStatus | "all"
	>("all");
	const [userId, setUserId] = useState<string>("all");
	const [productId, setProductId] = useState<string>("all");
	const [productClientTermsId, setProductClientTermsId] =
		useState<string>("all");
	const [selectedCartId, setSelectedCartId] = useState<number | null>(null);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<OperationsCartListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<OperationsCartListItem | null>(null);

	const listInput = useMemo(
		() => ({
			includeDeleted,
			search: searchTerm.trim().length > 0 ? searchTerm : undefined,
			userId: userId === allValue ? undefined : userId,
			productId: productId === allValue ? undefined : Number(productId),
			productClientTermsId:
				productClientTermsId === allValue
					? undefined
					: Number(productClientTermsId),
			cartStatus: cartStatus === allValue ? undefined : cartStatus,
			cartItemStatus: cartItemStatus === allValue ? undefined : cartItemStatus,
			fulfillmentStatus:
				fulfillmentStatus === allValue ? undefined : fulfillmentStatus,
			orderStatus: orderStatus === allValue ? undefined : orderStatus,
			paymentStatus: paymentStatus === allValue ? undefined : paymentStatus,
		}),
		[
			cartItemStatus,
			cartStatus,
			fulfillmentStatus,
			includeDeleted,
			orderStatus,
			paymentStatus,
			productClientTermsId,
			productId,
			searchTerm,
			userId,
		],
	);

	const cartsQuery = api.admin.operationsCart.list.useQuery(listInput);
	const statsQuery = api.admin.operationsCart.getStats.useQuery();
	const usersQuery = api.admin.user.list.useQuery({ includeDeleted: true });
	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: true,
	});
	const productClientTermsQuery = api.admin.productClientTerms.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.operationsCart.getById.useQuery(
		{ id: selectedCartId ?? 0 },
		{ enabled: selectedCartId !== null },
	);

	const invalidateCartQueries = async () => {
		await Promise.all([
			utils.admin.operationsCart.list.invalidate(),
			utils.admin.operationsCart.getStats.invalidate(),
			utils.admin.operationsCart.getById.invalidate(),
		]);
	};

	const updateMutation = api.admin.operationsCart.update.useMutation({
		onSuccess: async () => {
			toast.success("Carrito actualizado");
			setSelectedCartId(null);
			await invalidateCartQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el carrito");
		},
	});

	const quickStatusMutation =
		api.admin.operationsCart.quickUpdateStatus.useMutation({
			onSuccess: async () => {
				toast.success("Estado actualizado");
				await invalidateCartQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo actualizar el estado");
			},
		});

	const softDeleteMutation = api.admin.operationsCart.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Carrito enviado a papelera");
			setSoftDeleteTarget(null);
			await invalidateCartQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el carrito");
		},
	});

	const hardDeleteMutation = api.admin.operationsCart.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Carrito eliminado definitivamente");
			setHardDeleteTarget(null);
			await invalidateCartQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (selectedCartId !== null && detailQuery.isError) {
			toast.error(detailQuery.error.message || "No se pudo cargar el carrito");
			setSelectedCartId(null);
		}
	}, [detailQuery.error, detailQuery.isError, selectedCartId]);

	const handleSubmit = (values: OperationsCartFormValues) => {
		updateMutation.mutate(values);
	};

	const renderTable = () => {
		if (cartsQuery.isLoading) return <CrudLoadingState />;

		if (cartsQuery.isError) {
			return (
				<CrudErrorState
					message={
						cartsQuery.error.message ||
						"No se pudo obtener la lista de carritos"
					}
				/>
			);
		}

		const carts = cartsQuery.data ?? [];

		if (carts.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros para revisar otros carritos."
					title="No hay carritos para mostrar"
				/>
			);
		}

		return (
			<OperationsCartTable
				carts={carts}
				isQuickStatusPending={quickStatusMutation.isPending}
				onEdit={(cart) => setSelectedCartId(cart.id)}
				onHardDelete={setHardDeleteTarget}
				onQuickStatusChange={(cart, status) => {
					if (cart.status === status) return;
					quickStatusMutation.mutate({ id: cart.id, status });
				}}
				onSoftDelete={setSoftDeleteTarget}
				onTrace={(cart) =>
					router.push(`/admin/operations/user-carts/${cart.id}`)
				}
			/>
		);
	};

	return (
		<CrudPageShell
			actions={
				<Button asChild variant="outline">
					<a href="/admin/operations">Volver a operaciones</a>
				</Button>
			}
			description="Revision operacional de carritos, items, ordenes y pagos relacionados."
			title="Carritos de usuarios"
		>
			{statsQuery.isLoading ? (
				<CrudLoadingState rows={2} />
			) : statsQuery.isError ? (
				<CrudErrorState
					message={
						statsQuery.error.message || "No se pudieron cargar los indicadores"
					}
				/>
			) : statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{
							label: "Total",
							value: statsQuery.data.total,
							icon: LayersIcon,
							description: "Incluye eliminados",
						},
						{
							label: "Abiertos",
							value: statsQuery.data.open,
							icon: ClockIcon,
							accent: "info",
							description: "Draft, pendientes o checkout",
						},
						{
							label: "Enviados",
							value: statsQuery.data.submitted,
							icon: CheckCircle2Icon,
							accent: "success",
							description: "Convertidos a solicitud",
						},
						{
							label: "Con pagos",
							value: statsQuery.data.withPayments,
							icon: CreditCardIcon,
							accent: "info",
							description: "Tienen transacciones",
						},
						{
							label: "Eliminados",
							value: statsQuery.data.deleted,
							icon: Trash2Icon,
							accent: "destructive",
							description: "Baja logica aplicada",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="rounded-none border p-3">
					<FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<Field>
							<FieldLabel htmlFor="operations-cart-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="operations-cart-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="Codigo, usuario, email o producto"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-user">Usuario</FieldLabel>
							<Select
								disabled={usersQuery.isLoading}
								id="operations-cart-user"
								onChange={(event) => setUserId(event.target.value)}
								value={userId}
							>
								<option value={allValue}>Todos</option>
								{(usersQuery.data ?? []).map((user) => (
									<option key={user.id} value={user.id}>
										{user.name} - {user.email}
										{user.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-product">
								Producto
							</FieldLabel>
							<Select
								disabled={productsQuery.isLoading}
								id="operations-cart-product"
								onChange={(event) => setProductId(event.target.value)}
								value={productId}
							>
								<option value={allValue}>Todos</option>
								{(productsQuery.data ?? []).map((product) => (
									<option key={product.id} value={product.id}>
										{product.name}
										{product.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-terms">
								Terminos cliente
							</FieldLabel>
							<Select
								disabled={productClientTermsQuery.isLoading}
								id="operations-cart-terms"
								onChange={(event) =>
									setProductClientTermsId(event.target.value)
								}
								value={productClientTermsId}
							>
								<option value={allValue}>Todos</option>
								{(productClientTermsQuery.data ?? []).map((terms) => (
									<option key={terms.id} value={terms.id}>
										#{terms.id} - {terms.product.name}
										{terms.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-status-filter">
								Estado carrito
							</FieldLabel>
							<Select
								id="operations-cart-status-filter"
								onChange={(event) =>
									setCartStatus(
										event.target.value as OperationsCartStatus | "all",
									)
								}
								value={cartStatus}
							>
								<option value={allValue}>Todos</option>
								{cartStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-item-status-filter">
								Estado item
							</FieldLabel>
							<Select
								id="operations-cart-item-status-filter"
								onChange={(event) =>
									setCartItemStatus(
										event.target.value as OperationsCartItemStatus | "all",
									)
								}
								value={cartItemStatus}
							>
								<option value={allValue}>Todos</option>
								{cartItemStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-fulfillment-filter">
								Fulfillment
							</FieldLabel>
							<Select
								id="operations-cart-fulfillment-filter"
								onChange={(event) =>
									setFulfillmentStatus(
										event.target.value as
											| OperationsCartItemFulfillmentStatus
											| "all",
									)
								}
								value={fulfillmentStatus}
							>
								<option value={allValue}>Todos</option>
								{fulfillmentStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-order-filter">
								Orden
							</FieldLabel>
							<Select
								id="operations-cart-order-filter"
								onChange={(event) =>
									setOrderStatus(
										event.target.value as OperationsUserOrderStatus | "all",
									)
								}
								value={orderStatus}
							>
								<option value={allValue}>Todas</option>
								{orderStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-payment-filter">
								Pago
							</FieldLabel>
							<Select
								id="operations-cart-payment-filter"
								onChange={(event) =>
									setPaymentStatus(
										event.target.value as
											| OperationsUserTransactionStatus
											| "all",
									)
								}
								value={paymentStatus}
							>
								<option value={allValue}>Todos</option>
								{transactionStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field className="self-end" orientation="horizontal">
							<Switch
								checked={includeDeleted}
								id="operations-cart-include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="operations-cart-include-deleted">
									Mostrar eliminados
								</FieldLabel>
								<FieldDescription>Baja logica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<OperationsCartDetailForm
				cart={detailQuery.data}
				isLoadingCart={detailQuery.isFetching}
				isLoadingProductClientTerms={productClientTermsQuery.isLoading}
				isSubmitting={updateMutation.isPending}
				onOpenChange={(open) => {
					if (!open) setSelectedCartId(null);
				}}
				onSubmit={handleSubmit}
				open={selectedCartId !== null}
				productClientTerms={productClientTermsQuery.data ?? []}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `El carrito "${softDeleteTarget.code}" quedara eliminado logicamente.`
						: ""
				}
				isPending={softDeleteMutation.isPending}
				onConfirm={() => {
					if (softDeleteTarget) {
						softDeleteMutation.mutate({ id: softDeleteTarget.id });
					}
				}}
				onOpenChange={(open) => {
					if (!open) setSoftDeleteTarget(null);
				}}
				open={Boolean(softDeleteTarget)}
				title="Confirmar baja logica"
			/>

			<CrudDeleteDialog
				confirmationLabel={
					hardDeleteTarget
						? `Escribi "${hardDeleteTarget.code}" para confirmar`
						: "Confirmacion"
				}
				confirmationValue={hardDeleteTarget?.code}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? `Esta accion intenta borrar el carrito "${hardDeleteTarget.code}" y sus items sin dependencias. Si existen ordenes, pagos o trazabilidad operacional, el servidor la va a bloquear.`
						: ""
				}
				isPending={hardDeleteMutation.isPending}
				onConfirm={() => {
					if (hardDeleteTarget) {
						hardDeleteMutation.mutate({ id: hardDeleteTarget.id });
					}
				}}
				onOpenChange={(open) => {
					if (!open) setHardDeleteTarget(null);
				}}
				open={Boolean(hardDeleteTarget)}
				title="Eliminacion definitiva"
			/>
		</CrudPageShell>
	);
}
