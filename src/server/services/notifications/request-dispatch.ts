import { AsyncLocalStorage } from "node:async_hooks";

const requests = new AsyncLocalStorage<{ schedule?: () => void }>();

export function withCustomerEmailDispatch<T>(
	schedule: () => void,
	handle: () => T,
) {
	return requests.run({ schedule }, handle);
}

// One HTTP mutation can produce multiple deliveries in a batch or retry its transaction.
export function scheduleCustomerEmailDispatch() {
	const request = requests.getStore();
	if (!request?.schedule) return;
	const schedule = request.schedule;
	request.schedule = undefined;
	schedule();
}
