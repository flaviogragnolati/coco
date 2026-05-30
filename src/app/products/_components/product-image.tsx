import { ImageIcon } from "lucide-react";

type ProductImageProps = {
	imageUrl: string | null;
	name: string;
	className?: string;
};

export function ProductImage({ imageUrl, name, className }: ProductImageProps) {
	if (imageUrl) {
		return (
			<div
				aria-label={name}
				className={className}
				role="img"
				style={{ backgroundImage: `url(${imageUrl})` }}
			/>
		);
	}

	return (
		<div className={className}>
			<ImageIcon />
		</div>
	);
}
