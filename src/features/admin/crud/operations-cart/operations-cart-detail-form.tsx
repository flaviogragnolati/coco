"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
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
import { Skeleton } from "~/components/ui/skeleton";
import { operationsCartUpdateInputSchema } from "~/schemas/admin/operations-cart.schemas";
import type {
	OperationsCartDetail,
	OperationsCartFormInput,
	OperationsCartFormValues,
} from "~/shared/common/admin-crud/operations-cart.types";
import type { ProductClientTermsListItem } from "~/shared/common/admin-crud/product-client-terms.types";
import {
	cartItemStatusLabelMap,
	cartStatusLabelMap,
	cartStatusOptions,
	defaultOperationsCartFormValues,
	fulfillmentStatusLabelMap,
	operationsCartDetailToFormValues,
	orderStatusLabelMap,
	transactionStatusLabelMap,
} from "./operations-cart.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

function JsonPreview({ value }: { value: unknown }) {
	if (value === null || value === undefined) return <span>Sin datos</span>;

	return (
		<pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-none border bg-muted/30 p-2 text-[11px]">
			{JSON.stringify(value, null, 2)}
		</pre>
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
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[min(72rem,calc(100%-2rem))]">
				<DialogHeader>
					<DialogTitle>
						{cart ? `Carrito ${cart.code}` : "Detalle de carrito"}
					</DialogTitle>
					<DialogDescription>
						Edita estado e items del carrito. Ordenes y pagos son solo lectura
						en esta version.
					</DialogDescription>
				</DialogHeader>

				{isLoadingCart ? (
					<div className="grid gap-3">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-48 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				) : cart ? (
					<form
						className="grid gap-5"
						id="operations-cart-detail-form"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<input
							type="hidden"
							{...form.register("id", { valueAsNumber: true })}
						/>

						<section className="grid gap-3 rounded-none border p-3 md:grid-cols-3">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">Usuario</span>
								<span className="font-medium">{cart.user.name}</span>
								<span className="text-muted-foreground text-xs">
									{cart.user.email}
								</span>
								<span className="text-muted-foreground text-xs">
									Rol: {cart.user.role}
								</span>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">Carrito</span>
								<span className="font-mono">{cart.code}</span>
								<span className="text-muted-foreground text-xs">
									Creado: {dateFormatter.format(cart.createdAt)}
								</span>
								<span className="text-muted-foreground text-xs">
									Actualizado: {dateFormatter.format(cart.updatedAt)}
								</span>
							</div>
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
						</section>

						<FieldSet>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<FieldLegend>Items del carrito</FieldLegend>
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
									Agregar item
								</Button>
							</div>
							<FieldGroup className="gap-3">
								{fields.length === 0 ? (
									<div className="rounded-none border border-dashed p-3 text-muted-foreground text-xs">
										El carrito no tiene items activos.
									</div>
								) : null}
								{fields.map((field, index) => {
									const itemErrors = errors.items?.[index];
									const currentItem =
										typeof field.id === "number"
											? currentItemById.get(field.id)
											: undefined;
									return (
										<div
											className="grid gap-3 rounded-none border p-3 lg:grid-cols-[minmax(16rem,1fr)_9rem_auto]"
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
														: "Nuevo item"}
												</FieldDescription>
												<FieldError
													errors={[itemErrors?.productClientTermsId]}
												/>
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
							<FieldSet>
								<FieldLegend>Items removidos</FieldLegend>
								<div className="grid gap-2 rounded-none border p-3">
									{cart.cartItems
										.filter((item) => item.deleted)
										.map((item) => (
											<div
												className="flex flex-col gap-1 border-b py-2 last:border-b-0"
												key={item.id}
											>
												<span className="font-medium">
													{item.productClientTerms.product.name}
												</span>
												<span className="text-muted-foreground text-xs">
													{item.quantity} /{" "}
													{cartItemStatusLabelMap[item.status]} /{" "}
													{fulfillmentStatusLabelMap[item.fulfillmentStatus]}
												</span>
											</div>
										))}
								</div>
							</FieldSet>
						) : null}

						<FieldSet>
							<FieldLegend>Ordenes y pagos</FieldLegend>
							{cart.userOrders.length === 0 ? (
								<div className="rounded-none border p-3 text-muted-foreground text-xs">
									Este carrito todavia no tiene orden asociada.
								</div>
							) : (
								<div className="grid gap-3">
									{cart.userOrders.map((order) => (
										<section className="rounded-none border p-3" key={order.id}>
											<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
												<div className="flex flex-col gap-1">
													<span className="font-medium">Orden #{order.id}</span>
													<span className="text-muted-foreground text-xs">
														{dateFormatter.format(order.createdAt)}
													</span>
												</div>
												<Badge variant="outline">
													{orderStatusLabelMap[order.status]}
												</Badge>
											</div>
											<div className="mt-3 grid gap-3 lg:grid-cols-2">
												<div className="flex flex-col gap-2">
													<span className="font-medium text-xs">
														Items de orden
													</span>
													{order.items.map((item) => (
														<div
															className="rounded-none border bg-muted/20 p-2 text-xs"
															key={item.id}
														>
															<div className="flex justify-between gap-2">
																<span>Item #{item.sourceCartItemId}</span>
																<span>{item.quantity}</span>
															</div>
														</div>
													))}
												</div>
												<div className="flex flex-col gap-2">
													<span className="font-medium text-xs">Pagos</span>
													{order.transactions.length === 0 ? (
														<span className="text-muted-foreground text-xs">
															Sin pagos registrados
														</span>
													) : null}
													{order.transactions.map((transaction) => (
														<div
															className="rounded-none border bg-muted/20 p-2 text-xs"
															key={transaction.id}
														>
															<div className="flex justify-between gap-2">
																<span>
																	{transaction.amount} {transaction.currency}
																</span>
																<Badge variant="outline">
																	{
																		transactionStatusLabelMap[
																			transaction.status
																		]
																	}
																</Badge>
															</div>
															<span className="text-muted-foreground">
																{transaction.paymentMethod.type}
															</span>
														</div>
													))}
												</div>
											</div>
											<div className="mt-3 grid gap-3 lg:grid-cols-2">
												<div>
													<span className="font-medium text-xs">
														Facturacion
													</span>
													<JsonPreview value={order.billingAddressSnapshot} />
												</div>
												<div>
													<span className="font-medium text-xs">Envio</span>
													<JsonPreview value={order.shippingAddressSnapshot} />
												</div>
											</div>
										</section>
									))}
								</div>
							)}
						</FieldSet>
					</form>
				) : (
					<div className="rounded-none border p-3 text-muted-foreground text-xs">
						Selecciona un carrito para ver su detalle.
					</div>
				)}

				<DialogFooter>
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
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
