/**
 * Search-param helpers for admin pages. Entity list pages read `?detailId=` to
 * open their detail dialog on arrival (deep link from the tracking modal); on
 * `/admin/tracking` the id params are *filters* instead.
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
