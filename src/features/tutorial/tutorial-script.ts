/**
 * The customer tutorial as data: both versions' steps and copy, the scene each
 * step shows, the element it highlights and the URL that encodes a position.
 * Scenes are simulated over fixtures (ADR 0012), so every step declares its
 * whole scene state and going back is just a lower index. No React, no I/O.
 */

import type { UserTrackingStageKey } from "~/shared/common/tracking-display";

export type TutorialVersion = "rapido" | "completo";

export const TUTORIAL_VERSIONS: TutorialVersion[] = ["rapido", "completo"];

export const tutorialVersionMeta: Record<
	TutorialVersion,
	{ label: string; duration: string }
> = {
	rapido: { label: "Tutorial rápido", duration: "1 min" },
	completo: { label: "Tutorial completo", duration: "3 min" },
};

export const TUTORIAL_TARGETS = [
	"home-how-it-works",
	"catalog-categories",
	"product-card",
	"product-purchase",
	"mini-cart",
	"cart-lines",
	"cart-summary",
	"cart-finish",
	"finish-delivery",
	"finish-payment",
	"finish-confirm",
	"order-arrival",
	"my-orders-list",
	"order-journey",
] as const;

export type TutorialTargetId = (typeof TUTORIAL_TARGETS)[number];

export const TUTORIAL_TARGET_ATTRIBUTE = "data-tutorial-target";

export function tutorialTarget(id: TutorialTargetId): {
	"data-tutorial-target": TutorialTargetId;
} {
	return { [TUTORIAL_TARGET_ATTRIBUTE]: id } as {
		"data-tutorial-target": TutorialTargetId;
	};
}

/** `"delivered"` is past the last stage: every stage done, the order completed. */
export type TutorialJourneyPoint = UserTrackingStageKey | "delivered";

export type TutorialScene =
	| { id: "home" }
	/** `added`: the first product is in the order and the mini-cart is open. */
	| { id: "catalog"; added: boolean }
	/**
	 * The order page (ADR 0015): as a guest, or signed in with the "Finalizar"
	 * panel and, when `sheet` is set, its delivery or payment sheet open.
	 */
	| { id: "cart"; signedIn: boolean; sheet: "delivery" | "payment" | null }
	| { id: "myOrders" }
	/** `arrival`: back from Mercado Pago, with the arrival banner. */
	| { id: "orderDetail"; journey: TutorialJourneyPoint; arrival?: "mp" };

export type TutorialSceneId = TutorialScene["id"];

/** What each scene can highlight; the scenes render exactly these targets. */
export const targetsByScene: Record<
	TutorialSceneId,
	readonly TutorialTargetId[]
> = {
	home: ["home-how-it-works"],
	catalog: [
		"catalog-categories",
		"product-card",
		"product-purchase",
		"mini-cart",
	],
	cart: [
		"cart-lines",
		"cart-summary",
		"cart-finish",
		"finish-delivery",
		"finish-payment",
		"finish-confirm",
	],
	myOrders: ["my-orders-list"],
	orderDetail: ["order-journey", "order-arrival"],
};

export type TutorialStep = {
	id: string;
	scene: TutorialScene;
	/** `null` shows the step as a centered dialog over the dimmed scene. */
	target: TutorialTargetId | null;
	title: string;
	body: string;
	/** The last step: the player swaps "Siguiente" for the version's closing actions. */
	closing?: true;
};

const home = { id: "home" } as const;
const catalog = { id: "catalog", added: false } as const;
const catalogAdded = { id: "catalog", added: true } as const;
const cart = { id: "cart", signedIn: false, sheet: null } as const;
const finish = { id: "cart", signedIn: true, sheet: null } as const;

const steps = {
	intro: {
		id: "intro",
		scene: home,
		target: null,
		title: "Así es una compra en CoCo",
		body: "Te mostramos una compra completa, desde el catálogo hasta la entrega. Todo es de ejemplo: no se compra ni se guarda nada.",
	},
	howItWorks: {
		id: "how-it-works",
		scene: home,
		target: "home-how-it-works",
		title: "Comprás junto a otros vecinos",
		body: "CoCo junta los pedidos de todos los vecinos y hace una sola compra al por mayor. Cerramos los miércoles y la mercadería llega en 7 a 10 días.",
	},
	catalogSearch: {
		id: "catalog-search",
		scene: catalog,
		target: "catalog-categories",
		title: "Encontrá lo que buscás",
		body: "Usá el buscador o las categorías para recorrer el catálogo.",
	},
	stepPrice: {
		id: "step-price",
		scene: catalog,
		target: "product-card",
		title: "Precio por paso",
		body: "$ 11.300 es lo que pagás por 500 g, el paso en que se vende. El precio por kg de abajo te sirve para comparar productos.",
	},
	stepQuantity: {
		id: "step-quantity",
		scene: catalog,
		target: "product-purchase",
		title: "Cantidad de a pasos",
		body: "Con Sumar agregás el mínimo, 500 g. Después, con − y + cambiás la cantidad de a 500 g, y el tachito lo saca de tu pedido.",
	},
	miniCart: {
		id: "mini-cart",
		scene: catalogAdded,
		target: "mini-cart",
		title: "Tu pedido se arma acá",
		body: "Al agregar, se abre Tu pedido. Podés cambiar cantidades, seguir comprando o ver el pedido completo.",
	},
	cartEdit: {
		id: "cart-edit",
		scene: cart,
		target: "cart-lines",
		title: "Cambiá lo que quieras",
		body: "Hasta que empezás a pagar, podés cambiar cantidades o sacar productos. Para el ejemplo sumamos dos productos más.",
	},
	cartSummary: {
		id: "cart-summary",
		scene: cart,
		target: "cart-summary",
		title: "Listo para finalizar",
		body: "Acá ves el total y, debajo, cuánto pagás si elegís transferencia. Para finalizar te pedimos ingresar con tu cuenta de Google.",
	},
	finish: {
		id: "finish",
		scene: finish,
		target: "cart-finish",
		title: "Finalizás en la misma pantalla",
		body: "Con tu cuenta, al lado de tus productos elegís la entrega y el pago. Hasta que confirmás, podés seguir cambiando cantidades.",
	},
	finishDelivery: {
		id: "finish-delivery",
		scene: { id: "cart", signedIn: true, sheet: "delivery" },
		target: "finish-delivery",
		title: "Cómo lo recibís",
		body: "Te lo llevamos a tu dirección o lo retirás en un punto de retiro. Las dos opciones cuestan lo mismo.",
	},
	finishPayment: {
		id: "finish-payment",
		scene: { id: "cart", signedIn: true, sheet: "payment" },
		target: "finish-payment",
		title: "Cómo pagás",
		body: "Con Mercado Pago pagás con tarjeta, dinero en cuenta o efectivo. Por transferencia ves el total con el descuento y te damos los datos al confirmar.",
	},
	finishConfirm: {
		id: "finish-confirm",
		scene: finish,
		target: "finish-confirm",
		title: "Confirmás",
		body: "Aceptás los términos y confirmás. Desde ese momento los precios y las cantidades quedan fijos.",
	},
	orderArrival: {
		id: "order-arrival",
		scene: { id: "orderDetail", journey: "submitted", arrival: "mp" },
		target: "order-arrival",
		title: "Volvés a tu pedido",
		body: "Después de pagar caés en tu pedido, ya confirmado. Si elegiste transferencia, ahí mismo ves los datos para transferir.",
	},
	myOrders: {
		id: "my-orders",
		scene: { id: "myOrders" },
		target: "my-orders-list",
		title: "Mis pedidos",
		body: "Acá están todos tus pedidos con su estado. Al lado ves el que abriste.",
	},
	journeyOverview: {
		id: "journey-overview",
		scene: { id: "orderDetail", journey: "shipping" },
		target: "order-journey",
		title: "Seguís cada etapa",
		body: "Tu pedido pasa por seis etapas, de la confirmación a la entrega, y te avisamos cada cambio. Suele tardar entre 7 y 10 días desde la preparación.",
	},
} satisfies Record<string, TutorialStep>;

/** One step per journey stage, in `userTrackingStageDefinitions` order. */
const journeySteps: TutorialStep[] = [
	{
		id: "journey-submitted",
		scene: { id: "orderDetail", journey: "submitted" },
		target: "order-journey",
		title: "Pedido confirmado",
		body: "Tu pedido quedó registrado junto al de otros vecinos.",
	},
	{
		id: "journey-preparation",
		scene: { id: "orderDetail", journey: "preparation" },
		target: "order-journey",
		title: "Preparación",
		body: "CoCo agrupa los pedidos de todos para armar una sola compra grande.",
	},
	{
		id: "journey-supplier",
		scene: { id: "orderDetail", journey: "supplier" },
		target: "order-journey",
		title: "Compra al proveedor",
		body: "Le compramos al proveedor la cantidad total. El pedido sale desde origen, muchas veces desde otra provincia.",
	},
	{
		id: "journey-packaging",
		scene: { id: "orderDetail", journey: "packaging" },
		target: "order-journey",
		title: "Empaque",
		body: "Se arma el paquete con tus productos, listo para viajar.",
	},
	{
		id: "journey-shipping",
		scene: { id: "orderDetail", journey: "shipping" },
		target: "order-journey",
		title: "En viaje",
		body: "El camión cruza a Chile, atraviesa el Estrecho de Magallanes en balsa, vuelve a la Argentina y cruza la cordillera hasta Ushuaia.",
	},
	{
		id: "journey-delivery",
		scene: { id: "orderDetail", journey: "delivery" },
		target: "order-journey",
		title: "Entrega",
		body: "Te lo llevamos a tu dirección. Si elegiste un punto de retiro, lo buscás en el horario indicado.",
	},
];

const delivered = { id: "orderDetail", journey: "delivered" } as const;

export const tutorialScripts: Record<TutorialVersion, TutorialStep[]> = {
	rapido: [
		steps.intro,
		steps.howItWorks,
		steps.stepPrice,
		steps.miniCart,
		steps.cartSummary,
		steps.finish,
		steps.finishDelivery,
		steps.finishPayment,
		steps.orderArrival,
		steps.myOrders,
		steps.journeyOverview,
		{
			id: "done",
			scene: delivered,
			target: null,
			title: "¡Listo!",
			body: "Así es una compra en CoCo. ¿Querés ver cada etapa en detalle?",
			closing: true,
		},
	],
	completo: [
		steps.intro,
		steps.howItWorks,
		steps.catalogSearch,
		steps.stepPrice,
		steps.stepQuantity,
		steps.miniCart,
		steps.cartEdit,
		steps.cartSummary,
		steps.finish,
		steps.finishDelivery,
		steps.finishPayment,
		steps.finishConfirm,
		steps.orderArrival,
		steps.myOrders,
		...journeySteps,
		{
			id: "done",
			scene: delivered,
			target: null,
			title: "¡Listo!",
			body: "Ya viste todo el camino de una compra. Cuando quieras, armá tu pedido.",
			closing: true,
		},
	],
};

export const TUTORIAL_PATH = "/tutorial";

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function isTutorialVersion(
	value: string | undefined,
): value is TutorialVersion {
	return value === "rapido" || value === "completo";
}

function isTutorialPath(path: string) {
	return (
		path === TUTORIAL_PATH ||
		path.startsWith(`${TUTORIAL_PATH}/`) ||
		path.startsWith(`${TUTORIAL_PATH}?`) ||
		path.startsWith(`${TUTORIAL_PATH}#`)
	);
}

const SAME_ORIGIN_PROBE = "https://tutorial.invalid";

/**
 * The login callback's path rules, re-stated here, then checked the way the
 * router will read the path: the URL parser strips tabs and newlines and reads
 * `\\` as `/`, so `"/\t/evil.com"` passes a string test yet leaves the site.
 * Never the tutorial itself either, so an exit always leaves it.
 */
export function safeTutorialReturnTo(value: string | string[] | undefined) {
	const candidate = first(value);
	if (!candidate) return "/";
	if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/";
	if (candidate.includes("://")) return "/";

	let url: URL;
	try {
		url = new URL(candidate, SAME_ORIGIN_PROBE);
	} catch {
		return "/";
	}
	if (url.origin !== SAME_ORIGIN_PROBE) return "/";

	const path = `${url.pathname}${url.search}${url.hash}`;
	return isTutorialPath(path) ? "/" : path;
}

export function parseTutorialParams(params: {
	version?: string | string[];
	paso?: string | string[];
	volver?: string | string[];
}): { version: TutorialVersion; stepIndex: number; returnTo: string } {
	const rawVersion = first(params.version);
	const version = isTutorialVersion(rawVersion) ? rawVersion : "rapido";
	const lastIndex = tutorialScripts[version].length - 1;

	const paso = Number.parseInt(first(params.paso) ?? "", 10);
	const stepIndex =
		Number.isNaN(paso) || paso <= 0 ? 0 : Math.min(paso - 1, lastIndex);

	return { version, stepIndex, returnTo: safeTutorialReturnTo(params.volver) };
}

export function tutorialHref(input: {
	version: TutorialVersion;
	stepIndex?: number;
	returnTo?: string;
}) {
	const search = new URLSearchParams({ version: input.version });
	if (input.stepIndex !== undefined && input.stepIndex > 0) {
		search.set("paso", String(input.stepIndex + 1));
	}
	const returnTo = safeTutorialReturnTo(input.returnTo);
	if (returnTo !== "/") search.set("volver", returnTo);
	return `${TUTORIAL_PATH}?${search.toString()}`;
}
