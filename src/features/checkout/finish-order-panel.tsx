"use client";

import {
	ChevronRightIcon,
	LogInIcon,
	MapPinIcon,
	PencilIcon,
	RefreshCwIcon,
	WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId } from "react";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import {
	formatTransferDiscountPercent,
	TransferTotalHint,
} from "~/features/cart/_components/transfer-total";
import { cn } from "~/lib/utils";
import type { CatalogCurrency } from "~/shared/common/catalog.types";
import type { CheckoutLiveOrder } from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import type { TransferDiscountBreakdown } from "~/shared/common/transfer-discount";
import type { FinishBlocker, FinishSelection } from "./finish-order";
import { paymentMethodCopy } from "./payment-method-copy";

type Total = { amount: string; currency: CatalogCurrency };

/** What the main button does now, already decided by the container. */
export type FinishAction = {
	label: string;
	onClick: () => void;
	disabled: boolean;
	/** Why it is disabled, read next to it. */
	reason: string | null;
	pending: boolean;
};

function PanelShell({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			aria-label={title}
			className={cn(
				"flex flex-col gap-4 rounded-[22px] border bg-card p-5 lg:sticky lg:top-20",
				className,
			)}
		>
			<h2 className="font-heading font-semibold text-xl">{title}</h2>
			{children}
		</section>
	);
}

/** One choice of the panel: the label, what is chosen, and a way to change it. */
function ChoiceRow({
	icon,
	label,
	title,
	detail,
	missing,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	title: string;
	detail: ReactNode;
	missing: boolean;
	onClick?: () => void;
}) {
	const content = (
		<>
			<span
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-full",
					missing
						? "bg-highlight text-highlight-foreground"
						: "bg-brand-soft text-brand-soft-foreground",
				)}
			>
				{icon}
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="font-bold text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
					{label}
				</span>
				<span className="font-heading font-semibold">{title}</span>
				<span className="truncate text-sm">{detail}</span>
			</span>
			{onClick ? (
				<ChevronRightIcon
					aria-hidden="true"
					className="size-5 shrink-0 text-muted-foreground"
				/>
			) : null}
		</>
	);
	const className = cn(
		"flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left",
		missing && "border-highlight bg-highlight/10",
	);

	return onClick ? (
		<button
			className={cn(
				className,
				"transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
			)}
			onClick={onClick}
			type="button"
		>
			{content}
		</button>
	) : (
		<div className={className}>{content}</div>
	);
}

function deliveryRow(selection: FinishSelection) {
	if (selection.deliveryMode === "pickupPoint") {
		return {
			title: "Punto de retiro",
			detail: selection.pickupPoint?.name ?? "Elegí un punto",
		};
	}
	return {
		title: "A domicilio",
		detail: selection.address
			? [selection.address.line1, selection.address.line2]
					.filter(Boolean)
					.join(", ")
			: "Falta tu dirección",
	};
}

function Totals({
	total,
	charge,
	itemCount,
}: {
	total: Total;
	charge: {
		amount: string;
		transferDiscount: TransferDiscountBreakdown | null;
	} | null;
	itemCount: number;
}) {
	const discount = charge?.transferDiscount ?? null;
	return (
		<div className="flex flex-col gap-2 border-t pt-4 text-sm tabular-nums">
			<div className="flex items-center justify-between gap-3">
				<span>
					Subtotal · {itemCount} {itemCount === 1 ? "producto" : "productos"}
				</span>
				<span className="shrink-0">
					{formatCurrency(total.amount, total.currency)}
				</span>
			</div>
			{discount ? (
				<div className="flex items-center justify-between gap-3 font-medium text-success">
					<span>
						{`Descuento por transferencia (${formatTransferDiscountPercent(discount.percent)} %)`}
					</span>
					<span className="shrink-0">
						−{formatCurrency(discount.discount, total.currency)}
					</span>
				</div>
			) : null}
			<div className="flex items-baseline justify-between gap-3 border-t pt-3">
				<span className="font-medium">
					{discount ? "Total a transferir" : "Total"}
				</span>
				<span className="shrink-0 font-bold font-heading text-3xl tracking-tight">
					{formatCurrency(charge?.amount ?? total.amount, total.currency)}
				</span>
			</div>
		</div>
	);
}

function ActionButton({
	action,
	className,
}: {
	action: FinishAction;
	className?: string;
}) {
	const reasonId = useId();
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<Button
				aria-describedby={action.reason ? reasonId : undefined}
				className="w-full"
				disabled={action.disabled || action.pending}
				onClick={action.onClick}
				size="lg"
				type="button"
				variant="highlight"
			>
				{action.pending ? "Confirmando..." : action.label}
			</Button>
			{action.reason ? (
				<p className="text-center text-muted-foreground text-xs" id={reasonId}>
					{action.reason}
				</p>
			) : null}
		</div>
	);
}

const releaseBlockedText: Record<
	Exclude<CheckoutLiveOrder["release"], "release">,
	string
> = {
	blockedDeclaredReceipt:
		"Ya informaste la transferencia y la estamos verificando. Cuando la confirmemos, lo ves en tu pedido.",
	blockedPaymentInFlight:
		"Mercado Pago está procesando tu pago. Cuando lo resuelva, lo ves en tu pedido.",
};

/**
 * "Finalizar": delivery, payment, totals, terms and the button that confirms,
 * on the order page itself (ADR 0015). With a `liveOrder` it becomes "Falta el
 * pago": the order is confirmed and waits for its payment, which the customer
 * can retry or switch, or they can go back to editing. Props only, so the
 * tutorial renders it on example data (ADR 0012).
 */
export function FinishOrderPanel({
	total,
	itemCount,
	charge,
	selection,
	blockers,
	liveOrder,
	acceptedTerms,
	onAcceptedTermsChange,
	onOpenTerms,
	onOpenDelivery,
	onOpenPayment,
	action,
	onLeaveCheckout,
	leaving = false,
}: {
	total: Total;
	itemCount: number;
	charge: {
		amount: string;
		transferDiscount: TransferDiscountBreakdown | null;
	} | null;
	selection: FinishSelection;
	blockers: FinishBlocker[];
	liveOrder: CheckoutLiveOrder | null;
	acceptedTerms: boolean;
	onAcceptedTermsChange: (accepted: boolean) => void;
	onOpenTerms: () => void;
	onOpenDelivery?: () => void;
	onOpenPayment?: () => void;
	action: FinishAction;
	onLeaveCheckout?: () => void;
	leaving?: boolean;
}) {
	const termsId = useId();
	const delivery = deliveryRow(selection);
	const payment = selection.paymentMethod
		? paymentMethodCopy(selection.paymentMethod)
		: null;
	const discount = charge?.transferDiscount ?? null;
	const blocked = liveOrder !== null && liveOrder.release !== "release";

	return (
		<PanelShell title={liveOrder ? "Falta el pago" : "Finalizar"}>
			{liveOrder ? (
				<p className="text-sm">
					Pedido <span className="font-mono">{liveOrder.code}</span> ·{" "}
					<Link
						className="font-medium underline underline-offset-2"
						href={`/my-orders/${liveOrder.id}`}
					>
						Ver el pedido
					</Link>
				</p>
			) : null}

			<ChoiceRow
				detail={delivery.detail}
				icon={<MapPinIcon aria-hidden="true" className="size-5" />}
				label="Entrega"
				missing={
					blockers.includes("address") || blockers.includes("pickupPoint")
				}
				onClick={blocked ? undefined : onOpenDelivery}
				title={delivery.title}
			/>
			<ChoiceRow
				detail={
					discount ? (
						<span className="font-medium text-success">
							{`Ahorrás ${formatCurrency(discount.discount, total.currency)} (${formatTransferDiscountPercent(discount.percent)} %)`}
						</span>
					) : (
						(payment?.description ?? "Elegí cómo pagás")
					)
				}
				icon={<WalletIcon aria-hidden="true" className="size-5" />}
				label="Pago"
				missing={blockers.includes("payment")}
				onClick={blocked ? undefined : onOpenPayment}
				title={payment?.title ?? "Sin elegir"}
			/>

			<Totals charge={charge} itemCount={itemCount} total={total} />

			{blocked ? (
				<p className="rounded-2xl bg-brand-soft p-3 text-brand-soft-foreground text-sm">
					{
						releaseBlockedText[
							liveOrder.release as keyof typeof releaseBlockedText
						]
					}
				</p>
			) : (
				<>
					{liveOrder ? null : (
						<div className="flex items-start gap-3 text-sm">
							<Checkbox
								checked={acceptedTerms}
								id={termsId}
								onCheckedChange={(checked) =>
									onAcceptedTermsChange(checked === true)
								}
							/>
							<span>
								<label htmlFor={termsId}>Leí y acepto los </label>
								<button
									className="font-medium underline underline-offset-2"
									onClick={onOpenTerms}
									type="button"
								>
									términos del pedido
								</button>
								.
							</span>
						</div>
					)}
					<ActionButton action={action} className="hidden lg:flex" />
					{liveOrder && onLeaveCheckout ? (
						<Button
							disabled={leaving}
							onClick={onLeaveCheckout}
							type="button"
							variant="outline"
						>
							<PencilIcon data-icon="inline-start" />
							Volver a editar el pedido
						</Button>
					) : null}
				</>
			)}
		</PanelShell>
	);
}

/** The total and the button, fixed to the bottom of a phone screen. */
export function FinishOrderMobileBar({
	amount,
	caption,
	action,
}: {
	amount: string;
	caption: string;
	action: FinishAction;
}) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-1 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
			<div className="flex items-center gap-3">
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="font-bold font-heading text-xl tabular-nums">
						{amount}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{caption}
					</span>
				</span>
				<Button
					disabled={action.disabled || action.pending}
					onClick={action.onClick}
					type="button"
					variant="highlight"
				>
					{action.pending ? "Confirmando..." : action.label}
				</Button>
			</div>
			{action.reason ? (
				<p className="text-muted-foreground text-xs">{action.reason}</p>
			) : null}
		</div>
	);
}

/** A guest sees the total and signs in to finish; their order waits in the browser. */
export function FinishOrderGuestPanel({
	total,
	itemCount,
	transferDiscountPercent,
}: {
	total: Total;
	itemCount: number;
	transferDiscountPercent: number | null;
}) {
	return (
		<PanelShell title="Finalizar">
			<div className="flex flex-col gap-1 text-sm tabular-nums">
				<div className="flex items-baseline justify-between gap-3">
					<span>
						Total · {itemCount} {itemCount === 1 ? "producto" : "productos"}
					</span>
					<span className="shrink-0 font-bold font-heading text-3xl tracking-tight">
						{formatCurrency(total.amount, total.currency)}
					</span>
				</div>
				<TransferTotalHint percent={transferDiscountPercent} total={total} />
			</div>
			<Button asChild size="lg" variant="highlight">
				<Link href="/login?callbackURL=/cart">
					<LogInIcon data-icon="inline-start" />
					Registrarme o iniciar sesión
				</Link>
			</Button>
			<p className="text-center text-muted-foreground text-xs">
				Para confirmar te pedimos ingresar con tu cuenta. Tu pedido queda
				guardado.
			</p>
		</PanelShell>
	);
}

export function FinishOrderLoadingPanel() {
	return (
		<PanelShell title="Finalizar">
			<Skeleton className="h-20 w-full rounded-2xl" />
			<Skeleton className="h-20 w-full rounded-2xl" />
			<Skeleton className="h-24 w-full rounded-2xl" />
		</PanelShell>
	);
}

export function FinishOrderErrorPanel({ onRetry }: { onRetry: () => void }) {
	return (
		<PanelShell title="Finalizar">
			<p className="text-sm">
				No pudimos cargar las opciones de entrega y pago.
			</p>
			<Button onClick={onRetry} type="button" variant="outline">
				<RefreshCwIcon data-icon="inline-start" />
				Reintentar
			</Button>
		</PanelShell>
	);
}

/** A panel that only explains why the order cannot be finished right now. */
export function FinishOrderNoticePanel({ children }: { children: ReactNode }) {
	return (
		<PanelShell title="Finalizar">
			<p className="text-sm">{children}</p>
		</PanelShell>
	);
}
