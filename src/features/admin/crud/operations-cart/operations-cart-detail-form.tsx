"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import {
	DetailDatesField,
	DetailEmpty,
	DetailField,
	DetailGrid,
	DetailItem,
	DetailSection,
	DetailSectionTitle,
} from "~/features/admin/crud/_components/crud-detail";
import { CrudDetailDialogShell } from "~/features/admin/crud/_components/crud-detail-dialog-shell";
import { JsonPreview } from "~/features/admin/crud/_components/crud-json-preview";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import {
	OrderNotificationChip,
	useOrderMailSummaries,
} from "~/features/admin/notifications/order-notification-chip";
import { operationsCartUpdateInputSchema } from "~/schemas/admin/operations-cart.schemas";
import type {
	OperationsCartDetail,
	OperationsCartFormInput,
	OperationsCartFormValues,
} from "~/shared/common/admin-crud/operations-cart.types";
import type { ProductClientTermsListItem } from "~/shared/common/admin-crud/product-client-terms.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	describeOrderDelivery,
	formatOrderDelivery,
} from "~/shared/common/delivery-display";
import {
	cartItemStatusConfig,
	cartItemStatusLabelMap,
	cartStatusConfig,
	cartStatusLabelMap,
	cartStatusOptions,
	defaultOperationsCartFormValues,
	fulfillmentStatusConfig,
	fulfillmentStatusLabelMap,
	operationsCartDetailToFormValues,
	orderStatusConfig,
	transactionStatusConfig,
} from "./operations-cart.mappers";

function OrderDeliverySummary({
	order,
}: {
	order: Parameters<typeof describeOrderDelivery>[0];
}) {
	const delivery = describeOrderDelivery(order);

	return (
		<div className="flex flex-col gap-2">
			<DetailSectionTitle>Entrega</DetailSectionTitle>
			{delivery ? (
				<>
					<span className="text-sm">{formatOrderDelivery(delivery)}</span>
					{delivery.instructions ? (
						<span className="text-muted-foreground text-xs">
							{delivery.instructions}
						</span>
					) : null}
				</>
			) : (
				// Orders paid before the customer could choose keep their raw address.
				<JsonPreview value={order.shippingAddressSnapshot} />
			)}
		</div>
	);
}

function productTermsLabel(terms: ProductClientTermsListItem) {
	return `${terms.product.name} - MOQ ${terms.moq} ${terms.product.unit} - ${terms.currency}`;
}

export function OperationsCartDetailForm({
	open,
	cart,
	productClientTerms,
	isLoadingCart,
	isLoadingProductClientTerms,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	cart?: OperationsCartDetail;
	productClientTerms: ProductClientTermsListItem[];
	isLoadingCart?: boolean;
	isLoadingProductClientTerms?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: OperationsCartFormValues) => void;
}) {
	const form = useForm<
		OperationsCartFormInput,
		unknown,
		OperationsCartFormValues
	>({
		resolver: zodResolver(operationsCartUpdateInputSchema),
		defaultValues: defaultOperationsCartFormValues,
	});
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		keyName: "fieldId",
		name: "items",
	});
	const errors = form.formState.errors;
	const mailSummaries = useOrderMailSummaries(
		open ? (cart?.userOrders ?? []) : [],
	);
	const availableProductClientTerms = productClientTerms.filter(
		(terms) => terms.active && !terms.deleted && !terms.product.deleted,
	);
	const currentItemById = useMemo(
		() => new Map(cart?.cartItems.map((item) => [item.id, item]) ?? []),
		[cart],
	);

	useEffect(() => {
		if (!open) return;

		if (cart) {
			form.reset(operationsCartDetailToFormValues(cart));
			return;
		}

		form.reset(defaultOperationsCartFormValues);
	}, [cart, form, open]);

	const handleAddItem = () => {
		const firstTerms = availableProductClientTerms[0];
		if (!firstTerms) return;

		append({
			productClientTermsId: firstTerms.id,
			quantity: firstTerms.moq,
		});
	};

	return (
		<CrudDetailDialogShell
			contentClassName="sm:max-w-[min(72rem,calc(100%-2rem))]"
			description="Editá el estado y los ítems del carrito. Las órdenes y los pagos son de solo lectura en esta versión."
			eyebrow="Carrito"
			footer={
				<>
					<Button
						disabled={isSubmitting}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancelar
					</Button>
					<Button
						disabled={isSubmitting || isLoadingCart || !cart || cart.deleted}
						form="operations-cart-detail-form"
						type="submit"
					>
						<SaveIcon data-icon="inline-start" />
						Guardar cambios
					</Button>
				</>
			}
			isLoading={isLoadingCart}
			onOpenChange={onOpenChange}
			open={open}
			status={
				cart ? (
					<>
						<StatusChip config={cartStatusConfig[cart.status]} />
						{cart.deleted ? (
							<Badge variant="destructive">Eliminado</Badge>
						) : null}
					</>
				) : null
			}
			title={
				cart ? (
					<span className="font-mono">{cart.code}</span>
				) : (
					"Detalle de carrito"
				)
			}
		>
			{cart ? (
				<form
					className="grid gap-5"
					id="operations-cart-detail-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<input
						type="hidden"
						{...form.register("id", { valueAsNumber: true })}
					/>

					<DetailSection title="Datos del carrito">
						<div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
							<DetailGrid columns={3}>
								<DetailField
									hint={
										<>
											<span className="block">{cart.user.email}</span>
											<span className="block">Rol: {cart.user.role}</span>
										</>
									}
									label="Usuario"
								>
									{cart.user.name}
								</DetailField>
								<DetailField label="Carrito">
									<span className="font-mono">{cart.code}</span>
								</DetailField>
								<DetailDatesField
									createdAt={cart.createdAt}
									updatedAt={cart.updatedAt}
								/>
							</DetailGrid>
							<Field data-invalid={Boolean(errors.status)}>
								<FieldLabel htmlFor="operations-cart-status">Estado</FieldLabel>
								<Select
									aria-invalid={Boolean(errors.status)}
									disabled={isSubmitting || cart.deleted}
									id="operations-cart-status"
									{...form.register("status")}
								>
									{cartStatusOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
								<FieldDescription>
									Actual: {cartStatusLabelMap[cart.status]}
									{cart.deleted ? " / eliminado" : ""}
								</FieldDescription>
								<FieldError errors={[errors.status]} />
							</Field>
						</div>
					</DetailSection>

					<FieldSet>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<FieldLegend>Ítems del carrito</FieldLegend>
							<Button
								disabled={
									isSubmitting ||
									cart.deleted ||
									isLoadingProductClientTerms ||
									availableProductClientTerms.length === 0
								}
								onClick={handleAddItem}
								type="button"
								variant="outline"
							>
								<PlusIcon data-icon="inline-start" />
								Agregar ítem
							</Button>
						</div>
						<FieldGroup className="gap-3">
							{fields.length === 0 ? (
								<DetailEmpty>El carrito no tiene ítems activos.</DetailEmpty>
							) : null}
							{fields.map((field, index) => {
								const itemErrors = errors.items?.[index];
								const currentItem =
									typeof field.id === "number"
										? currentItemById.get(field.id)
										: undefined;
								return (
									<div
										className="grid gap-3 rounded-xl border bg-card p-3 lg:grid-cols-[minmax(16rem,1fr)_9rem_auto]"
										key={field.fieldId}
									>
										{typeof field.id === "number" ? (
											<input
												type="hidden"
												{...form.register(`items.${index}.id`, {
													valueAsNumber: true,
												})}
											/>
										) : null}
										<Field
											data-invalid={Boolean(itemErrors?.productClientTermsId)}
										>
											<FieldLabel
												htmlFor={`operations-cart-item-product-${index}`}
											>
												Producto
											</FieldLabel>
											{currentItem ? (
												<>
													<input
														type="hidden"
														{...form.register(
															`items.${index}.productClientTermsId`,
															{ valueAsNumber: true },
														)}
													/>
													<Select
														aria-invalid={Boolean(
															itemErrors?.productClientTermsId,
														)}
														disabled
														id={`operations-cart-item-product-${index}`}
														value={currentItem.productClientTerms.id}
													>
														<option value={currentItem.productClientTerms.id}>
															{currentItem.productClientTerms.product.name}
														</option>
													</Select>
												</>
											) : (
												<Select
													aria-invalid={Boolean(
														itemErrors?.productClientTermsId,
													)}
													disabled={
														isSubmitting ||
														cart.deleted ||
														isLoadingProductClientTerms
													}
													id={`operations-cart-item-product-${index}`}
													{...form.register(
														`items.${index}.productClientTermsId`,
														{ valueAsNumber: true },
													)}
												>
													{productClientTerms.map((terms) => (
														<option
															disabled={
																terms.deleted ||
																!terms.active ||
																terms.product.deleted
															}
															key={terms.id}
															value={terms.id}
														>
															{productTermsLabel(terms)}
															{terms.deleted || terms.product.deleted
																? " (eliminado)"
																: !terms.active
																	? " (inactivo)"
																	: ""}
														</option>
													))}
												</Select>
											)}
											<FieldDescription>
												{currentItem
													? `${cartItemStatusLabelMap[currentItem.status]} / ${fulfillmentStatusLabelMap[currentItem.fulfillmentStatus]}`
													: "Nuevo ítem"}
											</FieldDescription>
											<FieldError errors={[itemErrors?.productClientTermsId]} />
										</Field>
										<Field data-invalid={Boolean(itemErrors?.quantity)}>
											<FieldLabel
												htmlFor={`operations-cart-item-quantity-${index}`}
											>
												Cantidad
											</FieldLabel>
											<Input
												aria-invalid={Boolean(itemErrors?.quantity)}
												disabled={isSubmitting || cart.deleted}
												id={`operations-cart-item-quantity-${index}`}
												inputMode="decimal"
												{...form.register(`items.${index}.quantity`)}
											/>
											<FieldError errors={[itemErrors?.quantity]} />
										</Field>
										<div className="flex items-end justify-end">
											<Button
												disabled={isSubmitting || cart.deleted}
												onClick={() => remove(index)}
												type="button"
												variant="destructive"
											>
												<Trash2Icon data-icon="inline-start" />
												Remover
											</Button>
										</div>
									</div>
								);
							})}
						</FieldGroup>
					</FieldSet>

					{cart.cartItems.some((item) => item.deleted) ? (
						<DetailSection title="Ítems removidos">
							<ul className="flex flex-col divide-y">
								{cart.cartItems
									.filter((item) => item.deleted)
									.map((item) => (
										<li
											className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
											key={item.id}
										>
											<div className="flex flex-col gap-1.5">
												<span className="font-medium text-sm">
													{item.productClientTerms.product.name}
												</span>
												<div className="flex flex-wrap items-center gap-1.5">
													<StatusChip
														config={cartItemStatusConfig[item.status]}
													/>
													<StatusChip
														config={
															fulfillmentStatusConfig[item.fulfillmentStatus]
														}
													/>
												</div>
											</div>
											<span className="font-semibold text-sm tabular-nums">
												{item.quantity}
											</span>
										</li>
									))}
							</ul>
						</DetailSection>
					) : null}

					<section className="flex flex-col gap-3">
						<DetailSectionTitle>Órdenes y pagos</DetailSectionTitle>
						{cart.userOrders.length === 0 ? (
							<DetailEmpty>
								Este carrito todavía no tiene orden asociada.
							</DetailEmpty>
						) : (
							<div className="grid gap-3">
								{cart.userOrders.map((order) => (
									<DetailSection key={order.id}>
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div className="flex flex-col gap-1">
												<span className="font-medium">
													Pedido <span className="font-mono">{order.code}</span>
												</span>
												<OrderNotificationChip
													orderId={order.id}
													summary={mailSummaries.get(order.id)}
												/>
												<span className="text-muted-foreground text-xs">
													#{order.id} · {formatDateTimeShort(order.createdAt)}
												</span>
											</div>
											<StatusChip config={orderStatusConfig[order.status]} />
										</div>
										<div className="grid gap-4 lg:grid-cols-2">
											<div className="flex flex-col gap-2">
												<DetailSectionTitle>Ítems de orden</DetailSectionTitle>
												{order.items.map((item) => (
													<DetailItem
														className="flex justify-between gap-2 text-sm"
														key={item.id}
													>
														<span>
															Ítem{" "}
															<span className="font-mono">
																#{item.sourceCartItemId}
															</span>
														</span>
														<span className="font-semibold tabular-nums">
															{item.quantity}
														</span>
													</DetailItem>
												))}
											</div>
											<div className="flex flex-col gap-2">
												<DetailSectionTitle>Pagos</DetailSectionTitle>
												{order.transactions.length === 0 ? (
													<DetailEmpty>Sin pagos registrados</DetailEmpty>
												) : null}
												{order.transactions.map((transaction) => (
													<DetailItem
														className="flex flex-wrap items-start justify-between gap-2"
														key={transaction.id}
													>
														<div className="flex flex-col gap-1">
															<span className="font-semibold text-sm tabular-nums">
																{transaction.amount}{" "}
																<span className="font-normal text-muted-foreground">
																	{transaction.currency}
																</span>
															</span>
															<span className="text-muted-foreground text-xs">
																{transaction.paymentMethod.type}
															</span>
														</div>
														<StatusChip
															config={
																transactionStatusConfig[transaction.status]
															}
														/>
													</DetailItem>
												))}
											</div>
										</div>
										<div className="grid gap-4 lg:grid-cols-2">
											<div className="flex flex-col gap-2">
												<DetailSectionTitle>Facturación</DetailSectionTitle>
												<JsonPreview value={order.billingAddressSnapshot} />
											</div>
											<OrderDeliverySummary order={order} />
										</div>
									</DetailSection>
								))}
							</div>
						)}
					</section>
				</form>
			) : (
				<DetailEmpty>Seleccioná un carrito para ver su detalle.</DetailEmpty>
			)}
		</CrudDetailDialogShell>
	);
}
