import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
	BETTER_AUTH_SECRET: "test-secret" as string | undefined,
}));

vi.mock("server-only", () => ({}));
vi.mock("~/env", () => ({ env: mockEnv }));
vi.mock("./supplier-application.data", () => ({
	countSupplierApplicationsSince: vi.fn(),
	createSupplierApplication: vi.fn(),
}));

import {
	countSupplierApplicationsSince,
	createSupplierApplication,
} from "./supplier-application.data";
import { submit } from "./supplier-application.service";

const application = {
	contactName: "Ana Pérez",
	companyName: "Distribuidora Sur",
	email: "ana@distribuidorasur.com.ar",
	phone: null,
	offering: "Yerba por bulto",
};
const database = {} as never;
const clientIp = "190.12.34.56";

function storedIpHash() {
	return vi.mocked(createSupplierApplication).mock.calls[0]?.[2];
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useRealTimers();
	mockEnv.BETTER_AUTH_SECRET = "test-secret";
	vi.mocked(countSupplierApplicationsSince).mockResolvedValue(0);
	vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

describe("supplier application submit", () => {
	it("stores the application without the honeypot field", async () => {
		await submit({ ...application, website: "" }, database, clientIp);

		expect(createSupplierApplication).toHaveBeenCalledWith(
			database,
			application,
			expect.any(String),
		);
	});

	it("stores it when the honeypot never arrives", async () => {
		await submit(application, database, clientIp);

		expect(createSupplierApplication).toHaveBeenCalledOnce();
	});

	it("drops a submission whose honeypot is filled without failing", async () => {
		vi.mocked(countSupplierApplicationsSince).mockResolvedValue(3);

		await expect(
			submit(
				{ ...application, website: "https://spam.example" },
				database,
				clientIp,
			),
		).resolves.toBeUndefined();

		expect(countSupplierApplicationsSince).not.toHaveBeenCalled();
		expect(createSupplierApplication).not.toHaveBeenCalled();
	});
});

describe("supplier application rate limit", () => {
	it("counts the sender's applications of the last hour", async () => {
		vi.useFakeTimers({ now: new Date("2026-10-09T15:00:00.000Z") });
		vi.mocked(countSupplierApplicationsSince).mockResolvedValue(2);

		await submit(application, database, clientIp);

		expect(countSupplierApplicationsSince).toHaveBeenCalledWith(
			database,
			storedIpHash(),
			new Date("2026-10-09T14:00:00.000Z"),
		);
		expect(createSupplierApplication).toHaveBeenCalledOnce();
	});

	it("refuses the fourth application within the hour", async () => {
		vi.mocked(countSupplierApplicationsSince).mockResolvedValue(3);

		await expect(submit(application, database, clientIp)).rejects.toMatchObject(
			{
				code: "TOO_MANY_REQUESTS",
				message:
					"Ya recibimos tu solicitud. Si necesitás algo más, escribinos.",
			},
		);
		expect(createSupplierApplication).not.toHaveBeenCalled();
	});

	it("stores a keyed hash, never the raw IP", async () => {
		await submit(application, database, clientIp);
		const hash = storedIpHash();

		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hash).not.toContain(clientIp);

		vi.clearAllMocks();
		mockEnv.BETTER_AUTH_SECRET = "another-secret";
		await submit(application, database, clientIp);

		expect(storedIpHash()).not.toBe(hash);
	});

	it("gives the same sender the same hash", async () => {
		await submit(application, database, clientIp);
		const first = storedIpHash();
		vi.clearAllMocks();

		await submit(application, database, clientIp);

		expect(storedIpHash()).toBe(first);
	});

	it.each([
		["no client IP", null, "test-secret"],
		["no secret", clientIp, undefined],
	])("lets the application through with %s", async (_, ip, secret) => {
		mockEnv.BETTER_AUTH_SECRET = secret;

		await submit(application, database, ip);

		expect(countSupplierApplicationsSince).not.toHaveBeenCalled();
		expect(createSupplierApplication).toHaveBeenCalledWith(
			database,
			application,
			null,
		);
	});
});
