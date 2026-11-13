import { ImageIcon } from "lucide-react";

import {
	ILLUSTRATIVE_IMAGE_LEGEND,
	illustrativeLegendColor,
} from "~/features/catalog/product-image-legend";
import { cn } from "~/lib/utils";

type ProductImageProps = {
	imageUrl: string | null;
	name: string;
	/** The shape: aspect, width, rounding and how the placeholder icon sits. */
	className?: string;
	/**
	 * The placeholder's tint and icon colour. A photo shows whole over its
	 * surface's own background instead.
	 */
	placeholderClassName?: string;
	/** Draws the illustrative-image legend; only for large photos, never thumbnails. */
	legend?: { backdropColor: string | null };
};

export function cssUrl(value: string) {
	const escaped = value.replace(
		/["\\\n\r\f]/g,
		(character) => `\\${character.charCodeAt(0).toString(16)} `,
	);
	return `url("${escaped}")`;
}

export function ProductImage({
	imageUrl,
	name,
	className,
	placeholderClassName,
	legend,
}: ProductImageProps) {
	if (imageUrl) {
		return (
			<div
				aria-label={name}
				className={cn(
					"bg-center bg-contain bg-no-repeat",
					legend && "@container relative",
					className,
				)}
				role="img"
				style={{ backgroundImage: cssUrl(imageUrl) }}
			>
				{legend ? (
					<span
						aria-hidden="true"
						className="pointer-events-none absolute right-[max(6px,3cqw)] bottom-[max(4px,2.5cqw)] select-none whitespace-nowrap font-medium font-sans text-[length:max(9px,2.5cqw)] leading-none"
						style={{ color: illustrativeLegendColor(legend.backdropColor) }}
					>
						{ILLUSTRATIVE_IMAGE_LEGEND}
					</span>
				) : null}
			</div>
		);
	}

	return (
		<div className={cn(className, placeholderClassName)}>
			<ImageIcon aria-hidden="true" />
			<span className="sr-only">Sin imagen para {name}</span>
		</div>
	);
}
