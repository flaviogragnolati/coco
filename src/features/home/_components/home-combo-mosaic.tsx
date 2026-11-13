import { ProductImage } from "~/features/catalog/_components/product-image";
import { cn } from "~/lib/utils";

const PLACEHOLDER = "bg-brand-soft text-brand-soft-foreground";

/** One cell per photo: 1 fills, 2 split, 3 is a half and two quarters, 4 a 2×2. */
const cellLayouts: Record<number, string[]> = {
	1: ["col-span-2 row-span-2"],
	2: ["row-span-2", "row-span-2"],
	3: ["row-span-2", "", ""],
	4: ["", "", "", ""],
};

export function HomeComboMosaic({
	images,
	comboName,
}: {
	images: { url: string; name: string; photoBackgroundColor: string | null }[];
	comboName: string;
}) {
	const label = `Productos del ${comboName}`;
	const layout = cellLayouts[images.length];

	if (!layout) {
		return (
			<ProductImage
				className="flex aspect-square w-full items-center justify-center"
				imageUrl={null}
				name={comboName}
				placeholderClassName={PLACEHOLDER}
			/>
		);
	}

	return (
		<div
			aria-label={label}
			className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-px bg-border"
			role="img"
		>
			{images.map((image, index) => (
				<div
					aria-hidden
					className={cn("bg-card", layout[index])}
					key={`${image.name}:${image.url}`}
				>
					<ProductImage
						className="size-full"
						imageUrl={image.url}
						legend={{ backdropColor: image.photoBackgroundColor }}
						name={image.name}
						placeholderClassName={PLACEHOLDER}
					/>
				</div>
			))}
		</div>
	);
}
