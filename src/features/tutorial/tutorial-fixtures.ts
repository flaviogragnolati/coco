/**
 * The tutorial's example purchase. Every amount goes through the cart's own
 * pricing helpers and every record has the shape of a real tRPC output, so the
 * scenes render exactly what the real screens would for this data. Ids are far
 * from real ones but positive, because the output schemas require it. Dates
 * derive from `now` only, so the server and the browser render the same text.
 */

import type { CheckoutDeliverySelection } from "~/app/(storefront)/checkout/_components/checkout-delivery-step";
import { toOrderJourneyItemInputs } from "~/app/(storefront)/my-orders/[orderId]/_components/order-detail-view";
import { catalogProductToCartItem } from "~/features/cart/cart-mappers";
import {
	buildCustomerOrderJourneyView,
	type CustomerOrderJourneyView,
} from "~/features/tracking/customer-order-journey";
import { weeklyClosingScheduleSchema } from "~/schemas/weekly-closing.schemas";
import type { CartItem, CartSnapshot } from "~/shared/common/cart.types";
import type {
	CatalogClientTerms,
	CatalogProductListItem,
} from "~/shared/common/catalog.types";
import type {
	CheckoutAddress,
	CheckoutPaymentMethod,
	CheckoutPaymentResult,
	CheckoutState,
	OrderDetail,
	OrderListOutput,
} from "~/shared/common/checkout.types";
import { buildCartSnapshot } from "~/shared/common/commerce.helpers";
import type { PickupPointData } from "~/shared/common/pickup-point-snapshot";
import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import { userTrackingStageDefinitions } from "~/shared/common/tracking-display";
import { DEFAULT_WEEKLY_CLOSING } from "~/shared/common/weekly-closing";
import type { TutorialJourneyPoint } from "./tutorial-script";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The example closing the home scene shows; the tutorial never reads the real one. */
export const tutorialWeeklyClosing = weeklyClosingScheduleSchema.parse(
	DEFAULT_WEEKLY_CLOSING,
);

const ids = {
	cart: 990_001,
	order: 990_001,
	transaction: 990_001,
	address: 990_001,
	pickupPoint: 990_001,
	mercadoPago: 990_001,
	external: 990_002,
};

/** The beige behind every photo in `public/tutorial/`. */
const TUTORIAL_PHOTO_BACKDROP = "#e2c8ab";

const categories = {
	nuts: {
		id: 990_001,
		name: "Frutos secos",
		sortOrder: 1,
		photoBackgroundColor: TUTORIAL_PHOTO_BACKDROP,
	},
	driedFruit: {
		id: 990_002,
		name: "Frutas secas",
		sortOrder: 2,
		photoBackgroundColor: TUTORIAL_PHOTO_BACKDROP,
	},
	pantry: {
		id: 990_003,
		name: "Almacén",
		sortOrder: 3,
		photoBackgroundColor: null,
	},
};

type ProductSeed = Pick<
	CatalogProductListItem,
	| "id"
	| "name"
	| "description"
	| "unit"
	| "presentationContainer"
	| "presentationSize"
	| "category"
	| "imageUrl"
> & { unitPrice: number; moq: number; step: number };

const productSeeds: ProductSeed[] = [
	{
		id: 990_001,
		name: "Almendra Non Pareil",
		imageUrl: "/tutorial/almendra.webp",
		description: "Almendra pelada natural, calibre grande.",
		unit: "kg",
		presentationContainer: null,
		presentationSize: null,
		category: categories.nuts,
		unitPrice: 22_600,
		moq: 0.5,
		step: 0.5,
	},
	{
		id: 990_002,
		name: "Nuez mariposa extra light",
		imageUrl: "/tutorial/nuez.webp",
		description: "Nuez pelada en mitades, color claro.",
		unit: "kg",
		presentationContainer: null,
		presentationSize: null,
		category: categories.nuts,
		unitPrice: 19_600,
		moq: 0.5,
		step: 0.5,
	},
	{
		id: 990_003,
		name: "Castaña de cajú tostada sin sal",
		imageUrl: "/tutorial/castana-caju.webp",
		description: "Castaña entera tostada, sin sal agregada.",
		unit: "kg",
		presentationContainer: null,
		presentationSize: null,
		category: categories.nuts,
		unitPrice: 24_800,
		moq: 0.5,
		step: 0.5,
	},
	{
		id: 990_004,
		name: "Dátil Medjool",
		imageUrl: "/tutorial/datil.webp",
		description: "Dátil grande con carozo.",
		unit: "kg",
		presentationContainer: null,
		presentationSize: null,
		category: categories.driedFruit,
		unitPrice: 29_800,
		moq: 0.5,
		step: 0.5,
	},
	{
		id: 990_005,
		name: "Mix de frutos secos deportivo",
		imageUrl: "/tutorial/mix-deportivo.webp",
		description: "Maní, pasas, almendras y nueces.",
		unit: "kg",
		presentationContainer: null,
		presentationSize: null,
		category: categories.nuts,
		unitPrice: 17_400,
		moq: 0.5,
		step: 0.5,
	},
	{
		id: 990_006,
		name: "Miel pura",
		imageUrl: null,
		description: "Miel multifloral en frasco de vidrio.",
		unit: "piece",
		presentationContainer: "frasco",
		presentationSize: "500 g",
		category: categories.pantry,
		unitPrice: 6_500,
		moq: 1,
		step: 1,
	},
];

function money(value: number) {
	return value.toFixed(2);
}

function toTerms(seed: ProductSeed, now: Date): CatalogClientTerms {
	return {
		id: seed.id,
		moq: String(seed.moq),
		moqPrice: money(seed.unitPrice * seed.moq),
		step: String(seed.step),
		stepPrice: money(seed.unitPrice * seed.step),
		max: null,
		unitPrice: money(seed.unitPrice),
		marketPrice: null,
		discountPercent: null,
		currency: "ARS",
		fromDate: new Date(now.getTime() - 30 * DAY_MS),
		toDate: null,
	};
}

function toProduct(seed: ProductSeed, now: Date): CatalogProductListItem {
	const { unitPrice: _unitPrice, moq: _moq, step: _step, ...product } = seed;
	return {
		...product,
		brand: null,
		createdAt: new Date(now.getTime() - 60 * DAY_MS),
		terms: toTerms(seed, now),
	};
}

const address: CheckoutAddress = {
	id: ids.address,
	type: "shipping",
	line1: "Av. San Martín 1234",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: "9410",
	country: "AR",
	active: true,
};

const pickupPoint: PickupPointData = {
	id: ids.pickupPoint,
	name: "Punto de retiro Centro (ejemplo)",
	line1: "Maipú 500",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: "9410",
	country: "AR",
	googleMapsUrl: null,
	hours: "Lunes a viernes de 10 a 18 h",
	instructions: null,
};

const mercadoPago: CheckoutPaymentMethod = {
	id: ids.mercadoPago,
	type: "mercadopago",
	label: "Mercado Pago",
	details: "Tarjeta, dinero en cuenta o efectivo",
	provider: "mercadopago",
	externalPaymentMethodId: null,
	active: true,
};

const externalPayment: CheckoutPaymentMethod = {
	id: ids.external,
	type: "bank_transfer",
	label: "Pago externo",
	details: "Transferencia bancaria",
	provider: "external",
	externalPaymentMethodId: null,
	active: true,
};

const TERMS_TEXT =
	"Términos de ejemplo. Al confirmar un pedido real aceptás los términos y condiciones vigentes de CoCo, que vas a poder leer completos en este paso.";

const ORDER_CODE = "EJEMPLO";
const CART_CODE = "EJEMPLO-ARMADO";

export type TutorialOrderDetail = {
	order: OrderDetail;
	timelines: UserOrderItemTimeline[];
	journeyView: CustomerOrderJourneyView;
};

export type TutorialFixtures = {
	catalogProducts: CatalogProductListItem[];
	/** The product the walk-through picks first. */
	featuredProduct: CatalogProductListItem;
	cartAfterFirstAdd: CartSnapshot;
	cart: CartSnapshot;
	checkoutState: CheckoutState;
	deliverySelection: CheckoutDeliverySelection;
	paymentMethod: CheckoutPaymentMethod;
	paymentResult: CheckoutPaymentResult;
	orderList: OrderListOutput;
	orderDetail: (journey: TutorialJourneyPoint) => TutorialOrderDetail;
};

function stageIndex(journey: TutorialJourneyPoint) {
	return journey === "delivered"
		? userTrackingStageDefinitions.length
		: userTrackingStageDefinitions.findIndex((stage) => stage.key === journey);
}

/** Days from the order's submission to its last reached stage, one per stage. */
function journeyDays(journey: TutorialJourneyPoint) {
	return Math.min(stageIndex(journey), userTrackingStageDefinitions.length - 1);
}

/** Every item moves together; the last reached stage happened `now`. */
function buildTimelines(
	items: CartItem[],
	journey: TutorialJourneyPoint,
	now: Date,
): UserOrderItemTimeline[] {
	const current = stageIndex(journey);
	const latest = journeyDays(journey);

	return items.map((_, itemIndex) => ({
		cartItemId: cartItemId(itemIndex),
		notices: [],
		stages: userTrackingStageDefinitions.map((stage, index) => {
			const status =
				index < current
					? "completed"
					: index === current
						? "current"
						: "pending";
			return {
				key: stage.key,
				label: stage.label,
				description: stage.description,
				status,
				...(status === "pending"
					? {}
					: {
							createdAt: new Date(
								now.getTime() - (latest - index) * DAY_MS,
							).toISOString(),
						}),
			};
		}),
	}));
}

function cartItemId(itemIndex: number) {
	return 990_001 + itemIndex;
}

export function buildTutorialFixtures(now: Date): TutorialFixtures {
	const catalogProducts = productSeeds.map((seed) => toProduct(seed, now));
	const byId = new Map(catalogProducts.map((product) => [product.id, product]));
	const pick = (id: number) => {
		const product = byId.get(id);
		if (!product) throw new Error(`Missing tutorial product ${id}`);
		return product;
	};
	const featuredProduct = pick(990_001);
	const cartItems = [990_001, 990_004, 990_005].map((id) => {
		const product = pick(id);
		return catalogProductToCartItem(product, product.terms.moq);
	});
	const [firstItem] = cartItems;
	if (!firstItem) throw new Error("Empty tutorial cart");

	// A guest's cart lives in the browser until sign-in: no id, code or status.
	const guestCart = { id: null, code: null, status: null };
	const cartAfterFirstAdd = buildCartSnapshot([firstItem], guestCart);
	const cart = buildCartSnapshot(cartItems, guestCart);
	const checkoutCart = buildCartSnapshot(cartItems, {
		id: ids.cart,
		code: CART_CODE,
		status: "atCheckout",
	});
	const total = checkoutCart.totals[0];
	if (!total) throw new Error("Tutorial cart has no total");

	const orderedAt = new Date(now.getTime() - DAY_MS);

	const orderList: OrderListOutput = [
		{
			id: ids.order,
			code: ORDER_CODE,
			status: "processing",
			createdAt: orderedAt,
			updatedAt: orderedAt,
			itemCount: cartItems.length,
			totalAmount: total.amount,
			currency: total.currency,
			latestTransactionStatus: "completed",
		},
	];

	const paymentResult: CheckoutPaymentResult = {
		status: "succeeded",
		message: "Mercado Pago aprobó el pago y tu pedido quedó confirmado.",
		order: { id: ids.order, code: ORDER_CODE, status: "processing" },
		transaction: {
			id: ids.transaction,
			status: "completed",
			amount: total.amount,
			currency: total.currency,
			provider: "mercadopago",
			externalTransactionId: "MP-EJEMPLO",
			failureCode: null,
			failureMessage: null,
		},
		redirectUrl: null,
		externalPayment: null,
		deliveryPreference: "homeDelivery",
		shippingAddress: address,
		pickupPoint: null,
		paymentMethod: mercadoPago,
	};

	const orderDetail = (journey: TutorialJourneyPoint): TutorialOrderDetail => {
		const delivered = journey === "delivered";
		const submittedAt = new Date(now.getTime() - journeyDays(journey) * DAY_MS);
		const order: OrderDetail = {
			id: ids.order,
			code: ORDER_CODE,
			createdAt: submittedAt,
			updatedAt: now,
			itemCount: cartItems.length,
			totalAmount: total.amount,
			currency: total.currency,
			latestTransactionStatus: "completed",
			status: delivered ? "completed" : "processing",
			cartCode: CART_CODE,
			billingAddressSnapshot: null,
			shippingAddressSnapshot: { address },
			deliveryPreference: "homeDelivery",
			pickupPointSnapshot: null,
			termsSnapshot: null,
			acceptedTermsAt: submittedAt,
			externalPayment: null,
			items: cartItems.map((item, itemIndex) => ({
				id: 990_001 + itemIndex,
				sourceCartItemId: cartItemId(itemIndex),
				quantity: item.quantity,
				productSnapshot: { product: item.product },
				priceSnapshot: {
					productClientTerms: item.terms,
					lineTotal: item.lineTotal,
					currency: item.terms.currency,
				},
				createdAt: submittedAt,
			})),
			transactions: [
				{
					id: ids.transaction,
					amount: total.amount,
					currency: total.currency,
					status: "completed",
					provider: "mercadopago",
					externalTransactionId: "MP-EJEMPLO",
					providerStatus: "approved",
					failureCode: null,
					failureMessage: null,
					createdAt: submittedAt,
					paymentMethod: mercadoPago,
				},
			],
		};
		const timelines = buildTimelines(cartItems, journey, now);
		return {
			order,
			timelines,
			journeyView: buildCustomerOrderJourneyView(
				toOrderJourneyItemInputs(order, timelines),
			),
		};
	};

	return {
		catalogProducts,
		featuredProduct,
		cartAfterFirstAdd,
		cart,
		checkoutState: {
			cart: checkoutCart,
			addresses: [address],
			pickupPoints: [pickupPoint],
			paymentMethods: [mercadoPago, externalPayment],
			termsText: TERMS_TEXT,
		},
		deliverySelection: { mode: "homeDelivery", address },
		paymentMethod: mercadoPago,
		paymentResult,
		orderList,
		orderDetail,
	};
}
