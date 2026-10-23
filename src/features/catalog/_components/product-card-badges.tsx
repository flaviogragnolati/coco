import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";

/**
 * The row over a product card's image: status badges on the left, favorite on
 * the right. Hook-free so server-rendered cards can use it; the overlay lets
 * clicks through to the image link underneath.
 */
export function ProductCardBadges({
	discount,
	isNew = false,
	favorite,
}: {
	discount?: string | null;
	isNew?: boolean;
	/**
	 * The slot for the favorite toggle: a button with a 44px touch target and
	 * `aria-pressed`.
	 */
	favorite?: ReactNode;
}) {
	if (!discount && !isNew && !favorite) return null;
	return (
		<div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
			<div className="flex flex-wrap gap-1.5">
				{isNew ? <Badge variant="secondary">Nuevo</Badge> : null}
				{discount ? <Badge variant="highlight">{discount}</Badge> : null}
			</div>
			{favorite ? <div className="pointer-events-auto">{favorite}</div> : null}
		</div>
	);
}
