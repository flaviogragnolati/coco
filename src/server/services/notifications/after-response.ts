import { after } from "next/server";
import { appLogger } from "~/server/services/logging/app-logger.service";
import { withCustomerEmailDispatch } from "./request-dispatch";

async function flushCustomerEmails() {
	try {
		const { dispatchCustomerEmails } = await import(
			"./customer-email-dispatcher"
		);
		await dispatchCustomerEmails();
	} catch {
		appLogger.error("customerEmailDispatchFailed");
	}
}

export function withEmailAfterResponse<T>(handle: () => T) {
	return withCustomerEmailDispatch(() => {
		if (process.env.CUSTOMER_EMAIL_DISPATCH !== "true") return;
		try {
			after(flushCustomerEmails);
		} catch {
			// The daily sweep recovers the committed intents when this request cannot schedule work.
			appLogger.warn("customerEmailDispatchDeferred");
		}
	}, handle);
}
