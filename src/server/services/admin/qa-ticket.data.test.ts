import { describe, expect, it, vi } from "vitest";

import {
	claimQaTicket,
	qaTicketListSelect,
	replaceQaTicketLog,
	saveQaTicketResult,
} from "./qa-ticket.data";

describe("qaTicketListSelect", () => {
	it("keeps notes and evidence content out of the work queue payload", () => {
		expect(qaTicketListSelect).not.toHaveProperty("notes");
		expect(qaTicketListSelect).not.toHaveProperty("evidence");
		expect(qaTicketListSelect).not.toHaveProperty("content");
	});
});

describe("claimQaTicket", () => {
	it("conditions the write on live tickets owned by nobody or the same admin", async () => {
		const updateMany = vi.fn().mockResolvedValue({ count: 0 });
		const db = { qaTicket: { updateMany } };

		await claimQaTicket(db as never, 42, "admin-1");

		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: 42,
				deleted: false,
				OR: [{ assigneeId: null }, { assigneeId: "admin-1" }],
			},
			data: { assigneeId: "admin-1", status: "inProgress" },
		});
	});
});

describe("saveQaTicketResult", () => {
	it("conditions result writes on the current owner and live ticket", async () => {
		const updateMany = vi.fn().mockResolvedValue({ count: 1 });
		const db = { qaTicket: { updateMany } };

		await saveQaTicketResult(db as never, 42, "admin-1", "passed", "Listo");

		expect(updateMany).toHaveBeenCalledWith({
			where: { id: 42, assigneeId: "admin-1", deleted: false },
			data: { status: "passed", notes: "Listo" },
		});
	});
});

describe("replaceQaTicketLog", () => {
	it("deletes the stored log when the submitted content is empty", async () => {
		const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
		const upsert = vi.fn();
		const db = { qaTicketEvidence: { deleteMany, upsert } };

		await replaceQaTicketLog(db as never, 42, "consoleLog", {
			content: "",
			fileName: null,
			mimeType: null,
			byteSize: 0,
		});

		expect(deleteMany).toHaveBeenCalledWith({
			where: { qaTicketId: 42, kind: "consoleLog", slot: 0 },
		});
		expect(upsert).not.toHaveBeenCalled();
	});
});
