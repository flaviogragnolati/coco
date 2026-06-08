import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	CircleDotIcon,
	CircleIcon,
	ClipboardCheckIcon,
	type LucideIcon,
	PackageCheckIcon,
	PackageIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	TruckIcon,
	WarehouseIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import type { UserTrackingStageKey } from "~/shared/common/tracking-display";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const stageIconMap: Record<UserTrackingStageKey, LucideIcon> = {
	submitted: ClipboardCheckIcon,
	preparation: PackageIcon,
	supplier: WarehouseIcon,
	packaging: PackageCheckIcon,
	shipping: TruckIcon,
	delivery: CheckCircle2Icon,
};

const noticeIconMap = {
	exception: AlertTriangleIcon,
	resolved: CheckCircle2Icon,
	rollover: RotateCcwIcon,
	cancelled: AlertTriangleIcon,
	quantity: RefreshCwIcon,
};

function formatDate(value?: string) {
	if (!value) return null;
	return dateFormatter.format(new Date(value));
}

function statusIcon(stage: UserOrderItemTimeline["stages"][number]) {
	if (stage.status === "completed") return CheckCircle2Icon;
	if (stage.status === "current") return CircleDotIcon;
	return CircleIcon;
}

export function CustomerCartItemTimeline({
	timeline,
}: {
	timeline?: UserOrderItemTimeline;
}) {
	const hasProgress =
		timeline?.stages.some((stage) => stage.createdAt) ?? false;
	const hasNotices = (timeline?.notices.length ?? 0) > 0;

	if (!timeline || (!hasProgress && !hasNotices)) {
		return (
			<div className="rounded-none border bg-muted/20 p-3 text-muted-foreground text-xs">
				Recorrido en preparacion
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 rounded-none border bg-muted/10 p-3">
			<div className="grid gap-3 md:grid-cols-6">
				{timeline.stages.map((stage) => {
					const StageIcon = stageIconMap[stage.key];
					const StatusIcon = statusIcon(stage);
					const occurredAt = formatDate(stage.createdAt);

					return (
						<div
							className={cn(
								"flex min-w-0 gap-2 rounded-none border p-2 md:flex-col",
								stage.status === "current" &&
									"border-primary bg-primary/5 text-primary",
								stage.status === "completed" &&
									"border-emerald-500/40 bg-emerald-500/5",
								stage.status === "pending" &&
									"border-border bg-background text-muted-foreground",
							)}
							key={stage.key}
						>
							<div className="flex items-center gap-2">
								<span
									className={cn(
										"flex size-7 shrink-0 items-center justify-center rounded-full border bg-background",
										stage.status === "current" && "border-primary text-primary",
										stage.status === "completed" &&
											"border-emerald-500 text-emerald-600",
									)}
								>
									<StageIcon className="size-3.5" />
								</span>
								<StatusIcon className="size-3.5 shrink-0" />
							</div>
							<div className="min-w-0">
								<div className="truncate font-medium text-xs">
									{stage.label}
								</div>
								<div className="line-clamp-2 text-[11px] text-muted-foreground leading-snug">
									{stage.description}
								</div>
								{occurredAt ? (
									<div className="mt-1 text-[11px]">{occurredAt}</div>
								) : null}
							</div>
						</div>
					);
				})}
			</div>

			{hasNotices ? (
				<div className="flex flex-wrap gap-2">
					{timeline.notices.map((notice) => {
						const NoticeIcon = noticeIconMap[notice.kind];
						const occurredAt = formatDate(notice.createdAt);
						const destructive =
							notice.kind === "exception" || notice.kind === "cancelled";

						return (
							<Badge
								className="h-auto whitespace-normal py-1"
								key={`${notice.eventType}-${notice.createdAt}`}
								variant={destructive ? "destructive" : "outline"}
							>
								<NoticeIcon data-icon="inline-start" />
								{notice.label}
								{notice.quantity ? ` (${notice.quantity})` : ""}
								{occurredAt ? ` - ${occurredAt}` : ""}
							</Badge>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
