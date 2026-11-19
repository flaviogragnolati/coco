import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * The one grid for product cards: two columns on a phone, fixed 14rem columns
 * from `sm` up. `auto-fit` collapses the columns nobody fills, so a row with
 * fewer cards than columns is centered instead of hugging the left edge.
 * 14rem fills the catalog beside its sidebar with 3 columns at `lg` and 4 from
 * `xl` up, and the home with 5.
 */
export function ProductCardGrid({
	className,
	...props
}: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,14rem)] sm:justify-center sm:gap-3",
				className,
			)}
			data-slot="product-card-grid"
			{...props}
		/>
	);
}

/** A grid item too wide for half a phone screen, such as a combo card. */
export const productCardGridWideItem = "col-span-full sm:col-span-1";
