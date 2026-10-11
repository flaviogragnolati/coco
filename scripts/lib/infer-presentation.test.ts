import { expect, test } from "vitest";
import { inferPresentationFromName } from "./infer-presentation";

test.each([
	[
		"Aceite de oliva extra virgen botella 0,5 L PET",
		"12 unidades",
		{ presentationContainer: "botella", presentationSize: "0,5 L" },
	],
	[
		"Aceite de oliva extra virgen botella 1 L",
		"6 unidades",
		{ presentationContainer: "botella", presentationSize: "1 L" },
	],
	[
		"Aceite de oliva extra virgen bidón 5 L",
		"2 unidades",
		{ presentationContainer: "bidon", presentationSize: "5 L" },
	],
	[
		"Pasta de maní Entre Nuts 370 g",
		"12 frascos de 370 g",
		{ presentationContainer: "frasco", presentationSize: "370 g" },
	],
	[
		"Nuez pecán garapiñada 500 g",
		"bolsita de 500 g",
		{ presentationContainer: "bolsa", presentationSize: "500 g" },
	],
	[
		"Galletitas paquete",
		null,
		{ presentationContainer: "paquete", presentationSize: null },
	],
	[
		"Té en hebras 250 gr",
		"bolsa",
		{ presentationContainer: "bolsa", presentationSize: "250 g" },
	],
] as const)("infers %s", (name, supplier, expected) => {
	expect(inferPresentationFromName(name, supplier)).toEqual(expected);
});

test.each([
	["Aceite de coco virgen Entre Nuts 200 cc", "16 unidades"],
	["Aceite de cannabis 10 ml 15%", "5 unidades"],
	["Cordyceps", "1 unidad"],
	["Bocaditos", "36 unidades"],
])("leaves %s to the admin: no container is named", (name, supplier) => {
	expect(inferPresentationFromName(name, supplier)).toBeNull();
});
