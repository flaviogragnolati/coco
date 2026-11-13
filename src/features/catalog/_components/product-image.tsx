import { ImageIcon } from "lucide-react";

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
}: ProductImageProps) {
	if (imageUrl) {
		return (
			<div
				aria-label={name}
				className={cn("bg-center bg-contain bg-no-repeat", className)}
				role="img"
				style={{ backgroundImage: cssUrl(imageUrl) }}
			/>
		);
	}

	return (
		<div className={cn(className, placeholderClassName)}>
			<ImageIcon aria-hidden="true" />
			<span className="sr-only">Sin imagen para {name}</span>
		</div>
	);
}
