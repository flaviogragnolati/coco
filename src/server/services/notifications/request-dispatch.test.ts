import { expect, test, vi } from "vitest";
import { withEmailAfterResponse } from "./after-response";
import { scheduleCustomerEmailDispatch } from "./request-dispatch";

const { after, dispatch } = vi.hoisted(() => ({
	after: vi.fn<(task: () => Promise<void>) => void>(),
	dispatch: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after }));
vi.mock("./customer-email-dispatcher", () => ({
	dispatchCustomerEmails: dispatch,
}));
test("multiple intents in a request schedule one post-response sweep; idle requests and standalone enqueues do not", async () => {
	vi.stubEnv("CUSTOMER_EMAIL_DISPATCH", "true");
	try {
		scheduleCustomerEmailDispatch();
		await withEmailAfterResponse(async () => {});
		expect(after).not.toHaveBeenCalled();
		const result = await withEmailAfterResponse(async () => {
			await Promise.resolve();
			scheduleCustomerEmailDispatch();
			scheduleCustomerEmailDispatch();
			return "checkout saved";
		});
		expect(result).toBe("checkout saved");
		expect(after).toHaveBeenCalledTimes(1);
		expect(dispatch).not.toHaveBeenCalled();
		await after.mock.calls[0]?.[0]();
		expect(dispatch).toHaveBeenCalledTimes(1);
	} finally {
		vi.unstubAllEnvs();
	}
});
