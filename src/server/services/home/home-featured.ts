import type { HomeOffersCriterion } from "~/prisma/client";
import {
	calculateLineTotal,
	PricingConfigurationError,
	toMoneyString,
	toNumber,
} from "~/shared/common/commerce.helpers";
import type {
	HomeComboCard,
	HomeComboItem,
	HomeComboOption,
	HomeFeature,
} from "~/shared/common/home.types";
import { homeOfferTerms } from "~/shared/common/home-offer-terms";
import {
	dedupeHomeOffersByProduct,
	type RankableHomeOffer,
	rankHomeOffers,
} from "./home-ranking";

export type FeaturedTarget =
	| { kind: "product"; productId: number }
	| { kind: "combo"; comboId: number };

export type HomeFeaturedCuration = {
	spotlight: FeaturedTarget | null;
	criterion: HomeOffersCriterion;
	featuredLimit: number;
	fillWithRanking: boolean;
	/** The admin's list, in position order. */
	list: FeaturedTarget[];
};

/** An active, not deleted combo with its products in their saved order. */
export type HomeComboRecord = {
	id: number;
	name: string;
	description: string | null;
	people: number | null;
	groupName: string | null;
	items: { productId: number; productName: string; quantity: string }[];
};

/** Where a section entry came from, for the admin preview; the home drops it. */
export type FeatureSource = "list" | "ranking";

export type ComposedHomeFeature = HomeFeature & { source: FeatureSource };

export type ComposedHomeFeatured = {
	spotlight: ComposedHomeFeature | null;
	featured: ComposedHomeFeature[];
};

/** The comparable form of a group name: trimmed, single-spaced, lowercase. */
export function normalizeComboGroup(groupName: string): string {
	return groupName.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function comboCardKey(combo: Pick<HomeComboRecord, "id" | "groupName">) {
	const group = combo.groupName ? normalizeComboGroup(combo.groupName) : "";
	return group ? `group:${group}` : `combo:${combo.id}`;
}

function lineTotalOrNull(offer: RankableHomeOffer, quantity: string) {
	try {
		return calculateLineTotal(homeOfferTerms(offer), quantity);
	} catch (error) {
		if (error instanceof PricingConfigurationError) return null;
		throw error;
	}
}

/**
 * The combo as it can be bought today: the products with current terms, their
 * sum, and the names of the rest. Null when nothing is left or the products
 * would add up across currencies.
 */
export function resolveComboOption(
	combo: HomeComboRecord,
	availableByProductId: ReadonlyMap<number, RankableHomeOffer>,
): HomeComboOption | null {
	const items: HomeComboItem[] = [];
	const unavailableNames: string[] = [];

	for (const item of combo.items) {
		const offer = availableByProductId.get(item.productId);
		const lineTotal = offer ? lineTotalOrNull(offer, item.quantity) : null;
		if (!offer || lineTotal === null) {
			unavailableNames.push(item.productName);
			continue;
		}
		items.push({ offer, quantity: item.quantity, lineTotal });
	}

	const [first] = items;
	if (!first) return null;
	const currency = first.offer.currency;
	if (items.some((item) => item.offer.currency !== currency)) return null;

	const total = items.reduce(
		(sum, item) => sum + (toNumber(item.lineTotal) ?? 0),
		0,
	);

	return {
		comboId: combo.id,
		name: combo.name,
		description: combo.description,
		people: combo.people,
		items,
		unavailableNames,
		total: toMoneyString(total),
		currency,
	};
}

function compareOptions(left: HomeComboOption, right: HomeComboOption) {
	if (left.people !== right.people) {
		if (left.people === null) return 1;
		if (right.people === null) return -1;
		return left.people - right.people;
	}
	return left.comboId - right.comboId;
}

type ComboCards = {
	keyByComboId: Map<number, string>;
	optionsByKey: Map<string, HomeComboOption[]>;
};

function buildComboCards(
	combos: HomeComboRecord[],
	availableByProductId: ReadonlyMap<number, RankableHomeOffer>,
): ComboCards {
	const keyByComboId = new Map<number, string>();
	const optionsByKey = new Map<string, HomeComboOption[]>();

	for (const combo of combos) {
		const key = comboCardKey(combo);
		keyByComboId.set(combo.id, key);
		const option = resolveComboOption(combo, availableByProductId);
		if (!option) continue;
		optionsByKey.set(key, [...(optionsByKey.get(key) ?? []), option]);
	}
	for (const options of optionsByKey.values()) options.sort(compareOptions);

	return { keyByComboId, optionsByKey };
}

/** The card of the combo's group, opened on that combo when it is shown. */
function comboCardFor(
	comboId: number,
	cards: ComboCards,
): HomeComboCard | null {
	const key = cards.keyByComboId.get(comboId);
	const options = key ? cards.optionsByKey.get(key) : undefined;
	const [first] = options ?? [];
	if (!key || !options || !first) return null;

	return {
		key,
		initialComboId: options.some((option) => option.comboId === comboId)
			? comboId
			: first.comboId,
		options,
	};
}

/**
 * The home's spotlight band and featured section. The admin's list goes first
 * in its order; the offers ranking fills the free places with products, and
 * picks the band when the admin chose none, unless the admin turned it off.
 * Nothing shows twice: one product, one card per combo group, and never what
 * the band already holds.
 */
export function composeHomeFeatured(
	offers: RankableHomeOffer[],
	combos: HomeComboRecord[],
	curation: HomeFeaturedCuration,
): ComposedHomeFeatured {
	const available = dedupeHomeOffersByProduct(offers);
	const availableByProductId = new Map(
		available.map((offer) => [offer.productId, offer]),
	);
	const cards = buildComboCards(combos, availableByProductId);
	const listedProductIds = new Set(
		curation.list.flatMap((target) =>
			target.kind === "product" ? [target.productId] : [],
		),
	);
	const ranked = curation.fillWithRanking
		? rankHomeOffers(available, curation.criterion)
		: [];

	function resolve(
		target: FeaturedTarget,
		source: FeatureSource,
	): ComposedHomeFeature | null {
		if (target.kind === "product") {
			const offer = availableByProductId.get(target.productId);
			return offer ? { kind: "product", offer, source } : null;
		}
		const combo = comboCardFor(target.comboId, cards);
		return combo ? { kind: "combo", combo, source } : null;
	}

	const shownKeys = new Set<string>();
	function featureKey(feature: HomeFeature) {
		return feature.kind === "product"
			? `product:${feature.offer.productId}`
			: feature.combo.key;
	}

	const chosenSpotlight = curation.spotlight
		? resolve(curation.spotlight, "list")
		: null;
	const fallbackOffer = chosenSpotlight
		? undefined
		: ranked.find((offer) => !listedProductIds.has(offer.productId));
	const spotlight: ComposedHomeFeature | null =
		chosenSpotlight ??
		(fallbackOffer
			? { kind: "product", offer: fallbackOffer, source: "ranking" }
			: null);
	if (spotlight) shownKeys.add(featureKey(spotlight));

	const featured: ComposedHomeFeature[] = [];
	function push(feature: ComposedHomeFeature | null) {
		if (!feature || featured.length >= curation.featuredLimit) return;
		const key = featureKey(feature);
		if (shownKeys.has(key)) return;
		shownKeys.add(key);
		featured.push(feature);
	}

	for (const target of curation.list) push(resolve(target, "list"));
	for (const offer of ranked) {
		push({ kind: "product", offer, source: "ranking" });
	}

	return { spotlight, featured };
}
