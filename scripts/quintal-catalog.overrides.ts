import type { QuintalOverrides } from "./quintal-catalog.schema";

/**
 * Every decision the parser cannot read from Quintal's sheet. Change it here and
 * regenerate with `pnpm catalog:quintal <xlsx>`; the data file is never edited by
 * hand. Keys are `slug(category)--slug(supplier label)`.
 */
export const quintalOverrides: QuintalOverrides = {
	// The export date of the Google Sheet: the sheet itself carries no date.
	listDate: "2026-07-02T00:00:00-03:00",

	// The customer pays the supplier's list price as is, until margin, VAT and
	// freight are decided.
	pricing: {
		marginPercent: 0,
		vatPercent: 0,
		freightPerKg: 0,
		freightPerPiece: 0,
		roundUpTo: null,
	},
	clientTerms: { moq: "1", step: "1", max: null },
	clientTermsOverrides: {},

	excludedCategories: [],

	categoryLabels: {
		ALMENDRA: { prefix: "Almendra" },
		ARANDANOS: { prefix: "Arándanos" },
		AVELLANAS: { prefix: "Avellana" },
		"BANANA CHIPS": { prefix: "Banana chips" },
		CACAO: { prefix: "Cacao" },
		"CASTAÑAS DE CAJÚ": { prefix: "Castaña de cajú", stem: "castaña" },
		CHOCOLATE: { prefix: "Chocolate" },
		CIRUELA: { prefix: "Ciruela" },
		COCO: { prefix: "Coco" },
		DATILES: { prefix: "Dátil" },
		DURAZNO: { prefix: "Durazno" },
		"EMPAQUE MIXTO": { prefix: "Empaque mixto" },
		"FRUTA CUBETEADA": { prefix: "Fruta cubeteada" },
		FLORES: { prefix: "Flor de" },
		GRANOLA: { prefix: "Granola" },
		"HIGOS SECOS": { prefix: "Higo seco", stem: "higo" },
		"HONGO SECO": { prefix: "Hongo seco" },
		MANI: { prefix: "Maní" },
		"MAIZ FRITO": { prefix: "Maíz frito" },
		"MIX DE FRUTOS SECOS": { prefix: "Mix de frutos secos" },
		NUEZ: { prefix: "Nuez" },
		"ACEITE OLIVA EXTRA VIRGEN": { prefix: "Aceite de oliva extra virgen" },
		"PASA DE UVA SIN SEMILLAS": { prefix: "Pasa de uva sin semillas" },
		PERA: { prefix: "Pera" },
		PISTACHOS: { prefix: "Pistacho" },
		"SAL ROSADA DEL HIMALAYA": { prefix: "Sal rosada del Himalaya" },
		SEMILLAS: { prefix: "Semillas", stem: "semilla" },
		TOMATE: { prefix: "Tomate" },
		OTROS: { prefix: "" },
	},
	subcategoryLabels: {
		PREMIUM: "Línea premium.",
		MEDIA: "Línea media.",
		ECONOMICO: "Línea económica.",
	},

	wordSpelling: {
		argelia: "Argelia",
		alpino: "Alpino",
		brasil: "Brasil",
		chile: "Chile",
		comun: "común",
		economico: "económico",
		egipto: "Egipto",
		fat: "FAT",
		flame: "Flame",
		high: "HIGH",
		jumbo: "Jumbo",
		kalpa: "Kalpa",
		kuati: "Kuati",
		lerida: "Lérida",
		mani: "maní",
		med: "MED",
		medjool: "Medjool",
		pecan: "pecán",
		preimum: "premium",
		president: "President",
		semiamago: "semiamargo",
		visimex: "Visimex",
	},

	nameOverrides: {
		"almendra--harina-de-almendra-c-p-rebajada":
			"Harina de almendra con piel (rebajada)",
		"almendra--almendras-banadas-con-chocolate-c-leche-argenfrut":
			"Almendras bañadas en chocolate con leche (Argenfrut)",
		"aceite-oliva-extra-virgen--botella-0-5l-pet":
			"Aceite de oliva extra virgen botella 0,5 L PET",
		"aceite-oliva-extra-virgen--botella-1l":
			"Aceite de oliva extra virgen botella 1 L",
		"aceite-oliva-extra-virgen--bidon-5l":
			"Aceite de oliva extra virgen bidón 5 L",
		"almendra--harina-de-almenda-sin-piel-importada-espana":
			"Harina de almendra sin piel importada (España)",
		"arandanos--importados-chile-entero":
			"Arándanos enteros importados de Chile",
		"castanas-de-caju--castana-de-para": "Castaña de Pará",
		"coco--aceite-coco-entre-nuts-200cc-virgen":
			"Aceite de coco virgen Entre Nuts 200 cc",
		"coco--aceite-coco-entre-nuts-360cc-virgen":
			"Aceite de coco virgen Entre Nuts 360 cc",
		"fruta-cubeteada--papaya-multicolor": "Papaya multicolor cubeteada",
		"hongo-seco--hongo": "Hongo seco",
		"mani--pasta-de-mani-entre-nuts": "Pasta de maní Entre Nuts 370 g",
		"mix-de-frutos-secos--seco": "Mix de frutos secos (seco)",
		"nuez--pecan-garapinada": "Nuez pecán garapiñada 500 g",
		"nuez--pecan-chocolate-negro": "Nuez pecán con chocolate negro 500 g",
		"nuez--pecan-chocolate-blanco": "Nuez pecán con chocolate blanco 500 g",
		"pistachos--pistacho-c-c": "Pistacho con cáscara",
		"sal-rosada-del-himalaya--sal-rosada": "Sal rosada del Himalaya",
		"semillas--pinones": "Piñones",
		"semillas--mix-de-semillas-prem-sesamo-girasol-lino-chia":
			"Mix de semillas premium (sésamo, girasol, lino y chía)",
		"otros--aceite-cannabis-10ml-15": "Aceite de cannabis 10 ml 15%",
	},
	keyAliases: {},

	// One sheet row listing several flavours: each is its own product sharing the
	// row's pack and price.
	splitVariants: {
		35: { base: "Tostada", variants: ["sin sal", "salada"] },
		68: {
			base: "Kuati",
			variants: ["tradicional", "arándanos", "choco", "pasta de maní"],
		},
	},

	// Volume tiers of the H:K side table. Reference only: never seeded as terms.
	sideTableTargets: {
		"BANANA CHIPS": "banana-chips--banana-chips",
		"COCO ESCAMAS": "coco--coco-en-escamas",
		"DATIL ARGELIA": "datiles--argelia",
		"MARIPOSA EXTRA LIGHT": "nuez--mariposa-extra-light-2026",
		"CUARTOS EXTRA LIGHT": "nuez--cuartos-extra-light-2026",
		"PECAN COMUN": "nuez--pecan-comun",
		"CAJU VISIMEX": "castanas-de-caju--natural-visimex",
		"Pasa Flame": "pasa-de-uva-sin-semillas--flame",
	},

	// Per-kg surcharge for buying a fraction of the box. Reference only.
	surchargeTargets: {
		34: [
			"castanas-de-caju--natural-w3s-brasil",
			"castanas-de-caju--natural-w4-brasil",
			"castanas-de-caju--natural-visimex",
			"castanas-de-caju--natural-p3-brasil-partida",
		],
		129: ["semillas--semilla-de-zapallo-aa"],
	},

	priceResolutions: {
		101: {
			use: "pack",
			reason:
				"bolsita de 500 g a $13.500; D repite el precio de la de chocolate blanco",
		},
	},

	supplier: {
		description:
			"Mayorista de frutos secos, frutas deshidratadas y semillas. Proveedor del catálogo inicial.",
		contactName: "Ventas Quintal",
		// The sheet has no address; this placeholder satisfies the admin supplier
		// form until the real one is loaded there.
		address: {
			line1: "A confirmar",
			city: "Ciudad Autónoma de Buenos Aires",
			state: "Buenos Aires",
			postalCode: "0000",
			country: "AR",
		},
	},
};
