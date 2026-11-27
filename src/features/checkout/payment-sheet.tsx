"use client";

import { CheckCircle2Icon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { formatTransferDiscountPercent } from "~/features/cart/_components/transfer-total";
import { cn } from "~/lib/utils";
import type { CatalogCurrency } from "~/shared/common/catalog.types";
import type { CheckoutPaymentMethod } from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { decideAttemptCharge } from "~/shared/common/transfer-discount";
import { paymentMethodCopy } from "./payment-method-copy";
import { SelectableTile } from "./selectable-tile";

/**
 * "¿Cómo pagás?": one row per method, each with what it would charge, so the
 * transfer discount is a comparison and not a footnote (ADR 0013).
 */
export function PaymentSheet({
	open,
	onOpenChange,
	side,
	paymentMethods,
	selectedPaymentMethodId,
	onSelect,
	total,
	transferDiscountPercent,
	modal = true,
	inert,
	targets,
	className,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	side: "right" | "bottom";
	paymentMethods: CheckoutPaymentMethod[];
	selectedPaymentMethodId: number | null;
	onSelect: (method: CheckoutPaymentMethod) => void;
	total: { amount: string; currency: CatalogCurrency } | undefined;
	transferDiscountPercent: number | null;
	/** The tutorial shows it open without trapping its own controls. */
	modal?: boolean;
	/** Set on the portaled content itself: the sheet escapes any inert ancestor. */
	inert?: boolean;
	/** Marks the content for an outside walkthrough; absent on the real page. */
	targets?: { content?: { [key: `data-${string}`]: string } };
	/** Extra classes for the sheet content, such as the tutorial's offset. */
	className?: string;
}) {
	return (
		<Sheet modal={modal} onOpenChange={onOpenChange} open={open}>
			<SheetContent
				className={cn(
					"gap-0",
					side === "right" && "w-full sm:max-w-lg",
					className,
				)}
				inert={inert}
				side={side}
				{...targets?.content}
			>
				<SheetHeader className="pr-14">
					<SheetTitle className="font-heading text-xl">¿Cómo pagás?</SheetTitle>
					<SheetDescription>
						{transferDiscountPercent
							? `Por transferencia tenés ${formatTransferDiscountPercent(transferDiscountPercent)} % de descuento.`
							: "Elegí cómo querés pagar tu pedido."}
					</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
					{paymentMethods.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Ahora mismo no hay ningún medio de pago disponible. Escribinos
							para que lo habilitemos.
						</p>
					) : (
						paymentMethods.map((method) => {
							const selected = method.id === selectedPaymentMethodId;
							const copy = paymentMethodCopy(method);
							const charge = total
								? decideAttemptCharge({
										provider: method.provider,
										subtotal: total.amount,
										currency: total.currency,
										transferDiscountPercent,
									})
								: null;
							return (
								<SelectableTile
									actions={
										total && charge ? (
											<span className="flex flex-col gap-0.5 md:items-end md:text-right">
												<span className="font-heading font-semibold tabular-nums">
													{formatCurrency(charge.amount, total.currency)}
												</span>
												{charge.transferDiscount ? (
													<span className="font-medium text-success text-xs tabular-nums">
														{`Ahorrás ${formatCurrency(charge.transferDiscount.discount, total.currency)}`}
													</span>
												) : null}
											</span>
										) : null
									}
									key={method.id}
									onSelect={() => onSelect(method)}
									selected={selected}
								>
									<span className="flex items-center gap-2 font-medium text-sm">
										{selected ? (
											<CheckCircle2Icon
												aria-hidden="true"
												className="size-4 text-success"
											/>
										) : null}
										{copy.title}
									</span>
									<span className="text-muted-foreground text-xs/relaxed">
										{copy.description}
									</span>
								</SelectableTile>
							);
						})
					)}
				</div>

				<SheetFooter className="border-t pt-4">
					<Button
						disabled={selectedPaymentMethodId === null}
						onClick={() => onOpenChange(false)}
						size="lg"
						type="button"
					>
						Listo
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
