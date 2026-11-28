import type { HomeFeaturedListItem } from "~/shared/common/admin-crud/home-offers.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

/** The chip of a list entry; overflow wins because it explains a `shown` entry the home leaves out. */
export function featuredStatusChipConfig(
	item: HomeFeaturedListItem,
	overflowing: boolean,
	places: number,
): StatusConfig | null {
	if (overflowing) {
		return {
			...statusPresets.attention,
			label: "No entra",
			hint: `La sección muestra ${places === 1 ? "1 lugar" : `${places} lugares`}. Sumá lugares en Relleno o quitá otro de arriba.`,
		};
	}

	switch (item.status) {
		case "shown":
			return { ...statusPresets.success, label: "En la sección" };
		case "inBand":
			return {
				...statusPresets.inProgress,
				label: "En la banda",
				hint: "Va en la banda; la sección no lo repite.",
			};
		case "noPrice":
			return {
				...statusPresets.failed,
				label: "Sin precio vigente",
				hint: "El home lo saltea hasta que tenga términos vigentes.",
			};
		case "inactive":
			return {
				...statusPresets.attention,
				label: "Inactivo",
				hint: "Activalo en Combos para que se muestre.",
			};
		case "sharedCard":
			return {
				...statusPresets.inert,
				label: `En la tarjeta de ${item.sharedWithName ?? "otro combo"}`,
				hint: "Su grupo ya se muestra en otra tarjeta.",
			};
		default:
			return null;
	}
}
