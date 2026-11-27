import Link from "next/link";

import { NotificationStatusChip } from "~/features/admin/notifications/notification-status-chip";
import type { AdminTrackingTimelineItem } from "~/shared/common/tracking.types";

export function TrackingEmailChip({
	email,
}: {
	email: AdminTrackingTimelineItem["email"];
}) {
	if (!email) return null;
	const chip = (
		<span className="inline-flex items-center gap-1.5">
			<span className="text-muted-foreground text-xs">Mail</span>
			<NotificationStatusChip status={email.status} test={email.test} />
			{email.partialQuantity && (
				<span className="text-muted-foreground text-xs">Cantidad parcial</span>
			)}
		</span>
	);
	if (!email.orderId) return chip;
	return (
		<Link
			className="w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
			href={`/admin/notifications?orderId=${email.orderId}&status=all`}
			prefetch={false}
		>
			{chip}
			<span className="sr-only"> · Ver historial de mails del pedido</span>
		</Link>
	);
}
