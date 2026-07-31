/**
 * Search-param helpers for admin pages. Three categories of parameter, and
 * mixing their vocabularies is the bug this docblock exists to prevent:
 * `?detailId=` opens a detail dialog on arrival, `?reviewId=` opens a review,
 * and every other `?<entity>Id=` is a *filter* the list starts narrowed by.
 * A deep link may carry one of each — `?detailId=7&operationId=3` opens lot 7
 * over the list of operation 3's lots.
 *
 * Reading is initial-only: closing a dialog does not rewrite the URL.
 */

export type AdminSearchParams = Record<string, string | string[] | undefined>;

export function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export function positiveIntParam(value: string | string[] | undefined) {
	const first = firstSearchParam(value);
	if (!first || !/^\d+$/.test(first)) return undefined;

	const parsed = Number(first);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** The id whose detail dialog should be open when the page mounts. */
export function detailIdParam(params: AdminSearchParams) {
	return positiveIntParam(params.detailId);
}

/**
 * The draft whose review should be open when the page mounts. Read on mount only,
 * like `detailIdParam` — this is what a full-screen dialog gives up versus a
 * route, and what recovers it for a refresh or a shared link.
 */
export function reviewIdParam(params: AdminSearchParams) {
	return positiveIntParam(params.reviewId);
}

/**
 * The id a list arrives filtered by. String rather than `number | undefined`
 * because list filter state is text: the clients feed this straight into their
 * `useState`, and `""` is their "no filter" value.
 */
export function idFilterParam(value: string | string[] | undefined) {
	return positiveIntParam(value)?.toString() ?? "";
}
