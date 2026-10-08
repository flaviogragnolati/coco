import { ImageIcon } from "lucide-react";

type ProductImageProps = {
	imageUrl: string | null;
	name: string;
	className?: string;
};

export function cssUrl(value: string) {
	const escaped = value.replace(
		/["\\\n\r\f]/g,
		(character) => `\\${character.charCodeAt(0).toString(16)} `,
	);
	return `url("${escaped}")`;
}

export function ProductImage({ imageUrl, name, className }: ProductImageProps) {
	if (imageUrl) {
		return (
			<div
				aria-label={name}
				className={className}
				role="img"
				style={{ backgroundImage: cssUrl(imageUrl) }}
			/>
		);
	}

	return (
		<div className={className}>
			<ImageIcon aria-hidden="true" />
			<span className="sr-only">Sin imagen para {name}</span>
		</div>
	);
}
