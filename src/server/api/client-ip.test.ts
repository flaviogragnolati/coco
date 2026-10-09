import { describe, expect, it } from "vitest";

import { clientIpFrom } from "./client-ip";

describe("clientIpFrom", () => {
	it("takes the first x-forwarded-for entry", () => {
		const headers = new Headers({
			"x-forwarded-for": " 190.12.34.56 , 10.0.0.1",
			"x-real-ip": "10.0.0.2",
		});

		expect(clientIpFrom(headers)).toBe("190.12.34.56");
	});

	it("falls back to x-real-ip", () => {
		expect(clientIpFrom(new Headers({ "x-real-ip": "190.12.34.56" }))).toBe(
			"190.12.34.56",
		);
	});

	it.each([
		["no header", new Headers()],
		["blank headers", new Headers({ "x-forwarded-for": " ", "x-real-ip": "" })],
	])("returns null with %s", (_, headers) => {
		expect(clientIpFrom(headers)).toBeNull();
	});
});
