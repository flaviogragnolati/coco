import { productUnitLabelMap } from "~/shared/common/commerce.helpers";
import type { GlossaryEntry } from "../glossary.types";

export const catalogGlossaryEntries: GlossaryEntry[] = [
	// --- Conceptos -----------------------------------------------------------
	{
		slug: "concepto-catalogo",
		kind: "concept",
		section: "catalog",
		label: "Catálogo",
		term: "Catalog",
		definition:
			"El conjunto de productos comprables que ve el cliente, cada uno con sus términos de cliente vigentes. Distinto del registro interno Producto.",
		aliases: ["Tienda", "Listado de productos"],
		href: "/admin/products",
	},
	{
		slug: "concepto-oferta-destacada",
		kind: "concept",
		section: "catalog",
		label: "Oferta destacada",
		term: "Featured offer",
		definition:
			"Un producto del catálogo que aparece automáticamente en la home a partir de sus términos de cliente activos. No implica promoción, descuento ni operación abierta.",
		aliases: ["Promoción", "Descuento", "Operación"],
		href: "/admin/products",
	},
	{
		slug: "concepto-moq",
		kind: "concept",
		section: "catalog",
		label: "MOQ (cantidad mínima de compra)",
		term: "MOQ (minimum order quantity)",
		definition:
			"La cantidad más chica que se puede comprar de un producto y la unidad en la que se suma demanda. Se cobra como bloque según los términos de cliente, con incrementos opcionales por paso.",
		aliases: ["Mínimo", "Tamaño de lote"],
		href: "/admin/product-terms",
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-producto",
		kind: "entity",
		section: "catalog",
		label: "Producto",
		definition:
			"El registro interno de un producto: nombre, marca, unidad, imágenes y proveedor por defecto. Lo que el cliente ve es el catálogo, que lo combina con sus términos vigentes.",
		occurrences: [{ code: "Product", db: "product" }],
		href: "/admin/products",
	},
	{
		slug: "entidad-marca",
		kind: "entity",
		section: "catalog",
		label: "Marca",
		definition: "La marca comercial a la que pertenece un producto.",
		occurrences: [{ code: "Brand", db: "brand" }],
		href: "/admin/brands",
	},
	{
		slug: "entidad-proveedor",
		kind: "entity",
		section: "catalog",
		label: "Proveedor",
		definition:
			"El mayorista al que se le compran los productos. Es el eje por el que se agrupan los lotes dentro de una operación.",
		occurrences: [{ code: "Supplier", db: "supplier" }],
		href: "/admin/suppliers",
	},
	{
		slug: "entidad-transportista",
		kind: "entity",
		section: "catalog",
		label: "Transportista",
		term: "Carrier",
		definition:
			"El proveedor logístico que mueve los envíos. En código, URLs y datos se mantiene `carrier`.",
		aliases: ["Courier", "Empresa de transporte"],
		occurrences: [{ code: "Carrier", db: "carrier" }],
		href: "/admin/carriers",
	},
	{
		slug: "entidad-destino",
		kind: "entity",
		section: "catalog",
		label: "Destino",
		definition:
			"Un depósito interno donde se recibe la mercadería del proveedor antes de fraccionarla hacia los clientes.",
		occurrences: [{ code: "Destination", db: "destination" }],
		href: "/admin/destinations",
	},
	{
		slug: "entidad-terminos-de-cliente",
		kind: "entity",
		section: "catalog",
		label: "Términos de cliente",
		term: "Client terms",
		definition:
			"Los términos comerciales vigentes de cara al cliente para un producto: MOQ y su precio, paso y precio de paso opcionales, precio de referencia, moneda y ventana de validez. Única fuente de precio para catálogo y carrito.",
		aliases: ["Precios", "Términos de precio"],
		occurrences: [{ code: "ProductClientTerms", db: "product_client_terms" }],
		href: "/admin/product-terms",
	},
	{
		slug: "entidad-terminos-de-proveedor",
		kind: "entity",
		section: "catalog",
		label: "Términos de proveedor",
		definition:
			"Los términos de compra de un producto a un proveedor: mínimo, precio, paso y ventana de validez. Es lo que un ítem de lote referencia al pedir.",
		occurrences: [
			{ code: "ProductSupplierTerms", db: "product_supplier_terms" },
		],
		href: "/admin/product-terms",
	},
	{
		slug: "entidad-restricciones-locales",
		kind: "entity",
		section: "catalog",
		label: "Restricciones locales de producto",
		definition:
			"Reglas acotadas que limitan cómo puede comprarse un producto: tope de cantidad, destinos restringidos, disponibilidad estacional y similares.",
		occurrences: [
			{ code: "ProductLocalConstraints", db: "product_local_constraints" },
		],
		href: "/admin/products",
	},

	// --- Estados: unidad de producto -----------------------------------------
	{
		slug: "estado-unidad-kg",
		kind: "status",
		section: "catalog",
		label: productUnitLabelMap.kg,
		definition: "El producto se compra y se factura por kilogramo.",
		occurrences: [{ code: "ProductUnit.kg", db: "product.unit" }],
		href: "/admin/products",
	},
	{
		slug: "estado-unidad-gr",
		kind: "status",
		section: "catalog",
		label: productUnitLabelMap.gr,
		definition: "El producto se compra y se factura por gramo.",
		occurrences: [{ code: "ProductUnit.gr", db: "product.unit" }],
		href: "/admin/products",
	},
	{
		slug: "estado-unidad-lb",
		kind: "status",
		section: "catalog",
		label: productUnitLabelMap.lb,
		definition: "El producto se compra y se factura por libra.",
		occurrences: [{ code: "ProductUnit.lb", db: "product.unit" }],
		href: "/admin/products",
	},
	{
		slug: "estado-unidad-caja",
		kind: "status",
		section: "catalog",
		label: productUnitLabelMap.box,
		definition: "El producto se compra por caja cerrada.",
		occurrences: [{ code: "ProductUnit.box", db: "product.unit" }],
		href: "/admin/products",
	},
	{
		slug: "estado-unidad-pieza",
		kind: "status",
		section: "catalog",
		label: productUnitLabelMap.piece,
		definition: "El producto se cuenta por pieza individual.",
		occurrences: [{ code: "ProductUnit.piece", db: "product.unit" }],
		href: "/admin/products",
	},
	{
		slug: "estado-unidad-otra",
		kind: "status",
		section: "catalog",
		label: productUnitLabelMap.other,
		definition:
			"Unidad sin categoría propia; se muestra igual que pieza pero indica que el producto no encaja en las anteriores.",
		occurrences: [{ code: "ProductUnit.other", db: "product.unit" }],
		href: "/admin/products",
	},

	// --- Estados: tipo de restricción local ----------------------------------
	{
		slug: "estado-restriccion-cantidad-maxima",
		kind: "status",
		section: "catalog",
		label: "Cantidad máxima",
		definition:
			"Tope de cantidad comprable del producto dentro del alcance dado.",
		occurrences: [
			{
				code: "ProductLocalConstraintType.max_quantity",
				db: "product_local_constraints.constraintType",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-restriccion-destino-restringido",
		kind: "status",
		section: "catalog",
		label: "Destino restringido",
		definition: "El producto no puede enviarse a determinados destinos.",
		occurrences: [
			{
				code: "ProductLocalConstraintType.restricted_destination",
				db: "product_local_constraints.constraintType",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-restriccion-entrega-interna",
		kind: "status",
		section: "catalog",
		label: "Requiere entrega interna",
		definition:
			"El producto debe pasar por un destino interno y no puede ir directo al cliente.",
		occurrences: [
			{
				code: "ProductLocalConstraintType.requires_internal_delivery",
				db: "product_local_constraints.constraintType",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-restriccion-stock-minimo",
		kind: "status",
		section: "catalog",
		label: "Stock mínimo",
		definition:
			"El producto exige mantener una existencia mínima antes de habilitar la compra.",
		occurrences: [
			{
				code: "ProductLocalConstraintType.minimum_stock",
				db: "product_local_constraints.constraintType",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-restriccion-legal",
		kind: "status",
		section: "catalog",
		label: "Restricción legal",
		definition:
			"Una norma externa limita la venta del producto en el alcance indicado.",
		occurrences: [
			{
				code: "ProductLocalConstraintType.legal_restriction",
				db: "product_local_constraints.constraintType",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-restriccion-estacional",
		kind: "status",
		section: "catalog",
		label: "Disponibilidad estacional",
		definition:
			"El producto solo se ofrece dentro de una ventana temporal del año.",
		occurrences: [
			{
				code: "ProductLocalConstraintType.seasonal_availability",
				db: "product_local_constraints.constraintType",
			},
		],
		href: "/admin/products",
	},
];
