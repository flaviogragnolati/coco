import type { RankableHomeOffer } from "./home-ranking";

const defaultFromDate = new Date("2026-06-01T00:00:00.000Z");

export function offer(
	input: Partial<RankableHomeOffer> & { productId: number },
): RankableHomeOffer {
	return {
		productId: input.productId,
		productDescription: null,
		step: input.step ?? null,
		stepPrice: null,
		max: input.max ?? null,
		toDate: null,
		productClientTermsId: input.productClientTermsId ?? input.productId,
		productName: input.productName ?? `Producto ${input.productId}`,
		unit: input.unit ?? "kg",
		presentationContainer: input.presentationContainer ?? null,
		presentationSize: null,
		brandName: input.brandName ?? null,
		imageUrl: input.imageUrl ?? null,
		photoBackgroundColor: input.photoBackgroundColor ?? null,
		moq: input.moq ?? "10",
		moqPrice: input.moqPrice ?? "1000",
		unitPrice: input.unitPrice ?? null,
		marketPrice: input.marketPrice ?? null,
		discountPercent: input.discountPercent ?? null,
		currency: input.currency ?? "ARS",
		paidOrderCount: input.paidOrderCount ?? 0,
		fromDate: input.fromDate ?? defaultFromDate,
	};
}
