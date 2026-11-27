import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { PrismaClient } from "~/prisma/client";
import { createCallerFactory } from "~/server/api/trpc";
import { notificationRouter } from "./notification.router";

vi.mock("server-only", () => ({}));
vi.mock("~/server/better-auth", () => ({ auth: { api: {} } }));
vi.mock("~/server/db", () => ({ db: {} }));

const caller = createCallerFactory(notificationRouter);
let database: PrismaClient;

function session(role?: "admin" | "superadmin" | "user", active = true) {
	return caller({
		db: database,
		headers: new Headers(),
		session: role ? { user: { role, active, deleted: false } } : null,
	} as never);
}

afterEach(() => vi.unstubAllEnvs());
describe("permisos del historial de notificaciones", () => {
	it.each([
		[undefined, true, "UNAUTHORIZED"],
		["user", true, "FORBIDDEN"],
		["admin", false, "FORBIDDEN"],
	] as const)("protege las tres lecturas para %s, activo %s", async (role, active, code) => {
		const api = session(role, active);
		await Promise.all([
			expect(api.list({})).rejects.toMatchObject({ code }),
			expect(api.getById({ id: "privado" })).rejects.toMatchObject({ code }),
			expect(api.summarizeOrders({ orderIds: [1] })).rejects.toMatchObject({
				code,
			}),
		]);
	});
	it.each([
		"admin",
		"superadmin",
	] as const)("da acceso al %s activo y respeta el modo apagado", async (role) => {
		vi.stubEnv("CUSTOMER_EMAIL_MODE", "off");
		const api = session(role);
		expect(await api.list({})).toEqual({
			items: [],
			pageCount: 0,
			total: 0,
			mode: "off",
		});
		expect(await api.summarizeOrders({ orderIds: [3, 3] })).toEqual({
			orders: [{ orderId: 3, total: 0, accepted: 0 }],
			mode: "off",
		});
		await expect(api.getById({ id: "privado" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});

const url = process.env.EMAIL_DISPATCH_TEST_DATABASE_URL;
describe.skipIf(!url)("historial y resumen en PostgreSQL", () => {
	const fixture = randomUUID();
	let orderId: number;
	let otherOrderId: number;
	let acceptedId: string;
	let pendingId: string;
	let otherPartitionId: string;

	beforeAll(async () => {
		const target = new URL(url ?? "");
		if (
			!["127.0.0.1", "localhost"].includes(target.hostname) ||
			!target.pathname.endsWith("_test") ||
			target.search
		)
			throw new Error("Se requiere una base local descartable *_test.");
		database = new PrismaClient({
			adapter: new PrismaPg({ connectionString: url }),
		});
		await database.user.create({
			data: {
				id: fixture,
				name: "Compradora de prueba",
				email: `${fixture}@example.org`,
			},
		});
		const cart = await database.cart.create({
			data: { userId: fixture, code: fixture },
		});
		const createOrder = (code: string) =>
			database.userOrder.create({
				data: { cartId: cart.id, code, userId: fixture },
			});
		orderId = (await createOrder(`ORD-${fixture}`)).id;
		otherOrderId = (await createOrder(`OTRO-${fixture}`)).id;
		const data = {
			environment: `test/${fixture}`,
			orderId,
			notice: { kind: "transfer", version: 1 },
			updatedAt: new Date("2026-01-01T00:00:00Z"),
		};
		acceptedId = (
			await database.customerEmailDelivery.create({
				data: {
					...data,
					status: "accepted",
					eventKey: "transfer",
					providerId: fixture,
					attempts: 2,
					request: {
						to: "casilla-original@example.org",
						subject: "Asunto original",
						html: "<p>Correo original</p>",
						text: "Correo original",
						from: "Coco <pedidos@example.org>",
					},
				},
			})
		).id;
		pendingId = (
			await database.customerEmailDelivery.create({
				data: {
					...data,
					status: "pending",
					eventKey: "confirm",
					notice: { kind: "confirmed", version: 1 },
				},
			})
		).id;
		otherPartitionId = (
			await database.customerEmailDelivery.create({
				data: {
					...data,
					environment: `live/${fixture}`,
					status: "accepted",
					eventKey: "transfer",
				},
			})
		).id;
		await database.customerEmailDelivery.create({
			data: {
				...data,
				orderId: otherOrderId,
				notice: { version: 9 },
				eventKey: "legacy",
				status: "review",
			},
		});
	});
	afterAll(async () => {
		if (!database) return;
		await database.customerEmailDelivery.deleteMany({
			where: { order: { userId: fixture } },
		});
		await database.userOrder.deleteMany({ where: { userId: fixture } });
		await database.cart.deleteMany({ where: { userId: fixture } });
		await database.user.deleteMany({ where: { id: fixture } });
		await database.$disconnect();
	});
	function history() {
		vi.stubEnv("CUSTOMER_EMAIL_MODE", "test");
		vi.stubEnv("CUSTOMER_EMAIL_ENVIRONMENT", fixture);
		vi.stubEnv("CUSTOMER_EMAIL_DISPATCH", "false");
		return session("admin");
	}
	it("muestra el contenido congelado y aísla el detalle aunque se conozca el ID", async () => {
		const api = history();
		const list = await api.list({});
		expect(list).toMatchObject({
			mode: "test",
			total: 1,
			items: [
				{
					id: acceptedId,
					to: "casilla-original@example.org",
					subject: "Asunto original",
				},
			],
		});
		expect(list.items[0]).not.toHaveProperty("html");
		expect(await api.getById({ id: acceptedId })).toMatchObject({
			html: "<p>Correo original</p>",
			text: "Correo original",
			attempts: 2,
			providerId: fixture,
		});
		expect(await api.getById({ id: pendingId })).toMatchObject({
			html: null,
			to: null,
			subject: null,
		});
		await expect(api.getById({ id: otherPartitionId })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
	it("pagina con desempate estable y suma por pedido, aun con intentos repetidos", async () => {
		const api = history();
		const input = {
			status: "all" as const,
			orderCode: `ord-${fixture}`,
			pageSize: 1,
		};
		const [first, second, empty, legacy] = await Promise.all([
			api.list(input),
			api.list({ ...input, page: 2 }),
			api.list({ ...input, page: 3 }),
			api.list({ status: "all", orderId: otherOrderId }),
		]);
		expect(first).toMatchObject({ total: 2, pageCount: 2 });
		expect([first.items[0]?.id, second.items[0]?.id]).toEqual(
			[acceptedId, pendingId].sort().reverse(),
		);
		expect(empty.items).toEqual([]);
		expect(legacy).toMatchObject({
			total: 1,
			items: [{ kind: null, status: "review" }],
		});
		expect(
			await api.summarizeOrders({ orderIds: [orderId, otherOrderId, orderId] }),
		).toEqual({
			mode: "test",
			orders: [
				{ orderId, accepted: 1, total: 2 },
				{ orderId: otherOrderId, accepted: 0, total: 1 },
			],
		});
	});
});
