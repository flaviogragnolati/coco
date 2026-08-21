import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./qa-ticket.data", () => ({
	claimQaTicket: vi.fn(),
	createQaTicket: vi.fn(),
	createQaTicketImage: vi.fn(),
	deleteQaTicketImage: vi.fn(),
	findQaTicketById: vi.fn(),
	findQaTicketImageById: vi.fn(),
	getNextQaTicketCode: vi.fn(),
	getQaTicketStats: vi.fn(),
	hardDeleteQaTicket: vi.fn(),
	listQaTicketImageSlots: vi.fn(),
	listQaTickets: vi.fn(),
	replaceQaTicketLog: vi.fn(),
	saveQaTicketResult: vi.fn(),
	softDeleteQaTicket: vi.fn(),
	updateQaTicket: vi.fn(),
}));

vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLog: vi.fn(),
}));

import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError } from "./_base/admin-crud.errors";
import * as qaTicketData from "./qa-ticket.data";
import * as qaTicketService from "./qa-ticket.service";

const now = new Date("2026-08-21T12:00:00.000Z");
const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };
const emptyLogInput = { content: "", fileName: null, mimeType: null };

function detail(
	overrides: Partial<
		NonNullable<Awaited<ReturnType<typeof qaTicketData.findQaTicketById>>>
	> = {},
) {
	return {
		id: 1,
		code: 1,
		section: "Acceso",
		title: "Iniciar sesión",
		actor: "Cliente",
		feature: "Auth",
		status: "pending" as const,
		isRegressionPath: true,
		assignee: null,
		deleted: false,
		updatedAt: now,
		steps: "Abrir login",
		expectedResult: "Ingresa",
		notes: null,
		consoleLog: null,
		networkLog: null,
		images: [],
		...overrides,
	};
}

function database() {
	const tx = {};
	return {
		tx,
		db: {
			$transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		},
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("QA ticket service", () => {
	it("claims an unassigned ticket and audits the atomic result", async () => {
		const before = detail();
		const after = detail({
			status: "inProgress",
			assignee: { id: actor.id, name: actor.name },
		});
		vi.mocked(qaTicketData.findQaTicketById).mockResolvedValue(before);
		vi.mocked(qaTicketData.claimQaTicket).mockResolvedValue(after);
		const { db } = database();

		await expect(
			qaTicketService.claim({ id: 1 }, actor, db as never),
		).resolves.toMatchObject({
			status: "inProgress",
			assignee: { id: actor.id },
		});
		expect(qaTicketData.claimQaTicket).toHaveBeenCalledWith(
			expect.anything(),
			1,
			actor.id,
		);
		expect(writeAdminAuditLog).toHaveBeenCalledOnce();
	});

	it("returns an already-owned in-progress ticket without another write", async () => {
		vi.mocked(qaTicketData.findQaTicketById).mockResolvedValue(
			detail({
				status: "inProgress",
				assignee: { id: actor.id, name: actor.name },
			}),
		);
		const { db } = database();

		await qaTicketService.claim({ id: 1 }, actor, db as never);

		expect(qaTicketData.claimQaTicket).not.toHaveBeenCalled();
		expect(writeAdminAuditLog).not.toHaveBeenCalled();
	});

	it("moves an already-owned completed ticket back to in progress", async () => {
		const before = detail({
			status: "passed",
			assignee: { id: actor.id, name: actor.name },
		});
		const after = detail({
			status: "inProgress",
			assignee: { id: actor.id, name: actor.name },
		});
		vi.mocked(qaTicketData.findQaTicketById).mockResolvedValue(before);
		vi.mocked(qaTicketData.claimQaTicket).mockResolvedValue(after);
		const { db } = database();

		await expect(
			qaTicketService.claim({ id: 1 }, actor, db as never),
		).resolves.toMatchObject({ status: "inProgress" });
		expect(qaTicketData.claimQaTicket).toHaveBeenCalledOnce();
		expect(writeAdminAuditLog).toHaveBeenCalledOnce();
	});

	it("takes a clarified ticket back without disturbing its reason", async () => {
		const reason = "Falta decir con qué usuario entrar";
		const before = detail({
			status: "needsClarification",
			notes: reason,
			assignee: { id: actor.id, name: actor.name },
		});
		const after = detail({
			status: "inProgress",
			notes: reason,
			assignee: { id: actor.id, name: actor.name },
		});
		vi.mocked(qaTicketData.findQaTicketById).mockResolvedValue(before);
		vi.mocked(qaTicketData.claimQaTicket).mockResolvedValue(after);
		const { db } = database();

		await expect(
			qaTicketService.claim({ id: 1 }, actor, db as never),
		).resolves.toMatchObject({ status: "inProgress", notes: reason });
		expect(qaTicketData.claimQaTicket).toHaveBeenCalledOnce();
		expect(writeAdminAuditLog).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ action: "qaTicket.claim" }),
		);
	});

	it("rejects a foreign assignment before writing", async () => {
		vi.mocked(qaTicketData.findQaTicketById).mockResolvedValue(
			detail({ assignee: { id: "admin-2", name: "Admin Dos" } }),
		);
		const { db } = database();

		await expect(
			qaTicketService.claim({ id: 1 }, actor, db as never),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "El caso ya está asignado a Admin Dos",
		});
		expect(qaTicketData.claimQaTicket).not.toHaveBeenCalled();
		expect(writeAdminAuditLog).not.toHaveBeenCalled();
	});

	it("saves both logs transactionally and excludes their content from audit", async () => {
		const owned = detail({
			status: "inProgress",
			assignee: { id: actor.id, name: actor.name },
		});
		const saved = detail({
			status: "failed",
			assignee: { id: actor.id, name: actor.name },
			consoleLog: {
				id: 10,
				kind: "consoleLog",
				slot: 0,
				content: "SECRET_CONSOLE_FRAGMENT",
				fileName: "console.log",
				mimeType: "text/plain",
				byteSize: 23,
				createdAt: now,
				updatedAt: now,
			},
			networkLog: null,
		});
		vi.mocked(qaTicketData.findQaTicketById)
			.mockResolvedValueOnce(owned)
			.mockResolvedValueOnce(saved);
		vi.mocked(qaTicketData.saveQaTicketResult).mockResolvedValue({ count: 1 });
		const { db } = database();

		await qaTicketService.saveResult(
			{
				id: 1,
				status: "failed",
				notes: "Hallazgo",
				consoleLog: {
					content: "SECRET_CONSOLE_FRAGMENT",
					fileName: "console.log",
					mimeType: "text/plain",
				},
				networkLog: { content: "", fileName: null, mimeType: null },
			},
			actor,
			db as never,
		);

		expect(qaTicketData.replaceQaTicketLog).toHaveBeenCalledTimes(2);
		const auditPayload = JSON.stringify(
			vi.mocked(writeAdminAuditLog).mock.calls[0]?.[1],
		);
		expect(auditPayload).not.toContain("SECRET_CONSOLE_FRAGMENT");
		expect(auditPayload).not.toContain('"content"');
		expect(auditPayload).toContain('"contentLength":23');
	});

	it("rejects a sixth image without creating or auditing evidence", async () => {
		vi.mocked(qaTicketData.findQaTicketById).mockResolvedValue(
			detail({ assignee: { id: actor.id, name: actor.name } }),
		);
		vi.mocked(qaTicketData.listQaTicketImageSlots).mockResolvedValue(
			[0, 1, 2, 3, 4].map((slot) => ({ slot })),
		);
		const { db } = database();
		const png = Uint8Array.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);

		await expect(
			qaTicketService.addImageEvidence(
				{
					qaTicketId: 1,
					bytes: png,
					fileName: "capture.png",
					mimeType: "image/png",
				},
				actor,
				db as never,
			),
		).rejects.toBeInstanceOf(AdminCrudError);
		expect(qaTicketData.createQaTicketImage).not.toHaveBeenCalled();
		expect(writeAdminAuditLog).not.toHaveBeenCalled();
	});

	it("rejects result changes for a deleted ticket before writing logs", async () => {
		vi.mocked(qaTicketData.findQaTicketById).mockResolvedValue(
			detail({
				deleted: true,
				assignee: { id: actor.id, name: actor.name },
			}),
		);
		const { db } = database();

		await expect(
			qaTicketService.saveResult(
				{
					id: 1,
					status: "failed",
					notes: "Hallazgo",
					consoleLog: { ...emptyLogInput },
					networkLog: { ...emptyLogInput },
				},
				actor,
				db as never,
			),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(qaTicketData.saveQaTicketResult).not.toHaveBeenCalled();
		expect(qaTicketData.replaceQaTicketLog).not.toHaveBeenCalled();
		expect(writeAdminAuditLog).not.toHaveBeenCalled();
	});
});
