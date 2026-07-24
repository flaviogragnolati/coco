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
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
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
import { useDebouncedValue } from "~/features/admin/crud/_lib/use-debounced-value";
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
const pageSizeOptions = [10, 25, 50, 100] as const;

export function UserCartsClient() {
	const router = useRouter();
	const utils = api.useUtils();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] =
		useState<(typeof pageSizeOptions)[number]>(25);
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
	const [userSearch, setUserSearch] = useState("");
	const [productSearch, setProductSearch] = useState("");
	const [termsSearch, setTermsSearch] = useState("");

	const debouncedUserSearch = useDebouncedValue(userSearch, 250);
	const debouncedProductSearch = useDebouncedValue(productSearch, 250);
	const debouncedTermsSearch = useDebouncedValue(termsSearch, 250);

	const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
		setter(value);
		setPage(1);
	};

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
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
			page,
			pageSize,
			paymentStatus,
			productClientTermsId,
			productId,
			searchTerm,
			userId,
		],
	);

	const cartsQuery = api.admin.operationsCart.list.useQuery(listInput);
	const statsQuery = api.admin.operationsCart.getStats.useQuery();
	const userOptionsQuery = api.admin.user.options.useQuery({
		search: debouncedUserSearch || undefined,
		selectedValue: userId === allValue ? undefined : userId,
	});
	const productOptionsQuery = api.admin.product.options.useQuery({
		search: debouncedProductSearch || undefined,
		selectedValue: productId === allValue ? undefined : productId,
	});
	const termsOptionsQuery = api.admin.productClientTerms.options.useQuery({
		search: debouncedTermsSearch || undefined,
		selectedValue:
			productClientTermsId === allValue ? undefined : productClientTermsId,
	});
	// The detail form edits cart items and needs the full client-terms records
	// (product, moq, pricing) that the lightweight `options` endpoint omits.
	const productClientTermsQuery = api.admin.productClientTerms.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.operationsCart.getById.useQuery(
		{ id: selectedCartId ?? 0 },
		{ enabled: selectedCartId !== null },
	);

	const userComboOptions = useMemo<ComboboxOption[]>(
		() => [
			{ value: allValue, label: "Todos" },
			...(userOptionsQuery.data ?? []).map((option) => ({
				value: option.value,
				label: `${option.label}${option.deleted ? " (eliminado)" : ""}`,
			})),
		],
		[userOptionsQuery.data],
	);

	const productComboOptions = useMemo<ComboboxOption[]>(
		() => [
			{ value: allValue, label: "Todos" },
			...(productOptionsQuery.data ?? []).map((option) => ({
				value: option.value,
				label: `${option.label}${option.deleted ? " (eliminado)" : ""}`,
			})),
		],
		[productOptionsQuery.data],
	);

	const termsComboOptions = useMemo<ComboboxOption[]>(
		() => [
			{ value: allValue, label: "Todos" },
			...(termsOptionsQuery.data ?? []).map((option) => ({
				value: option.value,
				label: `${option.label}${option.deleted ? " (eliminado)" : ""}`,
			})),
		],
		[termsOptionsQuery.data],
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

		const carts = cartsQuery.data?.items ?? [];

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
				onTrace={(cart) => router.push(`/admin/carts/${cart.id}`)}
			/>
		);
	};

	const pageCount = cartsQuery.data?.pageCount ?? 0;
	const total = cartsQuery.data?.total ?? 0;

	return (
		<CrudPageShell
			description="Revisión operacional de carritos, ítems, órdenes y pagos relacionados."
			title="Carritos"
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
				<div className="rounded-2xl border p-3">
					<FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<Field>
							<FieldLabel htmlFor="operations-cart-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="operations-cart-search"
									onChange={(event) =>
										updateFilter(setSearchTerm, event.target.value)
									}
									placeholder="Código, usuario, email o producto"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-user">Usuario</FieldLabel>
							<Combobox
								id="operations-cart-user"
								loading={userOptionsQuery.isLoading}
								onChange={(next) => updateFilter(setUserId, next)}
								onSearchChange={setUserSearch}
								options={userComboOptions}
								placeholder="Todos"
								searchPlaceholder="Buscar usuario o email..."
								value={userId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-product">
								Producto
							</FieldLabel>
							<Combobox
								id="operations-cart-product"
								loading={productOptionsQuery.isLoading}
								onChange={(next) => updateFilter(setProductId, next)}
								onSearchChange={setProductSearch}
								options={productComboOptions}
								placeholder="Todos"
								searchPlaceholder="Buscar producto..."
								value={productId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-terms">
								Terminos cliente
							</FieldLabel>
							<Combobox
								id="operations-cart-terms"
								loading={termsOptionsQuery.isLoading}
								onChange={(next) => updateFilter(setProductClientTermsId, next)}
								onSearchChange={setTermsSearch}
								options={termsComboOptions}
								placeholder="Todos"
								searchPlaceholder="Buscar términos..."
								value={productClientTermsId}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-status-filter">
								Estado carrito
							</FieldLabel>
							<Select
								id="operations-cart-status-filter"
								onChange={(event) =>
									updateFilter(
										setCartStatus,
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
									updateFilter(
										setCartItemStatus,
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
									updateFilter(
										setFulfillmentStatus,
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
									updateFilter(
										setOrderStatus,
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
									updateFilter(
										setPaymentStatus,
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
								onCheckedChange={(checked) =>
									updateFilter(setIncludeDeleted, checked)
								}
							/>
							<FieldContent>
								<FieldLabel htmlFor="operations-cart-include-deleted">
									Mostrar eliminados
								</FieldLabel>
								<FieldDescription>Baja logica</FieldDescription>
							</FieldContent>
						</Field>
						<Field>
							<FieldLabel htmlFor="operations-cart-page-size">
								Tamaño pagina
							</FieldLabel>
							<Select
								id="operations-cart-page-size"
								onChange={(event) =>
									updateFilter(
										setPageSize,
										Number(
											event.target.value,
										) as (typeof pageSizeOptions)[number],
									)
								}
								value={String(pageSize)}
							>
								{pageSizeOptions.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</Select>
						</Field>
					</FieldGroup>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-muted-foreground text-sm">
						{cartsQuery.isLoading
							? "Cargando carritos"
							: `${total} carrito${total === 1 ? "" : "s"}`}
					</span>
					<div className="flex items-center gap-2">
						<Button
							disabled={page <= 1 || cartsQuery.isLoading}
							onClick={() => setPage((current) => Math.max(1, current - 1))}
							type="button"
							variant="outline"
						>
							Anterior
						</Button>
						<span className="text-sm">
							Pagina {page} de {Math.max(pageCount, 1)}
						</span>
						<Button
							disabled={
								pageCount === 0 || page >= pageCount || cartsQuery.isLoading
							}
							onClick={() => setPage((current) => current + 1)}
							type="button"
							variant="outline"
						>
							Siguiente
						</Button>
					</div>
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
						: "Confirmación"
				}
				confirmationValue={hardDeleteTarget?.code}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? `Esta acción intenta borrar el carrito "${hardDeleteTarget.code}" y sus items sin dependencias. Si existen órdenes, pagos o trazabilidad operacional, el servidor la va a bloquear.`
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
				title="Eliminación definitiva"
			/>
		</CrudPageShell>
	);
}
