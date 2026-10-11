import { Prisma } from "~/prisma/client";

type Decimalish = { toString(): string } | string;

function priceOf(unitPrice: Decimalish, quantity: Decimalish) {
	return new Prisma.Decimal(unitPrice.toString())
		.times(quantity.toString())
		.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
		.toFixed(2);
}

/**
 * The minimum and step prices stored beside the unit price. They are never
 * entered: the unit price is the only client price an admin sets, and every
 * writer of client terms derives these two from it.
 */
export function deriveClientTermsPrices(input: {
	unitPrice: Decimalish;
	moq: Decimalish;
	step?: Decimalish | null;
}) {
	return {
		moqPrice: priceOf(input.unitPrice, input.moq),
		stepPrice:
			input.step === null || input.step === undefined
				? null
				: priceOf(input.unitPrice, input.step),
	};
}
