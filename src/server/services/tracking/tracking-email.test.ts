import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "~/prisma/client";
import { trackingEmailIndicators } from "./tracking-email";

vi.mock("server-only", () => ({}));

type Event = Parameters<typeof trackingEmailIndicators>[1][number];
const base = {
	cartItemId: 10,
	shipmentId: null,
	rollOverId: null,
	metadata: null,
};
function event(
	id: number,
	eventType: Event["eventType"],
	fields: Partial<Event> = {},
): Event {
	return { ...base, id, eventType, ...fields };
}
const owner = (sourceCartItemId: number, userOrderId: number) => ({
	sourceCartItemId,
	userOrderId,
});
function database(
	items: ReturnType<typeof owner>[],
	rows: unknown[],
	rollovers: unknown[] = [],
) {
	const mocks = {
		userOrderItem: { findMany: vi.fn().mockResolvedValue(items) },
		$queryRaw: vi.fn().mockResolvedValue(rows),
		rollOver: { findMany: vi.fn().mockResolvedValue(rollovers) },
	};
	return {
		mocks,
		db: mocks as unknown as Parameters<typeof trackingEmailIndicators>[0],
	};
}
const delivery = (
	orderId: number,
	notice: Record<string, unknown>,
	status = "accepted",
	quantityKey: string | null = null,
) => ({ orderId, notice: { version: 1, ...notice }, status, quantityKey });

beforeEach(() => {
	vi.stubEnv("CUSTOMER_EMAIL_MODE", "test");
	vi.stubEnv("CUSTOMER_EMAIL_ENVIRONMENT", "tracking");
});
afterEach(() => vi.unstubAllEnvs());

describe("correos en tracking administrativo", () => {
	it("asocia por intento y ocurrencia, incluso cuando el carrito respalda dos pedidos", async () => {
		const owners = [owner(10, 5), owner(10, 6)];
		const one = "2026-05-01T00:00:00.000Z";
		const two = "2026-05-02T00:00:00.000Z";
		const data = database(owners, [
			delivery(5, { kind: "confirmed", attemptId: 31 }, "pending"),
			delivery(6, { kind: "confirmed", attemptId: 44 }),
			delivery(
				6,
				{
					kind: "change",
					capturedAt: one,
					reason: "mudanza",
					change: "cambio",
				},
				"skipped",
			),
			delivery(
				6,
				{ kind: "change", capturedAt: two, reason: "viaje", change: "cambio" },
				"review",
			),
		]);
		const confirmed = (id: number, orderId: string, transactionId: string) =>
			event(id, "submittedToOrder", {
				metadata: { refs: { orderId, transactionId } },
			});
		const change = (id: number, date: string) =>
			event(id, "deliveryPreferenceChanged", {
				metadata: {
					refs: { orderId: "6" },
					domainEventKey: `admin:userOrder:6:deliveryPreferenceChanged:${date}`,
				},
			});
		const result = await trackingEmailIndicators(data.db, [
			confirmed(1, "5", "31"),
			confirmed(2, "6", "44"),
			confirmed(3, "6", "31"),
			change(4, one),
			change(5, two),
			event(6, "submittedToOrder"),
			event(7, "packaged"),
		]);
		expect(result.get(1)).toEqual({
			status: "pending",
			orderId: 5,
			test: true,
		});
		expect(result.get(2)).toEqual({
			status: "accepted",
			orderId: 6,
			test: true,
		});
		expect(result.get(3)?.status).toBe("missing");
		expect(result.get(4)?.status).toBe("skipped");
		expect(result.get(5)?.status).toBe("review");
		expect(result.get(6)).toEqual({
			status: "missing",
			orderId: null,
			test: true,
		});
		expect(result.has(7)).toBe(false);
		expect(data.mocks.$queryRaw).toHaveBeenCalledTimes(1);
		expect(data.mocks.$queryRaw.mock.calls[0]?.[1]).toBe("test/tracking");
	});
	it("atribuye el retiro del envío compartido al pedido y a los artículos del mail original", async () => {
		const pickup = (ids: number[]) => ({
			kind: "pickup",
			shipmentId: 101,
			allocations: ids.map((cartItemId) => ({
				cartItemId,
				packageId: cartItemId + 100,
				quantity: "1",
			})),
		});
		const { db } = database(
			[owner(10, 5), owner(11, 5), owner(12, 6)],
			[
				delivery(5, pickup([10, 11]), "accepted", "10:1"),
				delivery(6, pickup([12]), "pending"),
			],
		);
		const result = await trackingEmailIndicators(
			db,
			[10, 11, 12].map((cartItemId) =>
				event(cartItemId, "arrivedAtPickupPoint", {
					cartItemId,
					shipmentId: 101,
				}),
			),
		);
		expect(result.get(10)).toEqual({
			status: "accepted",
			orderId: 5,
			test: true,
		});
		expect(result.get(11)).toEqual({
			status: "missing",
			orderId: 5,
			test: true,
		});
		expect(result.get(12)).toEqual({
			status: "pending",
			orderId: 6,
			test: true,
		});
	});
	it("marca un único aviso de retiro parcial si dos paquetes traían el mismo ítem y sólo quedaba uno", async () => {
		const notice = {
			kind: "pickup",
			shipmentId: 110,
			allocations: [
				{ cartItemId: 10, packageId: 302, quantity: "2.25" },
				{ cartItemId: 10, packageId: 303, quantity: "1.25" },
			],
		};
		const { db } = database(
			[owner(10, 5)],
			[delivery(5, notice, "accepted", "10:1.25")],
		);
		const result = await trackingEmailIndicators(db, [
			event(1, "arrivedAtPickupPoint", { shipmentId: 110 }),
		]);
		expect(result.get(1)).toEqual({
			status: "accepted",
			orderId: 5,
			test: true,
			partialQuantity: true,
		});
	});
	it("distingue el total congelado de cada ítem de los rollovers que pudieron quedar fuera", async () => {
		const notice = { kind: "rollover", ids: [1, 2, 3], cause: "operation" };
		const rollovers = [
			{ id: 1, cartItemId: 10 },
			{ id: 2, cartItemId: 10 },
			{ id: 3, cartItemId: 11 },
		].map((r) => ({ ...r, quantity: new Prisma.Decimal(1) }));
		const { db } = database(
			[owner(10, 5), owner(11, 5)],
			[delivery(5, notice, "accepted", "10:1,11:1")],
			rollovers,
		);
		const events = rollovers.map((row) =>
			event(row.id, "rolledOverPreAllocation", {
				cartItemId: row.cartItemId,
				rollOverId: row.id,
			}),
		);
		const result = await trackingEmailIndicators(db, events);
		expect(Array.from(result.values(), (x) => x.status)).toEqual([
			"missing",
			"missing",
			"accepted",
		]);
		const complete = database(
			[owner(10, 5), owner(11, 5)],
			[delivery(5, notice, "accepted", "10:2,11:1")],
			rollovers,
		);
		const fulfilled = await trackingEmailIndicators(complete.db, events);
		expect(Array.from(fulfilled.values(), (x) => x.status)).toEqual([
			"accepted",
			"accepted",
			"accepted",
		]);
	});
	it("mantiene los datos históricos o desconocidos sin registro de envío", async () => {
		const { db } = database(
			[owner(10, 5)],
			[
				delivery(5, { kind: "confirmed", attemptId: 31, version: 7 }),
				delivery(5, { kind: "confirmed", attemptId: 32 }),
			],
		);
		const result = await trackingEmailIndicators(db, [
			event(1, "submittedToOrder", {
				metadata: { refs: { orderId: "5", transactionId: "31" } },
			}),
			event(2, "submittedToOrder", { metadata: { refs: { orderId: "5" } } }),
		]);
		for (const email of result.values())
			expect(email).toEqual({ status: "missing", orderId: 5, test: true });
	});
	it.each([
		"configuration",
		"read",
	])("preserva los eventos si el correo falla en %s y permite recuperar en otra lectura", async (failure) => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		try {
			const { db, mocks } = database(
				[owner(10, 5)],
				[delivery(5, { kind: "confirmed", attemptId: 31 })],
			);
			if (failure === "configuration")
				vi.stubEnv("CUSTOMER_EMAIL_ENVIRONMENT", "");
			else
				mocks.$queryRaw.mockRejectedValueOnce(
					new Error("casilla-privada@example.org"),
				);
			const events = [
				event(1, "submittedToOrder", {
					metadata: { refs: { orderId: "5", transactionId: "31" } },
				}),
				event(2, "packaged"),
			];
			const interrupted = await trackingEmailIndicators(db, events);
			expect([...interrupted.entries()]).toEqual([
				[1, { orderId: null, status: "unavailable", test: false }],
			]);
			expect(warn.mock.calls).toEqual([
				["[warn] trackingEmailIndicatorsUnavailable"],
			]);
			vi.stubEnv("CUSTOMER_EMAIL_ENVIRONMENT", "tracking");
			expect((await trackingEmailIndicators(db, events)).get(1)?.status).toBe(
				"accepted",
			);
		} finally {
			warn.mockRestore();
		}
	});
	it("desactivado muestra solo avisos aplicables y prescinde de la base", async () => {
		vi.stubEnv("CUSTOMER_EMAIL_MODE", "off");
		const { db, mocks } = database([], []);
		const result = await trackingEmailIndicators(db, [
			event(1, "submittedToOrder"),
			event(2, "rollOverResolved"),
		]);
		expect([...result.entries()]).toEqual([
			[1, { status: "off", orderId: null, test: false }],
		]);
		expect(mocks.userOrderItem.findMany).not.toHaveBeenCalled();
		expect(mocks.$queryRaw).not.toHaveBeenCalled();
	});
});
