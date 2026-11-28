import {
	AlertCircleIcon,
	ArrowLeftIcon,
	CheckIcon,
	ClockIcon,
	MapPinIcon,
	WalletIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { OrderArrivalBanner } from "~/app/(storefront)/my-orders/_components/order-arrival";
import { orderHeadline } from "~/app/(storefront)/my-orders/_components/order-headline";
import { HashSafeLink } from "~/components/hash-safe-link";
import { Badge } from "~/components/ui/badge";
import { TransferDiscountBreakdownRows } from "~/features/cart/_components/transfer-total";
import { cssUrl } from "~/features/catalog/_components/product-image";
import { paymentMethodCopy } from "~/features/checkout/payment-method-copy";
import {
	buildCustomerOrderJourneyView,
	buildOrderLineStages,
	type CustomerJourneyNoticeView,
	type CustomerOrderJourneyItemInput,
	type CustomerOrderLineTone,
	summarizeOrderJourney,
} from "~/features/tracking/customer-order-journey";
import { OrderJourneyTrack } from "~/features/tracking/order-journey-track";
import { OrderClosingNotice } from "~/features/weekly-closing/order-closing-notice";
import { cn } from "~/lib/utils";
import type { OrderDetail } from "~/shared/common/checkout.types";
import {
	formatCurrency,
	formatQuantity,
} from "~/shared/common/commerce.helpers";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	describeOrderDelivery,
	formatOrderDelivery,
} from "~/shared/common/delivery-display";
import {
	customerOrderStatusView,
	formatOrderLineQuantityPrice,
	paymentStatusLabelMap,
	selectOrderDisplayAttempt,
} from "~/shared/common/order-display";
import {
	readSnapshotImageUrl,
	readSnapshotProduct,
	readSnapshotQuantityUnit,
} from "~/shared/common/product-snapshot";
import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import type { UserTrackingStageKey } from "~/shared/common/tracking-display";

type DataAttributes = { [key: `data-${string}`]: string };
type OrderItem = OrderDetail["items"][number];
type OrderAttempt = OrderDetail["transactions"][number];

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: null;
}

function getLineTotal(item: OrderItem) {
	const lineTotal = asRecord(item.priceSnapshot)?.lineTotal;
	return typeof lineTotal === "string" && lineTotal.length > 0
		? lineTotal
		: "0.00";
}

function getCurrency(item: OrderItem) {
	const currency = asRecord(item.priceSnapshot)?.currency;
	return currency === "ARS" ||
		currency === "USD" ||
		currency === "EUR" ||
		currency === "BRL"
		? currency
		: "ARS";
}

/** Orders paid before the customer could choose keep only an address snapshot. */
function getLegacyAddressLine(snapshot: unknown) {
	const address = asRecord(asRecord(snapshot)?.address);
	if (!address) return "Sin dirección";
	return [address.line1, address.city, address.state, address.postalCode]
		.filter((part) => typeof part === "string" && part.length > 0)
		.join(" · ");
}

function itemQuantityLabel(item: OrderItem) {
	const { unit, presentation } = readSnapshotQuantityUnit(item.productSnapshot);
	return formatQuantity(item.quantity, unit, presentation);
}

export function toOrderJourneyItemInputs(
	order: OrderDetail,
	itemTimelines: UserOrderItemTimeline[],
): CustomerOrderJourneyItemInput[] {
	const timelineByCartItemId = new Map(
		itemTimelines.map((timeline) => [timeline.cartItemId, timeline]),
	);
	return order.items.map((item) => ({
		cartItemId: item.sourceCartItemId,
		productName: readSnapshotProduct(item.productSnapshot).name,
		quantityLabel: itemQuantityLabel(item),
		timeline: timelineByCartItemId.get(item.sourceCartItemId),
	}));
}

const lineToneVariant: Record<
	CustomerOrderLineTone,
	"warning" | "info" | "success" | "outline"
> = {
	waiting: "warning",
	active: "info",
	delivered: "success",
	cancelled: "outline",
};

const arrivalIcon = {
	success: CheckIcon,
	pending: ClockIcon,
	failed: AlertCircleIcon,
} satisfies Record<OrderArrivalBanner["tone"], unknown>;

/** How the payment stands, in one short sentence. */
function paymentState(attempt: OrderAttempt, receiptDeclared: boolean) {
	if (attempt.status !== "pending")
		return paymentStatusLabelMap[attempt.status];
	if (attempt.provider !== "external") return "Pendiente";
	return receiptDeclared
		? "Comprobante informado, lo estamos verificando."
		: "Todavía no lo recibimos.";
}

function totalLabel(attempt: OrderAttempt | undefined) {
	if (!attempt) return "Total";
	if (attempt.status === "completed") return "Total pagado";
	if (attempt.status === "pending") {
		return attempt.provider === "external"
			? "Total a transferir"
			: "Total a pagar";
	}
	return "Total";
}

function NoticeBox({ notice }: { notice: CustomerJourneyNoticeView }) {
	return (
		<div className="flex flex-col gap-0.5 rounded-xl bg-brand-warm px-3 py-2 text-brand-warm-foreground text-sm">
			<span>
				<span className="font-semibold">{notice.label}.</span>{" "}
				<span className="text-xs">
					{formatDateTimeShort(new Date(notice.createdAt))}
				</span>
			</span>
			{notice.detail ? <span>{notice.detail}</span> : null}
			{notice.reason ? <span>{notice.reason}</span> : null}
		</div>
	);
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-1 text-sm">
			<span className="inline-flex items-center gap-2 font-bold text-[11px] uppercase tracking-[0.12em]">
				<span aria-hidden="true" className="size-2 rounded-full bg-highlight" />
				{label}
			</span>
			{children}
		</div>
	);
}

/**
 * One order, which is at the same time its confirmation, its pending payment
 * and its tracking: what is going on and the one track, what to do to pay,
 * each product with its own stage and notices, and how it is delivered and
 * paid. Server-free on purpose: the tutorial renders it from a client tree.
 */
export function OrderDetailView({
	order,
	journeyItems,
	arrivalBanner,
	paymentSlot,
	actionsSlot,
	targets,
}: {
	order: OrderDetail;
	/** The order's products with their timelines (`toOrderJourneyItemInputs`). */
	journeyItems: CustomerOrderJourneyItemInput[];
	/** After confirming or coming back from Mercado Pago. */
	arrivalBanner?: OrderArrivalBanner | null;
	/** What to do to pay, while the order waits for it. */
	paymentSlot?: ReactNode;
	/** Real page only; the tutorial leaves it out. */
	actionsSlot?: ReactNode;
	/** Marks regions for an outside walkthrough; absent on the real page. */
	targets?: { journey?: DataAttributes; arrival?: DataAttributes };
}) {
	const status = customerOrderStatusView(order);
	const StatusIcon = status.icon;
	const attempt = selectOrderDisplayAttempt(order.transactions);
	const journeyView = buildCustomerOrderJourneyView(journeyItems);
	const summary = summarizeOrderJourney(journeyView);
	const lines = new Map(
		buildOrderLineStages(journeyItems).map((line) => [line.cartItemId, line]),
	);
	const stageKey =
		(summary.stages.find((stage) => stage.status === "current")?.key as
			| UserTrackingStageKey
			| undefined) ?? (summary.delivered ? "delivery" : null);
	const headline = orderHeadline({
		status: status.key,
		provider: attempt?.provider ?? null,
		split: journeyView.mode === "perItem",
		stageKey,
	});
	const started = journeyView.mode !== "empty";
	const showTrack =
		started ||
		status.key === "awaitingPayment" ||
		status.key === "verifyingPayment";
	const delivery = describeOrderDelivery(order);
	const ArrivalIcon = arrivalBanner ? arrivalIcon[arrivalBanner.tone] : null;

	const header = (
		<section
			aria-labelledby="order-headline"
			className="flex flex-col gap-5 rounded-[22px] border bg-card p-5"
		>
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-2 font-bold text-[11px] uppercase tracking-[0.12em]">
						<span
							aria-hidden="true"
							className="size-2 rounded-full bg-highlight"
						/>
						Pedido <span className="font-mono">{order.code}</span>
					</span>
					<Badge variant={status.variant}>
						<StatusIcon data-icon="inline-start" />
						{status.label}
					</Badge>
				</div>
				<h2
					className="font-bold font-heading text-[clamp(24px,3vw,32px)] leading-tight tracking-tight"
					id="order-headline"
				>
					{headline.title}
				</h2>
				<p>{headline.text}</p>
			</div>
			{showTrack ? (
				<OrderJourneyTrack caption={summary.caption} stages={summary.stages} />
			) : null}
			<OrderClosingNotice
				orderCreatedAt={order.createdAt}
				stageKey={stageKey}
				status={status.key}
			/>
		</section>
	);

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<Link
				className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm lg:hidden"
				href="/my-orders"
			>
				<ArrowLeftIcon aria-hidden="true" className="size-4" />
				Mis pedidos
			</Link>

			{arrivalBanner && ArrivalIcon ? (
				<div
					className="flex items-start gap-4 rounded-[22px] bg-brand-ink p-5 text-brand-ink-foreground"
					role="status"
					{...targets?.arrival}
				>
					<span
						className={cn(
							"flex size-10 shrink-0 items-center justify-center rounded-full",
							arrivalBanner.tone === "failed"
								? "bg-destructive text-white"
								: "bg-highlight text-highlight-foreground",
						)}
					>
						<ArrivalIcon aria-hidden="true" className="size-5" />
					</span>
					<div className="flex flex-col gap-1">
						<p className="font-bold font-heading text-lg leading-snug">
							{arrivalBanner.title}
						</p>
						<p className="text-brand-soft text-sm">{arrivalBanner.body}</p>
					</div>
				</div>
			) : null}

			{targets?.journey ? (
				<div className="contents" {...targets.journey}>
					{header}
				</div>
			) : (
				header
			)}

			{paymentSlot}

			<section
				aria-labelledby="order-products"
				className="flex flex-col gap-3 rounded-[22px] border bg-card p-5"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2
						className="font-heading font-semibold text-xl"
						id="order-products"
					>
						Productos
					</h2>
					{actionsSlot}
				</div>
				<ul className="flex flex-col">
					{order.items.map((item) => {
						const line = lines.get(item.sourceCartItemId);
						const imageUrl = readSnapshotImageUrl(item.productSnapshot);
						return (
							<li
								className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b py-3 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)_auto]"
								key={item.id}
							>
								{imageUrl ? (
									<span
										aria-hidden="true"
										className="size-14 rounded-xl bg-center bg-cover bg-muted"
										style={{ backgroundImage: cssUrl(imageUrl) }}
									/>
								) : (
									<span
										aria-hidden="true"
										className="size-14 rounded-xl bg-muted"
									/>
								)}
								<span className="flex min-w-0 flex-col gap-0.5">
									<span className="font-semibold">
										{readSnapshotProduct(item.productSnapshot).name}
									</span>
									<span className="text-muted-foreground text-sm">
										{formatOrderLineQuantityPrice(item)} ·{" "}
										<span className="tabular-nums">
											{formatCurrency(getLineTotal(item), getCurrency(item))}
										</span>
									</span>
								</span>
								{started && line ? (
									<Badge
										className="col-start-2 justify-self-start sm:col-start-3 sm:justify-self-end"
										variant={lineToneVariant[line.tone]}
									>
										{line.stageLabel}
									</Badge>
								) : null}
								{line && line.notices.length > 0 ? (
									<div className="col-span-full flex flex-col gap-2 sm:col-start-2">
										{line.notices.map((notice) => (
											<NoticeBox
												key={`${notice.kind}-${notice.createdAt}-${notice.label}`}
												notice={notice}
											/>
										))}
									</div>
								) : null}
							</li>
						);
					})}
				</ul>
				<div className="border-t pt-3">
					{attempt?.subtotalAmount &&
					attempt.transferDiscountPercent &&
					attempt.transferDiscountAmount ? (
						<TransferDiscountBreakdownRows
							breakdown={{
								percent: attempt.transferDiscountPercent,
								subtotal: attempt.subtotalAmount,
								discount: attempt.transferDiscountAmount,
								total: attempt.amount,
							}}
							currency={attempt.currency}
							totalLabel={totalLabel(attempt)}
						/>
					) : (
						<div className="flex items-center justify-between gap-3">
							<span className="font-medium text-sm">{totalLabel(attempt)}</span>
							<span className="font-heading font-semibold text-lg tabular-nums">
								{order.currency
									? formatCurrency(order.totalAmount, order.currency)
									: "-"}
							</span>
						</div>
					)}
				</div>
			</section>

			<section
				aria-label="Entrega y pago"
				className="grid gap-5 rounded-[22px] border bg-card p-5 sm:grid-cols-2"
			>
				<Fact label="Entrega">
					<span className="flex items-start gap-2">
						<MapPinIcon
							aria-hidden="true"
							className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						/>
						<span className="flex min-w-0 flex-col gap-1">
							{delivery ? (
								<>
									<span className="font-semibold">
										{formatOrderDelivery(delivery)}
									</span>
									{delivery.instructions ? (
										<span className="text-muted-foreground">
											{delivery.instructions}
										</span>
									) : null}
									{delivery.googleMapsUrl ? (
										<a
											className="underline underline-offset-2"
											href={delivery.googleMapsUrl}
											rel="noreferrer"
											target="_blank"
										>
											Ver en el mapa
										</a>
									) : null}
								</>
							) : (
								<span>
									{getLegacyAddressLine(order.shippingAddressSnapshot)}
								</span>
							)}
							{order.status === "processing" ? (
								<span className="text-muted-foreground">
									¿Querés cambiarla?{" "}
									<HashSafeLink
										className="underline underline-offset-2"
										href="/#contacto"
									>
										Escribinos.
									</HashSafeLink>
								</span>
							) : null}
						</span>
					</span>
				</Fact>
				<Fact label="Pago">
					<span className="flex items-start gap-2">
						<WalletIcon
							aria-hidden="true"
							className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						/>
						{attempt ? (
							<span className="flex min-w-0 flex-col gap-1">
								<span className="font-semibold">
									{paymentMethodCopy(attempt.paymentMethod).title}
								</span>
								<span className="tabular-nums">
									{formatCurrency(attempt.amount, attempt.currency)}
								</span>
								<span className="text-muted-foreground">
									{paymentState(attempt, order.receiptDeclared)}
								</span>
								{attempt.externalTransactionId ? (
									<span className="text-muted-foreground text-xs">
										Número de operación{" "}
										<span className="font-mono">
											{attempt.externalTransactionId}
										</span>
									</span>
								) : null}
							</span>
						) : (
							<span className="text-muted-foreground">Sin pagos todavía.</span>
						)}
					</span>
				</Fact>
			</section>
		</div>
	);
}
