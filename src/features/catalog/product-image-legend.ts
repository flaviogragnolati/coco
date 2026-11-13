export const ILLUSTRATIVE_IMAGE_LEGEND = "Imagen ilustrativa";
export const NEUTRAL_LEGEND_COLOR = "#4d4d4d";

const LEGEND_LIGHTNESS = 0.3;
const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/** The legend's tone: the backdrop's hue and saturation at 30 % lightness; neutral gray without a backdrop. */
export function illustrativeLegendColor(backdrop: string | null): string {
	const match = backdrop ? HEX_COLOR.exec(backdrop) : null;
	if (!match) return NEUTRAL_LEGEND_COLOR;

	const [red, green, blue] = match
		.slice(1)
		.map((channel) => Number.parseInt(channel, 16) / 255) as [
		number,
		number,
		number,
	];
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const delta = max - min;
	if (delta === 0) return NEUTRAL_LEGEND_COLOR;

	const lightness = (max + min) / 2;
	const saturation = delta / (1 - Math.abs(2 * lightness - 1));
	let hue: number;
	if (max === red) hue = ((green - blue) / delta) % 6;
	else if (max === green) hue = (blue - red) / delta + 2;
	else hue = (red - green) / delta + 4;
	hue = (hue * 60 + 360) % 360;

	return hslToHex(hue, saturation, LEGEND_LIGHTNESS);
}

function hslToHex(hue: number, saturation: number, lightness: number) {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const offset = lightness - chroma / 2;
	const sectors: [number, number, number][] = [
		[chroma, secondary, 0],
		[secondary, chroma, 0],
		[0, chroma, secondary],
		[0, secondary, chroma],
		[secondary, 0, chroma],
		[chroma, 0, secondary],
	];
	const [red, green, blue] = sectors[Math.floor(hue / 60)] ?? [0, 0, 0];

	return `#${[red, green, blue]
		.map((channel) =>
			Math.round((channel + offset) * 255)
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;
}
