/**
 * The customer tutorial as data: both versions' steps and copy, the scene each
 * step shows, the element it highlights and the URL that encodes a position.
 * Scenes are simulated over fixtures (ADR 0012), so every step declares its
 * whole scene state and going back is just a lower index. No React, no I/O.
 */

import type { CheckoutStepId } from "~/app/(storefront)/checkout/_components/checkout-steps";
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
	"checkout-stepper",
	"checkout-delivery",
	"checkout-payment",
	"checkout-review",
	"checkout-result",
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
	| { id: "cart" }
	| { id: "checkout"; step: CheckoutStepId }
	| { id: "checkoutResult" }
	| { id: "myOrders" }
	| { id: "orderDetail"; journey: TutorialJourneyPoint };

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
	cart: ["cart-lines", "cart-summary"],
	checkout: [
		"checkout-stepper",
		"checkout-delivery",
		"checkout-payment",
		"checkout-review",
	],
	checkoutResult: ["checkout-result"],
	myOrders: ["my-orders-list"],
	orderDetail: ["order-journey"],
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
const cart = { id: "cart" } as const;

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
		body: "CoCo suma los pedidos de todos para comprar al precio mayorista. No somos una distribuidora: coordinamos la compra por vos.",
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
		body: "Con − y + sumás o restás de a 500 g desde el mínimo. Al sumar, ves el total en tu pedido.",
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
		title: "Listo para pagar",
		body: "Acá ves el total estimado y, debajo, cuánto pagás si elegís transferencia. Para pagar te pedimos ingresar con tu cuenta de Google.",
	},
	checkoutSteps: {
		id: "checkout-steps",
		scene: { id: "checkout", step: "order" },
		target: "checkout-stepper",
		title: "Cuatro pasos",
		body: "Pedido, Entrega, Pago y Confirmar. Podés volver a cualquier paso antes de confirmar.",
	},
	checkoutDelivery: {
		id: "checkout-delivery",
		scene: { id: "checkout", step: "delivery" },
		target: "checkout-delivery",
		title: "Cómo lo recibís",
		body: "Te lo llevamos a tu dirección o lo retirás en un punto de retiro. Las dos opciones cuestan lo mismo.",
	},
	checkoutPayment: {
		id: "checkout-payment",
		scene: { id: "checkout", step: "payment" },
		target: "checkout-payment",
		title: "Cómo pagás",
		body: "Con Mercado Pago pagás con tarjeta, dinero en cuenta o efectivo. Si preferís transferir, elegí pago externo: ves el total con el descuento y te damos los datos al confirmar.",
	},
	checkoutReview: {
		id: "checkout-review",
		scene: { id: "checkout", step: "review" },
		target: "checkout-review",
		title: "Confirmás y pagás",
		body: "Revisás todo, aceptás los términos y pagás. Al confirmar, los precios y las cantidades quedan fijos.",
	},
	paymentApproved: {
		id: "payment-approved",
		scene: { id: "checkoutResult" },
		target: "checkout-result",
		title: "Pago aprobado",
		body: "Tu pedido quedó confirmado. Desde ahora lo seguís en Mis pedidos.",
	},
	myOrders: {
		id: "my-orders",
		scene: { id: "myOrders" },
		target: "my-orders-list",
		title: "Mis pedidos",
		body: "Acá están todos tus pedidos con su estado.",
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
		body: "CoCo agrupa los pedidos de todos para armar una sola compra mayorista.",
	},
	{
		id: "journey-supplier",
		scene: { id: "orderDetail", journey: "supplier" },
		target: "order-journey",
		title: "Proveedor",
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
		title: "Envío",
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
		steps.checkoutSteps,
		steps.checkoutDelivery,
		steps.checkoutPayment,
		steps.paymentApproved,
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
		steps.checkoutSteps,
		steps.checkoutDelivery,
		steps.checkoutPayment,
		steps.checkoutReview,
		steps.paymentApproved,
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
