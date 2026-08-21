import { describe, expect, it } from "vitest";

import type { QaTicketStats } from "~/shared/common/admin-crud/qa-ticket.types";
import {
	buildQaTicketKpis,
	QA_TICKET_RATE_PLACEHOLDER,
} from "./qa-ticket-kpis";

const emptyStats: QaTicketStats = {
	total: 0,
	pending: 0,
	inProgress: 0,
	passed: 0,
	failed: 0,
	blocked: 0,
	skipped: 0,
	needsClarification: 0,
	deleted: 0,
};

function kpis(overrides: Partial<QaTicketStats> = {}) {
	const items = buildQaTicketKpis({ ...emptyStats, ...overrides });
	return Object.fromEntries(items.map((item) => [item.label, item.value]));
}

describe("buildQaTicketKpis", () => {
	it("returns the four headline cards in a stable order", () => {
		expect(buildQaTicketKpis(emptyStats).map((item) => item.label)).toEqual([
			"Activos",
			"Ejecutados",
			"Tasa OK",
			"Por aclarar",
		]);
	});

	it("shows no rate and an empty board when there is nothing loaded", () => {
		expect(kpis()).toEqual({
			Activos: 0,
			Ejecutados: "0 / 0",
			"Tasa OK": QA_TICKET_RATE_PLACEHOLDER,
			"Por aclarar": 0,
		});
	});

	it("excludes deleted tickets from the active count", () => {
		expect(kpis({ total: 69, deleted: 4 }).Activos).toBe(65);
	});

	it("shows no rate while every active ticket is still pending", () => {
		expect(kpis({ total: 10, pending: 10 })).toMatchObject({
			Ejecutados: "0 / 10",
			"Tasa OK": QA_TICKET_RATE_PLACEHOLDER,
		});
	});

	it("explains the dash in words for a screen reader", () => {
		const rate = buildQaTicketKpis(emptyStats).find(
			(item) => item.label === "Tasa OK",
		);

		expect(rate?.value).toBe(QA_TICKET_RATE_PLACEHOLDER);
		expect(rate?.description).toBe("Todavía no se ejecutó ningún caso");
	});

	it("counts only passed and failed as executed", () => {
		expect(
			kpis({
				total: 20,
				passed: 6,
				failed: 2,
				blocked: 3,
				skipped: 4,
				needsClarification: 5,
			}),
		).toMatchObject({
			Activos: 20,
			Ejecutados: "8 / 20",
			"Tasa OK": "75%",
			"Por aclarar": 5,
		});
	});

	it("keeps an interruption out of the rate it would otherwise lower", () => {
		const withoutInterruptions = kpis({ total: 10, passed: 5, failed: 5 });
		const withInterruptions = kpis({
			total: 10,
			passed: 5,
			failed: 5,
			blocked: 10,
			skipped: 10,
			needsClarification: 10,
		});

		expect(withInterruptions["Tasa OK"]).toBe(withoutInterruptions["Tasa OK"]);
		expect(withInterruptions.Ejecutados).toBe(withoutInterruptions.Ejecutados);
	});

	it("rounds the rate to a whole percent", () => {
		expect(kpis({ total: 3, passed: 1, failed: 2 })["Tasa OK"]).toBe("33%");
		expect(kpis({ total: 3, passed: 2, failed: 1 })["Tasa OK"]).toBe("67%");
		expect(kpis({ total: 8, passed: 1, failed: 7 })["Tasa OK"]).toBe("13%");
	});

	it("reports the extremes without rounding them away", () => {
		expect(kpis({ total: 4, passed: 4 })["Tasa OK"]).toBe("100%");
		expect(kpis({ total: 4, failed: 4 })["Tasa OK"]).toBe("0%");
		expect(kpis({ total: 400, passed: 399, failed: 1 })["Tasa OK"]).toBe(
			"100%",
		);
	});
});
