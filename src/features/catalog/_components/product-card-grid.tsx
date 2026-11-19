import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * The one grid for product cards: two columns on a phone, fixed 13.5rem columns
 * from `sm` up. `auto-fit` collapses the columns no card uses, so a single row
 * with fewer cards than columns sits centered; a short last row under full
 * ones stays aligned with them. 13.5rem leaves room for 3 columns beside the
 * catalog sidebar at `lg`, even with a classic scrollbar, 4 from `xl` up and 5
 * on the home.
 */
export function ProductCardGrid({
	className,
	...props
}: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,13.5rem)] sm:justify-center sm:gap-3",
				className,
			)}
			data-slot="product-card-grid"
			{...props}
		/>
	);
}

/** A grid item too wide for half a phone screen, such as a combo card. */
export const productCardGridWideItem = "col-span-full sm:col-span-1";
