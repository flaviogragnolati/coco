/** 999.999.999,99: far above any real price, far below `Decimal(18,2)` and 2^53 cents. */
export const PRICE_SHEET_MAX_CENTS = 99_999_999_999;

export type PriceParseResult =
	| { ok: true; cents: number }
	| { ok: false; reason: "invalid" | "decimals" | "range" };

const GROUPED_INTEGER = {
	".": /^\d{1,3}(?:\.\d{3})+$/,
	",": /^\d{1,3}(?:,\d{3})+$/,
} as const;

function toCents(integer: string, fraction: string): PriceParseResult {
	if (!/^\d+$/.test(integer) || !/^\d*$/.test(fraction)) {
		return { ok: false, reason: "invalid" };
	}
	if (fraction.length > 2) return { ok: false, reason: "decimals" };
	const cents = Number(integer) * 100 + Number(fraction.padEnd(2, "0") || "0");
	if (!Number.isSafeInteger(cents) || cents > PRICE_SHEET_MAX_CENTS) {
		return { ok: false, reason: "range" };
	}
	return { ok: true, cents };
}

function splitAt(text: string, separator: "." | ",") {
	const index = text.lastIndexOf(separator);
	return { integer: text.slice(0, index), fraction: text.slice(index + 1) };
}

/**
 * A price typed as text, es-AR or plain: "19.500,50", "19500,5", "19500.5",
 * "$ 19.500", "1,234.56". With both separators the last one is the decimal
 * mark. A lone dot followed by exactly three digits ("19.500") groups
 * thousands, since a price never has three decimals; a lone comma is always
 * decimal, so "19,500" fails on decimals instead of guessing.
 */
function parsePriceText(text: string): PriceParseResult {
	let compact = text.replace(/[\s  ]/g, "").replace(/^\$|^ARS/i, "");
	let sign = 1;
	if (compact.startsWith("-")) {
		sign = -1;
		compact = compact.slice(1);
	}
	if (!compact || !/^[\d.,]+$/.test(compact)) {
		return { ok: false, reason: "invalid" };
	}

	const lastDot = compact.lastIndexOf(".");
	const lastComma = compact.lastIndexOf(",");
	let result: PriceParseResult;

	if (lastDot >= 0 && lastComma >= 0) {
		const decimal = lastDot > lastComma ? "." : ",";
		const grouping = decimal === "." ? "," : ".";
		const { integer, fraction } = splitAt(compact, decimal);
		if (!GROUPED_INTEGER[grouping].test(integer)) {
			return { ok: false, reason: "invalid" };
		}
		result = toCents(integer.replaceAll(grouping, ""), fraction);
	} else if (lastDot < 0 && lastComma < 0) {
		result = toCents(compact, "");
	} else {
		const separator = lastDot >= 0 ? "." : ",";
		const count = compact.split(separator).length - 1;
		const groupsThousands =
			count > 1 || (separator === "." && /^[1-9]\d{0,2}\.\d{3}$/.test(compact));
		if (groupsThousands) {
			if (!GROUPED_INTEGER[separator].test(compact)) {
				return { ok: false, reason: "invalid" };
			}
			result = toCents(compact.replaceAll(separator, ""), "");
		} else {
			const { integer, fraction } = splitAt(compact, separator);
			result = toCents(integer || "0", fraction);
		}
	}

	return result.ok ? { ok: true, cents: sign * result.cents } : result;
}

/**
 * A number cell's cached value ("19500.5", "21450.000000000004", "1E+3").
 * Rounded half-up to cents at 15 significant digits, the precision Excel
 * shows, so a formula's float noise never reads as extra decimals.
 */
function parsePriceNumber(text: string): PriceParseResult {
	const value = Number(text.trim());
	if (!Number.isFinite(value) || text.trim() === "") {
		return { ok: false, reason: "invalid" };
	}
	const scaled = Number((Math.abs(value) * 100).toPrecision(15));
	const cents = Math.sign(value) * Math.round(scaled);
	if (!Number.isSafeInteger(cents) || Math.abs(cents) > PRICE_SHEET_MAX_CENTS) {
		return { ok: false, reason: "range" };
	}
	return { ok: true, cents };
}

export function parsePriceCell(cell: {
	text: string;
	numeric: boolean;
}): PriceParseResult {
	return cell.numeric ? parsePriceNumber(cell.text) : parsePriceText(cell.text);
}

/** Cents as the decimal string Prisma stores: 1950050 → "19500.50". */
export function centsToDecimalString(cents: number) {
	const sign = cents < 0 ? "-" : "";
	const absolute = Math.abs(cents);
	const integer = Math.floor(absolute / 100);
	const fraction = String(absolute % 100).padStart(2, "0");
	return `${sign}${integer}.${fraction}`;
}

/** A stored decimal ("19500.5", "19500.50", "19500") as cents; null if malformed. */
export function decimalStringToCents(value: string): number | null {
	const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
	if (!match?.[2]) return null;
	const fraction = match[3] ?? "";
	if (fraction.length > 2 && !/^0+$/.test(fraction.slice(2))) return null;
	const cents =
		Number(match[2]) * 100 + Number(fraction.slice(0, 2).padEnd(2, "0"));
	return Number.isSafeInteger(cents) ? (match[1] ? -cents : cents) : null;
}
