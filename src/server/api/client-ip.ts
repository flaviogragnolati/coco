/**
 * Vercel sets `x-forwarded-for` itself, so its first entry is the real client
 * there; behind another proxy the caller controls it.
 */
export function clientIpFrom(headers: Headers): string | null {
	const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	if (forwarded) return forwarded;
	return headers.get("x-real-ip")?.trim() || null;
}
