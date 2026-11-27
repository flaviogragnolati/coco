/**
 * Where CoCo delivers today. The address form asks only for the street, the
 * floor and the postal code, and fills the rest from here; saved addresses keep
 * the full shape, so a second city means showing these fields again, not a
 * schema change.
 */
export const DELIVERY_AREA = {
	city: "Ushuaia",
	state: "Tierra del Fuego",
	country: "Argentina",
	postalCode: "9410",
} as const;
