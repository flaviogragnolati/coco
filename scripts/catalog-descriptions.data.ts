/**
 * The product descriptions CoCo wrote for the launch catalog, by product id.
 * `name` is the product's current name in the database: `pnpm
 * catalog:descriptions` refuses to write when it no longer matches, because
 * the id would then point at another product. The texts are CoCo's, verbatim.
 */

export type CatalogDescription = {
	productId: number;
	name: string;
	description: string;
};

const oliveOil =
	"Extra virgen es la categoría más alta del aceite de oliva. Para usar en crudo, en ensaladas y tostadas, o para cocinar.";
const cashew =
	"Castaña de cajú tostada, en versión sin sal o salada. Para picar, sumar a salteados o, la sin sal, hacer cremas y salsas.";

export const catalogDescriptions: CatalogDescription[] = [
	{
		productId: 100,
		name: "Almendra Non Pareil 25/27",
		description:
			"Variedad Non Pareil, calibre 25/27: entre 25 y 27 almendras por onza (28 g), de tamaño parejo. Para comer al natural, tostar, laminar o hacer leche de almendras.",
	},
	{
		productId: 101,
		name: "Nuez mariposa extra light",
		description:
			"Mitades enteras de nuez, de color extra light, el tono más claro de la clasificación. Para comer sola, decorar tortas y ensaladas, o sumar al desayuno.",
	},
	{
		productId: 102,
		name: "Nuez cuartos extra light",
		description:
			"Nuez en cuartos, del mismo color extra light que la mariposa. Rinde más en budines, panes, granolas y rellenos.",
	},
	{
		productId: 103,
		name: "Castaña de cajú tostada sin sal",
		description: cashew,
	},
	{
		productId: 104,
		name: "Castaña de cajú tostada salada",
		description: cashew,
	},
	{
		productId: 105,
		name: "Pistacho con cáscara Riojano",
		description:
			"Pistacho de La Rioja, con cáscara. Para picar, o pelado y picado en ensaladas, helados y repostería.",
	},
	{
		productId: 106,
		name: "Avellana Chile 13-15",
		description:
			"Avellana de Chile, calibre 13-15 mm. Para tostar y picar, hacer crema de avellanas casera, repostería y granolas.",
	},
	{
		productId: 107,
		name: "Pecan premium",
		description:
			"Nuez pecán de calidad premium, de sabor más dulce y suave que la nuez común. Para pies, budines, ensaladas o para comer al natural.",
	},
	{
		productId: 108,
		name: "Maní tostado salado",
		description:
			"Maní tostado y salado, listo para comer. Para picar, armar la picada o sumar a salteados.",
	},
	{
		productId: 109,
		name: "Mix de frutos secos económico",
		description:
			"Mezcla de frutos secos a un precio accesible, para tener variedad sin gastar de más. Para picar entre comidas o sumar al desayuno.",
	},
	{
		productId: 110,
		name: "Mix de frutos secos deportivo",
		description:
			"Mezcla de frutos secos pensada para llevar: a una caminata, a la montaña o al gimnasio.",
	},
	{
		productId: 111,
		name: "Mix de frutos secos antioxidante premium",
		description:
			"Mezcla premium de frutos secos. Para picar, sumar al yogur o al desayuno.",
	},
	{
		productId: 112,
		name: "Banana chips",
		description:
			"Rodajas de banana crocantes. Para picar o sumar a granolas, yogur y mezclas de frutos secos.",
	},
	{
		productId: 113,
		name: "Pasa de uva Flame sin semilla",
		description:
			"Pasas de uva variedad Flame, sin semilla, de color oscuro y sabor dulce. Para budines, rellenos, ensaladas, arroces o para picar.",
	},
	{
		productId: 114,
		name: "Pasa de uva rubia premium 2026",
		description:
			"Pasas rubias de cosecha 2026, de color dorado. Para pan dulce, budines, ensaladas y cuscús.",
	},
	{
		productId: 115,
		name: "Dátil Egipto",
		description:
			"Dátiles de Egipto, de sabor dulce. Para comer solos, rellenar, endulzar licuados o sumar a postres.",
	},
	{
		productId: 116,
		name: "Dátil Medjool",
		description:
			"Medjool, una de las variedades de dátil más grandes y carnosas, con sabor parecido al caramelo. Para comer solo, relleno con frutos secos o en postres.",
	},
	{
		productId: 117,
		name: "Ciruela sin carozo grande",
		description:
			"Ciruelas secas sin carozo, de calibre grande. Para comer solas, hacer compotas o sumar a guisos y rellenos de carne.",
	},
	{
		productId: 118,
		name: "Empaque mixto sin carozo (frutas secas surtidas)",
		description:
			"Surtido de frutas secas sin carozo. Para la picada dulce, la mesa de las fiestas o para picar.",
	},
	{
		productId: 119,
		name: "Mix de semillas premium (sésamo, girasol, lino, chía)",
		description:
			"Mezcla de sésamo, girasol, lino y chía. Para sumar a panes, ensaladas, yogur, licuados o rebozados.",
	},
	{
		productId: 120,
		name: "Granola Kuati tradicional",
		description:
			"Granola Kuati en su versión tradicional. Para el desayuno con leche o yogur, o para picar sola.",
	},
	{
		productId: 121,
		name: "Coco rallado fino",
		description:
			"Coco rallado de corte fino. Para tortas, alfajores de maicena, cocadas y rebozados.",
	},
	{
		productId: 122,
		name: "Aceite de oliva extra virgen 0,5 L",
		description: oliveOil,
	},
	{
		productId: 123,
		name: "Aceite de oliva extra virgen 1 L",
		description: oliveOil,
	},
	{
		productId: 124,
		name: "Aceite de oliva extra virgen 5 L",
		description:
			"Extra virgen es la categoría más alta del aceite de oliva. Para usar en crudo o para cocinar. El bidón es la presentación que menos cuesta por litro.",
	},
	{
		productId: 125,
		name: "Pasta de maní Entre Nuts 370 g",
		description:
			"Pasta de maní Entre Nuts, en frasco de 370 g. Para untar en tostadas o sumar a licuados, avena y salsas.",
	},
	{
		productId: 126,
		name: "Sal rosada del Himalaya",
		description:
			"Sal de roca sin refinar, con su color rosado natural. Para condimentar carnes, verduras y ensaladas.",
	},
];
