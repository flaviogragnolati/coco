import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./supplier-application.data", () => ({
	createSupplierApplication: vi.fn(),
}));

import { createSupplierApplication } from "./supplier-application.data";
import { submit } from "./supplier-application.service";

const application = {
	contactName: "Ana Pérez",
	companyName: "Distribuidora Sur",
	email: "ana@distribuidorasur.com.ar",
	phone: null,
	offering: "Yerba por bulto",
};
const database = {} as never;

beforeEach(() => {
	vi.clearAllMocks();
});

describe("supplier application submit", () => {
	it("stores the application without the honeypot field", async () => {
		await submit({ ...application, website: "" }, database);

		expect(createSupplierApplication).toHaveBeenCalledWith(
			database,
			application,
		);
	});

	it("stores it when the honeypot never arrives", async () => {
		await submit(application, database);

		expect(createSupplierApplication).toHaveBeenCalledOnce();
	});

	it("drops a submission whose honeypot is filled without failing", async () => {
		await expect(
			submit({ ...application, website: "https://spam.example" }, database),
		).resolves.toBeUndefined();

		expect(createSupplierApplication).not.toHaveBeenCalled();
	});
});
