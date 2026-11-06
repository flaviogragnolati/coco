import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/better-auth", () => ({
	auth: { api: { getSession: vi.fn() } },
}));

import { createCallerFactory } from "~/server/api/trpc";
import { profileRouter } from "./profile.router";

const updateMany = vi.fn();

function context(signedIn: boolean) {
	return {
		db: { user: { updateMany } },
		headers: new Headers(),
		session: signedIn
			? {
					session: { id: "session-1" },
					user: {
						id: "user-1",
						name: "Persona",
						role: "user",
						active: true,
						deleted: false,
					},
				}
			: null,
	} as never;
}

const caller = createCallerFactory(profileRouter);

beforeEach(() => {
	vi.clearAllMocks();
	updateMany.mockResolvedValue({ count: 1 });
});

describe("profile.answerTutorialInvitation", () => {
	it("stamps only the caller's own unanswered row", async () => {
		await expect(
			caller(context(true)).answerTutorialInvitation(),
		).resolves.toBeUndefined();

		expect(updateMany).toHaveBeenCalledWith({
			where: { id: "user-1", tutorialInvitationAnsweredAt: null },
			data: { tutorialInvitationAnsweredAt: expect.any(Date) },
		});
	});

	it("does not fail when the invitation was already answered", async () => {
		updateMany.mockResolvedValue({ count: 0 });

		await expect(
			caller(context(true)).answerTutorialInvitation(),
		).resolves.toBeUndefined();
	});

	it("rejects a caller without a session", async () => {
		await expect(
			caller(context(false)).answerTutorialInvitation(),
		).rejects.toBeInstanceOf(TRPCError);
		expect(updateMany).not.toHaveBeenCalled();
	});
});
