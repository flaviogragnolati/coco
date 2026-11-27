import type { Prisma } from "~/prisma/client";
import { getEmailEnvironment } from "./email-config";
import type { LogisticsNotice } from "./logistics-content";

import { scheduleCustomerEmailDispatch } from "./request-dispatch";

export type PaymentNotice = {
	kind: "confirmed" | "rejected" | "transfer";
	attemptId: number;
};

export function isCustomerEmailEnabled() {
	return getEmailEnvironment() !== null;
}

export async function enqueueCustomerEmail(
	tx: Prisma.TransactionClient,
	orderId: number,
	eventKey: string,
	notice: PaymentNotice | LogisticsNotice,
) {
	const environment = getEmailEnvironment();
	if (!environment) return;
	const inserted = await tx.customerEmailDelivery.createMany({
		data: [
			{
				orderId,
				environment,
				eventKey,
				notice: { ...notice, version: 1 },
			},
		],
		skipDuplicates: true,
	});
	if (inserted.count) scheduleCustomerEmailDispatch();
}
