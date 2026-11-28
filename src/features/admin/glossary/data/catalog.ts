import {
	productPresentationContainerLabelMap,
	productUnitLabelMap,
} from "~/shared/common/commerce.helpers";
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
		label: "Destacado",
		term: "Featured item",
		definition:
			"Una entrada de la sección Destacados de la home: un producto vigente o un combo. El administrador arma la lista en el orden que quiere, y el ranking de ofertas completa con productos los lugares libres, salvo que se apague. Un combo destacado trae a todo su grupo en una sola tarjeta. Lo que no tiene precio no se muestra: un producto sin términos vigentes o un combo sin ningún producto disponible se saltean. La sección tiene tantos lugares como fija el administrador; las entradas de la lista que pasan ese número no se muestran hasta que se sumen lugares o se quiten otras de arriba, y el admin las marca «No entra». El título de la sección es fijo.",
		aliases: [
			"Oferta destacada",
			"Oferta fijada",
			"Promoción",
			"Operación",
			"Pedido abierto",
		],
		href: "/admin/home-offers",
	},
	{
		slug: "concepto-producto-destacado",
		kind: "concept",
		section: "catalog",
		label: "Banda destacada",
		term: "Home spotlight",
		definition:
			'El producto o combo que la home muestra en su propia banda, arriba de los destacados: la elección de un administrador o, cuando nadie eligió y el relleno está prendido, el primero del ranking de ofertas. No se repite en la sección, y un combo en la banda se lleva a todo su grupo. La banda dice "Destacado".',
		aliases: ["Producto destacado", "Oferta protagonista", "Oferta del hero"],
		href: "/admin/home-offers",
	},
	{
		slug: "concepto-cierre-semanal",
		kind: "concept",
		section: "catalog",
		label: "Cierre semanal",
		term: "Weekly closing",
		definition:
			"El día y la hora (de Argentina) en que, cada semana, se le dice al cliente que cierran los pedidos, junto con el plazo de entrega que se muestra desde ese cierre. Es solo informativo: ningún pedido ni operación lo lee, y la compra se sigue lanzando a mano.",
		aliases: ["Fecha límite", "Ventana de compra", "Deadline"],
		href: "/admin/weekly-closing",
	},
	{
		slug: "concepto-ranking-de-ofertas",
		kind: "concept",
		section: "catalog",
		label: "Ranking de ofertas",
		term: "Offers ranking",
		definition:
			"El orden en que los productos vigentes que no están en la lista de destacados compiten por los lugares que la lista deja libres: por ahorro contra el precio de góndola, por descuento de oferta o por volumen de pedidos (pedidos pagados por producto en una ventana reciente), según el criterio que eligió el administrador. Ordena solo productos, nunca combos, y el administrador lo puede apagar. Los términos sin el dato del criterio quedan últimos.",
		aliases: ["Orden", "Top de ofertas", "Consulta"],
		href: "/admin/home-offers",
	},
	{
		slug: "concepto-grupo-de-combos",
		kind: "concept",
		section: "catalog",
		label: "Grupo de combos",
		term: "Combo group",
		definition:
			'Los combos que el administrador junta bajo un mismo nombre de grupo para que la home los muestre en una sola tarjeta, con un selector por personas ("1 persona", "2 personas"). Dentro de un grupo cada combo declara sus personas y no hay dos con el mismo número. Destacar cualquier combo del grupo muestra al grupo entero, abierto en ese combo.',
		aliases: ["Familia de combos", "Combo base", "Tamaño", "Variante"],
		href: "/admin/combos",
	},
	{
		slug: "concepto-moq",
		kind: "concept",
		section: "catalog",
		label: "Mínimo (MOQ)",
		term: "MOQ (minimum order quantity)",
		definition:
			"La cantidad más chica que se puede comprar de un producto, en su unidad: 0,5 en los productos por kg y 1 en los que se venden por unidad. Por encima, la cantidad crece de a un paso, que el formulario propone igual al mínimo; sin paso, el mínimo es la única cantidad. Se cobra como cualquier cantidad: precio unitario por cantidad.",
		aliases: ["MOQ", "Cantidad mínima de compra", "Tamaño de lote"],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-precio-unitario",
		kind: "concept",
		section: "catalog",
		label: "Precio por unidad",
		term: "Unit price",
		definition:
			"El precio que se cobra por cada unidad del producto (por kg, por frasco) y el único precio de cliente que carga el administrador: el total de una línea es precio unitario por cantidad, con el descuento de oferta aplicado. El precio del mínimo y el del paso se derivan de él al guardar. Los términos viejos sin precio unitario lo derivan del precio del mínimo dividido el mínimo.",
		aliases: [
			"Precio unitario",
			"Precio de referencia",
			"refPrice",
			"Precio MOQ",
		],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-precio-por-paso",
		kind: "concept",
		section: "catalog",
		label: "Precio por paso",
		term: "Step price",
		definition:
			'El precio de oferta de un paso de cantidad: precio por unidad por el paso, con el descuento de oferta aplicado. Es el precio principal de la tarjeta de producto y se rotula con lo que compra el paso ("por 500 g", "por bidón"). En los envasados se nombra solo el envase, porque el tamaño ya está en el nombre. Sin paso, toma la cantidad mínima. Nunca se muestra el precio del paso guardado en los términos.',
		aliases: ["Precio del paso", "Precio del bloque"],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-precio-comparativo",
		kind: "concept",
		section: "catalog",
		label: "Precio comparativo",
		term: "Comparison price",
		definition:
			'El precio de oferta por kg o por litro que se muestra debajo del precio por paso, para comparar productos que se venden en pasos y envases distintos ("$ 22.600 / kg"). En productos por peso es el precio por unidad llevado a kg; en productos por unidad se lee del tamaño de la presentación ("370 g", "0,5 L"). No se muestra si el tamaño no se puede leer.',
		aliases: ["Precio por kg", "Precio por litro"],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-planilla-de-precios",
		kind: "concept",
		section: "catalog",
		label: "Planilla de precios",
		term: "Price sheet",
		definition:
			"La planilla (.xlsx) que descarga el administrador en Términos de producto para actualizar en bloque el precio por unidad y la categoría de productos existentes; se sube editada como .xlsx o .csv. Cruza los productos por id y nunca crea ninguno. Es todo o nada: con una fila con error no se aplica nada. Las filas sin cambio se ignoran y una variación de más de ±30 % se marca sin bloquear. El precio se edita en los términos vigentes, sin cerrarlos, y cada cambio queda en el registro de auditoría.",
		aliases: [
			"Lista de precios",
			"Importación de precios",
			"Actualización masiva",
		],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-precio-de-gondola",
		kind: "concept",
		section: "catalog",
		label: "Precio de góndola",
		term: "Market price",
		definition:
			"El precio por unidad al que se vende el mismo producto fuera de CoCo, cargado por un administrador para poder decir cuánto ahorra el cliente. Es un dato declarado y sin verificar: nunca se cobra ni entra en el precio de un carrito.",
		aliases: ["Precio de referencia", "Precio de lista"],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-descuento-de-oferta",
		kind: "concept",
		section: "catalog",
		label: "Descuento de oferta",
		term: "Offer discount",
		definition:
			"Un porcentaje sobre los términos de cliente que baja lo que el cliente realmente paga, aplicado al precio unitario y por lo tanto a cualquier cantidad. No tiene vigencia propia: vive y muere con los términos que lo llevan (ADR 0008).",
		aliases: ["Promoción", "Cupón", "Campaña"],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-precio-oferta",
		kind: "concept",
		section: "catalog",
		label: "Precio oferta",
		term: "Offer price",
		definition:
			"Lo que paga el cliente una vez aplicado el descuento de oferta a los términos de cliente. Se calcula en un solo lugar, así es idéntico en el catálogo, el carrito, el snapshot del checkout y el pago.",
		aliases: ["Precio final", "Precio con descuento", "Total operación"],
		href: "/admin/product-terms",
	},

	{
		slug: "concepto-ahorro",
		kind: "concept",
		section: "catalog",
		label: "Ahorro",
		term: "Market saving",
		definition:
			"Lo que ahorra el cliente por unidad y por bloque MOQ frente al precio de góndola. Ordena el ranking de ofertas de la home cuando el criterio es ahorro; hoy no se muestra al cliente.",
		aliases: ["Descuento", "Savings claim"],
		href: "/admin/product-terms",
	},

	{
		slug: "concepto-presentacion",
		kind: "concept",
		section: "catalog",
		label: "Presentación",
		term: "Presentation",
		definition:
			'El envase en que el cliente compra un producto que se vende por unidad: un envase de una lista cerrada (botella, bidón, frasco, bolsa, paquete, unidad) y un tamaño libre ("0,5 L", "370 g"). Las cantidades se cuentan en ella con plural automático ("2 frascos 370 g"). Los productos por peso no llevan. El pedido la guarda en su snapshot; los pedidos viejos muestran la unidad. Distinta de la presentación del proveedor, que es interna.',
		aliases: ["Envase", "Formato", "Presentación del proveedor"],
		href: "/admin/products",
	},
	{
		slug: "concepto-presentacion-del-proveedor",
		kind: "concept",
		section: "catalog",
		label: "Presentación del proveedor",
		term: "Supplier presentation",
		definition:
			'Cómo empaca el proveedor lo que le compramos ("caja de 10 kg", "12 frascos de 370 g"). Vive en los términos de proveedor y solo se ve en el admin: nunca llega al cliente.',
		aliases: ["Presentación", "Pack del proveedor"],
		href: "/admin/product-terms",
	},
	{
		slug: "concepto-imagen-ilustrativa",
		kind: "concept",
		section: "catalog",
		label: "Imagen ilustrativa",
		term: "Illustrative legend",
		definition:
			"La leyenda «Imagen ilustrativa» que la tienda escribe encima de las fotos grandes de producto (tarjetas, destacado, foto principal de la ficha y vista previa), abajo a la derecha. No se graba en el archivo: la foto descargada no la lleva. Su color es un tono oscuro del color de fondo de las fotos de la categoría, o gris oscuro si la categoría no tiene color. No aparece en miniaturas ni en productos sin foto.",
		aliases: ["Leyenda de la foto", "Marca de agua"],
		href: "/admin/categories",
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-producto",
		kind: "entity",
		section: "catalog",
		label: "Producto",
		definition:
			"El registro interno de un producto: nombre, descripción, categoría, marca, unidad, presentación, imágenes y proveedor por defecto. La descripción es una frase breve de calidad y usos, de hasta 200 caracteres, que el cliente ve en la ficha debajo del nombre; si falta o solo repite el nombre, no se muestra. Lo que el cliente ve es el catálogo, que lo combina con sus términos vigentes.",
		occurrences: [{ code: "Product", db: "product" }],
		href: "/admin/products",
	},
	{
		slug: "entidad-categoria",
		kind: "entity",
		section: "catalog",
		label: "Categoría",
		term: "Category",
		definition:
			"El grupo del catálogo al que pertenece cada producto (frutos secos, mixes y snacks, etc.), con el orden en que se muestra. Cada producto tiene exactamente una; una categoría inactiva o eliminada deja de mostrarse al cliente. Puede tener el color de fondo de las fotos de sus productos, del que sale el tono de la leyenda «Imagen ilustrativa».",
		aliases: ["Rubro", "Familia", "Cabecera"],
		occurrences: [{ code: "Category", db: "category" }],
		href: "/admin/categories",
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
		slug: "entidad-solicitud-de-proveedor",
		kind: "entity",
		section: "catalog",
		label: "Solicitud de proveedor",
		term: "Supplier application",
		definition:
			"La solicitud que un posible proveedor envía desde la página pública /proveedores, que un admin revisa y marca como contactado. No es un proveedor hasta que un admin lo crea.",
		aliases: ["Supplier lead", "Partner request"],
		occurrences: [{ code: "SupplierApplication", db: "supplier_application" }],
		href: "/admin/supplier-applications",
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
			"Los términos comerciales vigentes de cara al cliente para un producto: precio unitario, mínimo, paso y máximo opcionales, precio de góndola y descuento de oferta opcionales, moneda y ventana de validez. El precio del mínimo y el del paso se derivan del unitario. Única fuente de precio para catálogo y carrito.",
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
			"Los términos de compra de un producto a un proveedor: mínimo, precio, paso, presentación del proveedor y ventana de validez. Es lo que un ítem de lote referencia al pedir.",
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
	{
		slug: "entidad-combo",
		kind: "entity",
		section: "catalog",
		label: "Combo",
		definition:
			"Un conjunto con nombre de productos del catálogo, cada uno en su cantidad, que el cliente suma al pedido de una vez. Cada producto entra como una línea más, a su precio de hoy. No tiene precio, stock ni línea propia (ADR 0014). Puede tener descripción, personas y grupo.",
		occurrences: [{ code: "Combo", db: "combo" }],
		href: "/admin/combos",
	},
	{
		slug: "entidad-producto-de-combo",
		kind: "entity",
		section: "catalog",
		label: "Producto de combo",
		definition:
			"Un producto dentro de un combo, con la cantidad que suma y su orden. La cantidad se valida contra el mínimo y el paso del producto al guardar. Un producto que está en un combo no se puede borrar definitivamente.",
		occurrences: [{ code: "ComboItem", db: "combo_item" }],
		href: "/admin/combos",
	},
	{
		slug: "entidad-destacado",
		kind: "entity",
		section: "catalog",
		label: "Destacado",
		definition:
			"Una entrada de la lista de destacados de la home: un producto o un combo, en la posición que eligió el administrador.",
		occurrences: [{ code: "HomeFeaturedItem", db: "home_featured_item" }],
		href: "/admin/home-offers",
	},
	{
		slug: "entidad-configuracion-de-ofertas-del-home",
		kind: "entity",
		section: "catalog",
		label: "Configuración de destacados",
		definition:
			"La única fila que guarda cómo se arma la home: la banda destacada (un producto o un combo), el criterio del ranking de ofertas, cuántos lugares tiene la sección y si el ranking completa los libres. La lista vive en Destacado.",
		occurrences: [{ code: "HomeOfferSettings", db: "home_offer_settings" }],
		href: "/admin/home-offers",
	},
	{
		slug: "entidad-cierre-semanal",
		kind: "entity",
		section: "catalog",
		label: "Configuración del cierre semanal",
		definition:
			"La única fila que guarda el día, la hora y el plazo de entrega del cierre semanal. Si no existe, la tienda usa miércoles 12:00 y 7 a 10 días.",
		occurrences: [
			{ code: "WeeklyClosingSettings", db: "weekly_closing_settings" },
		],
		href: "/admin/weekly-closing",
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

	// --- Estados: envase de la presentación ---------------------------------
	{
		slug: "estado-envase-botella",
		kind: "status",
		section: "catalog",
		label: productPresentationContainerLabelMap.botella.one,
		definition: "El producto se vende por botella.",
		occurrences: [
			{
				code: "ProductPresentationContainer.botella",
				db: "product.presentationContainer",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-envase-bidon",
		kind: "status",
		section: "catalog",
		label: productPresentationContainerLabelMap.bidon.one,
		definition: "El producto se vende por bidón.",
		occurrences: [
			{
				code: "ProductPresentationContainer.bidon",
				db: "product.presentationContainer",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-envase-frasco",
		kind: "status",
		section: "catalog",
		label: productPresentationContainerLabelMap.frasco.one,
		definition: "El producto se vende por frasco.",
		occurrences: [
			{
				code: "ProductPresentationContainer.frasco",
				db: "product.presentationContainer",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-envase-bolsa",
		kind: "status",
		section: "catalog",
		label: productPresentationContainerLabelMap.bolsa.one,
		definition: "El producto se vende por bolsa.",
		occurrences: [
			{
				code: "ProductPresentationContainer.bolsa",
				db: "product.presentationContainer",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-envase-paquete",
		kind: "status",
		section: "catalog",
		label: productPresentationContainerLabelMap.paquete.one,
		definition: "El producto se vende por paquete.",
		occurrences: [
			{
				code: "ProductPresentationContainer.paquete",
				db: "product.presentationContainer",
			},
		],
		href: "/admin/products",
	},
	{
		slug: "estado-envase-unidad",
		kind: "status",
		section: "catalog",
		label: productPresentationContainerLabelMap.unidad.one,
		definition:
			"El producto se vende por unidad suelta, sin un envase que nombrar.",
		occurrences: [
			{
				code: "ProductPresentationContainer.unidad",
				db: "product.presentationContainer",
			},
		],
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

	// --- Estados: criterio del ranking de ofertas ----------------------------
	{
		slug: "estado-criterio-ahorro-contra-gondola",
		kind: "status",
		section: "catalog",
		label: "Ahorro contra góndola",
		definition:
			"El ranking ordena por la plata que el cliente ahorra frente al precio de góndola sobre el bloque del MOQ. Los términos sin precio de góndola quedan últimos.",
		occurrences: [
			{
				code: "HomeOffersCriterion.marketSaving",
				db: "home_offer_settings.criterion",
			},
		],
		href: "/admin/home-offers",
	},
	{
		slug: "estado-criterio-descuento-de-oferta",
		kind: "status",
		section: "catalog",
		label: "Descuento de oferta",
		definition:
			"El ranking ordena por el porcentaje de descuento cargado en los términos de cliente. Los términos sin descuento quedan últimos.",
		occurrences: [
			{
				code: "HomeOffersCriterion.discountPercent",
				db: "home_offer_settings.criterion",
			},
		],
		href: "/admin/home-offers",
	},
	{
		slug: "estado-criterio-volumen-de-pedidos",
		kind: "status",
		section: "catalog",
		label: "Volumen de pedidos",
		definition:
			"El ranking ordena por la cantidad de pedidos pagados que incluyeron el producto en los últimos 90 días, sumando todos sus términos de cliente. Un pedido cuenta si su pago se acreditó en esa ventana y no terminó cancelado, reembolsado ni en contracargo. Los productos sin pedidos pagados quedan últimos.",
		occurrences: [
			{
				code: "HomeOffersCriterion.orderVolume",
				db: "home_offer_settings.criterion",
			},
		],
		href: "/admin/home-offers",
	},
];
