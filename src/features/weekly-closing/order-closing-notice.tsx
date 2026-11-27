"use client";

import type { CustomerOrderStatusKey } from "~/shared/common/order-display";
import { orderJoinsNextClosing } from "~/shared/common/weekly-closing";
import { ClosingNotice } from "./closing-notice";
import { useWeeklyClosing } from "./weekly-closing-provider";

/**
 * The weekly closing on an order: while it waits for its payment, and once paid
 * only while it still belongs to the closing that comes next. Nothing on an
 * order whose purchase already started, or outside the storefront.
 */
export function OrderClosingNotice({
	status,
	orderCreatedAt,
	stageKey,
}: {
	status: CustomerOrderStatusKey;
	orderCreatedAt: Date;
	stageKey: string | null;
}) {
	const closing = useWeeklyClosing();
	if (!closing) return null;

	if (status === "awaitingPayment" || status === "verifyingPayment") {
		return <ClosingNotice variant="awaitingPayment" />;
	}
	if (
		status === "inProgress" &&
		orderJoinsNextClosing({
			orderCreatedAt,
			now: closing.now,
			schedule: closing.schedule,
			stageKey,
		})
	) {
		return <ClosingNotice variant="paid" />;
	}
	return null;
}
