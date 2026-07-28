import { describe, expect, it } from "vitest";

import { qaTicketStatusSchema } from "~/schemas/admin/qa-ticket.schemas";
import {
	qaTicketStatusConfig,
	qaTicketStatusLabelMap,
	qaTicketStatusOptions,
} from "./qa-ticket.mappers";

describe("qaTicketStatusConfig", () => {
	it("covers every status of the Zod enum with a labelled chip", () => {
		for (const status of qaTicketStatusSchema.options) {
			expect(qaTicketStatusLabelMap[status]?.length).toBeGreaterThan(0);
			expect(qaTicketStatusConfig[status]?.label).toBe(
				qaTicketStatusLabelMap[status],
			);
			expect(qaTicketStatusConfig[status]?.icon).toBeDefined();
		}
	});

	it("distinguishes the two inert statuses by icon", () => {
		expect(qaTicketStatusConfig.pending.icon).not.toBe(
			qaTicketStatusConfig.skipped.icon,
		);
	});

	it("offers one filter option per status", () => {
		expect(qaTicketStatusOptions.map((option) => option.value)).toEqual([
			...qaTicketStatusSchema.options,
		]);
	});
});
