import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	type LucideIcon,
	PackageCheckIcon,
	RefreshCwIcon,
	RotateCcwIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import type { UserTrackingNoticeKind } from "~/shared/common/tracking-display";
import type {
	CustomerItemJourneyView,
	CustomerJourneyNoticeView,
	CustomerOrderJourneyView,
} from "./customer-order-journey";
import { TrackingJourneyStepper } from "./tracking-journey-stepper";

/**
 * Customer-facing order journey ("Seguimiento del pedido"). Presentational only:
 * the collapse decision and the whole view model come from
 * `buildCustomerOrderJourneyView`.
 */

const noticeConfigMap: Record<
	UserTrackingNoticeKind,
	{ variant: "destructive" | "warning" | "outline"; icon: LucideIcon }
> = {
	exception: { variant: "destructive", icon: AlertTriangleIcon },
	cancelled: { variant: "destructive", icon: AlertTriangleIcon },
	rollover: { variant: "warning", icon: RotateCcwIcon },
	resolved: { variant: "outline", icon: CheckCircle2Icon },
	quantity: { variant: "outline", icon: RefreshCwIcon },
	info: { variant: "outline", icon: PackageCheckIcon },
};

function NoticeList({ notices }: { notices: CustomerJourneyNoticeView[] }) {
	if (notices.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-2">
			{notices.map((notice) => {
				const config = noticeConfigMap[notice.kind];
				const NoticeIcon = config.icon;

				return (
					<Badge
						className="h-auto whitespace-normal py-1"
						key={`${notice.kind}-${notice.createdAt}-${notice.label}`}
						variant={config.variant}
					>
						<NoticeIcon data-icon="inline-start" />
						{notice.label} · {formatDateTimeShort(new Date(notice.createdAt))}
					</Badge>
				);
			})}
		</div>
	);
}

function CancelledBanner({ scope }: { scope: "order" | "item" }) {
	return (
		<Alert variant="destructive">
			<AlertTriangleIcon />
			<AlertTitle>
				{scope === "order"
					? "Este pedido fue cancelado"
					: "Este producto fue cancelado"}
			</AlertTitle>
			<AlertDescription>
				El recorrido queda congelado en la etapa alcanzada.
			</AlertDescription>
		</Alert>
	);
}

function ItemJourney({ item }: { item: CustomerItemJourneyView }) {
	return (
		<div className="flex flex-col gap-3 rounded-3xl border p-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col">
					<span className="font-medium text-sm">{item.productName}</span>
					<span className="text-muted-foreground text-xs">
						{item.quantityLabel}
					</span>
				</div>
				{item.currentStageLabel ? (
					<Badge variant="info">{item.currentStageLabel}</Badge>
				) : null}
			</div>
			{item.cancelled ? <CancelledBanner scope="item" /> : null}
			<TrackingJourneyStepper stages={item.stages} />
			<NoticeList notices={item.notices} />
		</div>
	);
}

export function CustomerOrderJourney({
	view,
}: {
	view: CustomerOrderJourneyView;
}) {
	if (view.mode === "empty") {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Seguimiento del pedido</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-3xl bg-muted/40 p-4 text-muted-foreground text-sm/relaxed">
						El seguimiento comienza cuando se acredita el pago.
					</div>
				</CardContent>
			</Card>
		);
	}

	if (view.mode === "unified") {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Seguimiento del pedido</CardTitle>
					<CardDescription>
						Todos los productos avanzan juntos por este recorrido.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{view.cancelled ? <CancelledBanner scope="order" /> : null}
					<TrackingJourneyStepper
						ariaLabel="Recorrido del pedido"
						stages={view.stages}
					/>
					<NoticeList notices={view.notices} />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Seguimiento del pedido</CardTitle>
				<CardDescription>
					Tus productos están en etapas distintas: mirá el recorrido de cada
					uno.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{view.items.map((item) => (
					<ItemJourney item={item} key={item.cartItemId} />
				))}
			</CardContent>
		</Card>
	);
}
