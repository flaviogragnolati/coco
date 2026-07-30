import { carrierOrderStatusLabelMap } from "~/features/admin/crud/carrier-order/carrier-order.mappers";
import { lotStatusLabelMap } from "~/features/admin/crud/lot/lot.mappers";
import {
	operationStatusLabelMap,
	operationStrategyLabelMap,
} from "~/features/admin/crud/operation/operation.mappers";
import { fulfillmentStatusLabelMap } from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import {
	packageLegLabelMap,
	packageLotItemStatusLabelMap,
	packageStatusLabelMap,
} from "~/features/admin/crud/package/package.mappers";
import {
	rollOverStageLabelMap,
	rollOverStatusLabelMap,
} from "~/features/admin/crud/roll-over/roll-over.mappers";
import {
	deliveryModeLabelMap,
	shipmentStatusLabelMap,
	shipmentTypeLabelMap,
} from "~/features/admin/crud/shipment/shipment.mappers";
import { supplierOrderStatusLabelMap } from "~/features/admin/crud/supplier-order/supplier-order.mappers";
import type { GlossaryEntry } from "../glossary.types";

export const operationGlossaryEntries: GlossaryEntry[] = [
	// --- Conceptos -----------------------------------------------------------
	{
		slug: "concepto-borrador-de-operacion",
		kind: "concept",
		section: "operation",
		label: "Borrador de operación",
		term: "Operation draft",
		definition:
			"Una operación creada pero no ejecutada, que guarda sus parámetros, las omisiones del admin y una huella de la demanda revisada. No materializa nada, así que no reserva demanda.",
		aliases: ["Preview", "Simulación", "Operación pendiente"],
		href: "/admin/operations",
	},
	{
		slug: "concepto-revision-de-operacion",
		kind: "concept",
		section: "operation",
		label: "Revisión de operación",
		term: "Operation review",
		definition:
			"El paso entre elegir los parámetros de una operación y ejecutarla, donde el admin ve la demanda que se agruparía y los lotes que produciría. La ejecución se rechaza si la demanda cambió desde la revisión.",
		aliases: ["Confirmación", "Pantalla de preview"],
		href: "/admin/operations",
	},
	{
		slug: "concepto-omision",
		kind: "concept",
		section: "operation",
		label: "Omisión",
		term: "Omission",
		definition:
			"La decisión del admin de dejar un ítem de demanda o un usuario entero fuera de una operación antes de ejecutarla. No escribe nada sobre la demanda: la cantidad omitida vuelve a entrar en la agregación de la próxima operación.",
		aliases: ["Exclusión", "Skip", "Cancelación"],
		href: "/admin/operations",
	},
	{
		slug: "concepto-ventana-administrativa",
		kind: "concept",
		section: "operation",
		label: "Ventana administrativa",
		term: "Administrative window",
		definition:
			"El período mientras toda orden de proveedor viva de una operación sigue pendiente, durante el cual la operación puede compensarse.",
		aliases: ["Período de gracia"],
		href: "/admin/operations",
	},
	{
		slug: "concepto-compensacion-de-operacion",
		kind: "concept",
		section: "operation",
		label: "Compensación de operación",
		term: "Operation compensation",
		definition:
			"El deshacer administrativo de una operación ejecutada: se cancelan sus lotes, líneas y órdenes de proveedor, los rollovers que creó, y los que consumió vuelven a abiertos. Nunca se borran registros.",
		aliases: ["Rollback", "Reversión", "Revert"],
		href: "/admin/operations",
	},
	{
		slug: "concepto-despacho-de-proveedor",
		kind: "concept",
		section: "operation",
		label: "Despacho de proveedor",
		term: "Supplier dispatch",
		definition:
			"El envío anunciado de mercadería para una orden de proveedor. Registrarlo crea un envío interno y su paquete de entrada consolidado; una acción aparte confirma la salida.",
		aliases: ["Remito", "Nota de entrega"],
		href: "/admin/supplier-orders",
	},
	{
		slug: "concepto-diferencia-de-recepcion",
		kind: "concept",
		section: "operation",
		label: "Diferencia de recepción",
		term: "Receipt discrepancy",
		definition:
			"La brecha entre la cantidad que declaró un despacho y la que se recibió. Se absorbe sobre asignaciones de demanda concretas y se convierte en un rollover posterior a la asignación con motivo obligatorio.",
		aliases: ["Faltante", "Merma", "Shortfall"],
		href: "/admin/supplier-orders",
	},
	{
		slug: "concepto-absorcion-de-corte",
		kind: "concept",
		section: "operation",
		label: "Absorción de corte",
		term: "Cut absorption",
		definition:
			"La reasignación del faltante de un proveedor sobre asignaciones de demanda concretas, LIFO por fecha de pago por defecto y ajustable manualmente por asignación.",
		aliases: ["Prorrateo", "Reasignación"],
		href: "/admin/supplier-orders",
	},
	{
		slug: "concepto-tramo-del-paquete",
		kind: "concept",
		section: "operation",
		label: "Tramo del paquete",
		term: "Package leg",
		definition:
			"La dirección en la que se mueve un paquete: entrada (proveedor a destino) o salida (destino a usuario final). La conservación de cantidad se verifica por tramo.",
		aliases: ["Generación", "Dirección"],
		occurrences: [{ code: "PackageLeg", db: "package.leg" }],
		href: "/admin/packages",
	},
	{
		slug: "concepto-fraccionamiento",
		kind: "concept",
		section: "operation",
		label: "Fraccionamiento",
		term: "Fractionation",
		definition:
			"La acción, en el destino, que convierte cantidad de entrada recibida en paquetes de salida, uno por cliente por defecto. Deja los paquetes de entrada como historia de arribo y puede correr en varias pasadas.",
		aliases: ["Reempaque", "Split"],
		href: "/admin/packages",
	},
	{
		slug: "concepto-promocion-de-paquete",
		kind: "concept",
		section: "operation",
		label: "Promoción de paquete",
		term: "Package promotion",
		definition:
			"Reasignar un paquete de entrada mono-cliente al tramo de salida preservando su identidad física, cuando el proveedor ya fraccionó por cliente. El paquete vuelve a listo para envío.",
		aliases: ["Reenvío"],
		href: "/admin/packages",
	},
	{
		slug: "concepto-division-de-paquete",
		kind: "concept",
		section: "operation",
		label: "División de paquete",
		term: "Package split",
		definition:
			"Dividir un paquete en varios para que los registros coincidan con los bultos físicos reales. Cambia cómo se agrupa la cantidad, nunca cuánta hay empacada.",
		aliases: ["Fraccionamiento", "Promoción de paquete"],
		href: "/admin/packages",
	},
	{
		slug: "concepto-recuperacion-de-paquete",
		kind: "concept",
		section: "operation",
		label: "Recuperación de paquete",
		term: "Package recovery",
		definition:
			"Devolver un paquete demorado al estado en el que estaba antes de la disrupción: esperando en el destino si no había salido, en movimiento si su envío ya partió.",
		aliases: ["Reintento", "Des-demorar"],
		href: "/admin/packages",
	},
	{
		slug: "concepto-modo-de-entrega",
		kind: "concept",
		section: "operation",
		label: "Modo de entrega",
		term: "Delivery mode",
		definition:
			"Cómo llega un paquete de salida a su cliente: a domicilio y punto de retiro viajan en un envío a usuario final y se distinguen por el modo registrado, mientras que el retiro en depósito es la ausencia de envío.",
		aliases: ["Método de envío", "Tipo de entrega"],
		occurrences: [{ code: "DeliveryMode", db: "shipment.deliveryMode" }],
		href: "/admin/shipments",
	},
	{
		slug: "concepto-punto-de-retiro",
		kind: "concept",
		section: "operation",
		label: "Punto de retiro",
		term: "Pickup point",
		definition:
			"Una dirección compartida a la que viaja un envío a usuario final, donde después cada cliente retira su propio paquete. Su arribo no es una entrega, así que cada paquete sigue necesitando su confirmación.",
		aliases: ["Depósito", "Almacén", "Destino"],
		href: "/admin/shipments",
	},
	{
		slug: "concepto-confirmacion-de-entrega",
		kind: "concept",
		section: "operation",
		label: "Confirmación de entrega",
		term: "Delivery confirmation",
		definition:
			"La acción por paquete que registra la entrega física de un paquete de salida a su cliente. Automática a domicilio, explícita en retiro en depósito y punto de retiro.",
		aliases: ["Prueba de entrega"],
		href: "/admin/packages",
	},
	{
		slug: "concepto-dar-de-baja",
		kind: "concept",
		section: "operation",
		label: "Dar de baja",
		term: "Write-off",
		definition:
			"El cierre terminal de un paquete o envío fallido, que convierte la cantidad afectada en un rollover posterior a la asignación con un motivo.",
		aliases: ["Pérdida", "Merma"],
		href: "/admin/packages",
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-operacion",
		kind: "entity",
		section: "operation",
		label: "Operación",
		term: "Operation",
		definition:
			"Lote de agregación de la demanda ya enviada por los clientes. Es la corrida que agrupa esa demanda en lotes por proveedor.",
		aliases: ["Job", "Corrida"],
		occurrences: [{ code: "Operation", db: "operation" }],
		href: "/admin/operations",
	},
	{
		slug: "entidad-lote",
		kind: "entity",
		section: "operation",
		label: "Lote",
		term: "Lot",
		definition:
			"Agrupación de demanda agregada acotada a un proveedor dentro de una operación.",
		aliases: ["Batch", "Paquete"],
		occurrences: [{ code: "Lot", db: "lot" }],
		href: "/admin/lots",
	},
	{
		slug: "entidad-item-de-lote",
		kind: "entity",
		section: "operation",
		label: "Ítem de lote",
		term: "Lot item",
		definition:
			"La línea solicitada al proveedor dentro de un lote: producto, términos de proveedor y cantidad.",
		aliases: ["Ítem de paquete", "Ítem del cliente"],
		occurrences: [{ code: "LotItem", db: "lot_item" }],
		href: "/admin/lots",
	},
	{
		slug: "entidad-asignacion-de-demanda",
		kind: "entity",
		section: "operation",
		label: "Asignación de demanda",
		term: "Demand allocation",
		definition:
			"El puente de cantidad que conecta una solicitud del cliente con un ítem de lote del proveedor.",
		aliases: ["CartItemLotItem", "Ítem del cliente"],
		occurrences: [{ code: "CartItemLotItem", db: "cart_item_lot_item" }],
		href: "/admin/lots",
	},
	{
		slug: "entidad-asignacion-empaquetada",
		kind: "entity",
		section: "operation",
		label: "Asignación empaquetada",
		term: "Packaged allocation",
		definition:
			"El puente de cantidad que conecta una asignación de demanda con una línea de paquete.",
		aliases: ["PackageAllocation", "Línea de paquete"],
		occurrences: [{ code: "PackageAllocation", db: "package_allocation" }],
		href: "/admin/packages",
	},
	{
		slug: "entidad-rollover",
		kind: "entity",
		section: "operation",
		label: "Rollover",
		term: "Roll over",
		definition:
			"Cantidad que se cayó del camino de fulfillment actual y tiene que volver a agruparse o resolverse de otra forma.",
		aliases: ["Remanente", "Sobrante", "Delta silencioso de cantidad"],
		occurrences: [{ code: "RollOver", db: "roll_over" }],
		href: "/admin/roll-overs",
	},
	{
		slug: "entidad-orden-de-proveedor",
		kind: "entity",
		section: "operation",
		label: "Orden de proveedor",
		term: "Supplier order",
		definition:
			"La orden comercial por proveedor que pide uno o más lotes a un mayorista. Es el agregado de comando del ciclo de proveedor: pedido, confirmación y cancelación se comandan acá y bajan a lotes y líneas.",
		aliases: ["Orden de compra", "Orden mayorista"],
		occurrences: [{ code: "SupplierOrder", db: "supplier_order" }],
		href: "/admin/supplier-orders",
	},
	{
		slug: "entidad-paquete",
		kind: "entity",
		section: "operation",
		label: "Paquete",
		term: "Package",
		definition:
			"Un paquete físico que mueve cantidad abastecida en un solo tramo, a la granularidad que el equipo elija trazar: uno consolidado por orden de proveedor por defecto.",
		aliases: ["Envío", "Orden de transporte", "Paquete lógico"],
		occurrences: [{ code: "Package", db: "package" }],
		href: "/admin/packages",
	},
	{
		slug: "entidad-linea-de-paquete",
		kind: "entity",
		section: "operation",
		label: "Línea de paquete",
		term: "Package line",
		definition:
			"La cantidad de un ítem de lote representada dentro de un paquete.",
		aliases: ["Ítem de lote", "Asignación de paquete"],
		occurrences: [{ code: "PackageLotItem", db: "package_lot_item" }],
		href: "/admin/packages",
	},
	{
		slug: "entidad-envio",
		kind: "entity",
		section: "operation",
		label: "Envío",
		term: "Shipment",
		definition:
			"Registro de movimiento de paquetes, entre ubicaciones internas o hacia el usuario final.",
		aliases: ["Paquete", "Orden de transporte"],
		occurrences: [{ code: "Shipment", db: "shipment" }],
		href: "/admin/shipments",
	},
	{
		slug: "entidad-orden-de-transporte",
		kind: "entity",
		section: "operation",
		label: "Orden de transporte",
		term: "Carrier order",
		definition:
			"La contratación de un transportista para mover uno o más envíos, con su propia referencia externa. Registra la contratación, nunca la mercadería.",
		aliases: ["Orden de flete", "Booking", "Envío"],
		occurrences: [{ code: "CarrierOrder", db: "carrier_order" }],
		href: "/admin/carrier-orders",
	},

	// --- Estados: operación --------------------------------------------------
	{
		slug: "estado-operacion-borrador",
		kind: "status",
		section: "operation",
		label: operationStatusLabelMap.draft,
		definition:
			"Parámetros y omisiones fijados, esperando la revisión del admin. No materializa nada y por lo tanto no reserva demanda.",
		occurrences: [{ code: "OperationStatus.draft", db: "operation.status" }],
		href: "/admin/operations",
	},
	{
		slug: "estado-operacion-en-ejecucion",
		kind: "status",
		section: "operation",
		label: operationStatusLabelMap.running,
		definition: "La asignación de demanda de la operación está en curso.",
		occurrences: [{ code: "OperationStatus.running", db: "operation.status" }],
		href: "/admin/operations",
	},
	{
		slug: "estado-operacion-completada",
		kind: "status",
		section: "operation",
		label: operationStatusLabelMap.completed,
		definition:
			"La ejecución técnica terminó bien. Aplica también al cierre exitoso de una orden de proveedor o de transporte.",
		occurrences: [
			{ code: "OperationStatus.completed", db: "operation.status" },
			{ code: "SupplierOrderStatus.completed", db: "supplier_order.status" },
			{ code: "CarrierOrderStatus.completed", db: "carrier_order.status" },
		],
		href: "/admin/operations",
	},
	{
		slug: "estado-operacion-fallida",
		kind: "status",
		section: "operation",
		label: operationStatusLabelMap.failed,
		definition:
			"Error técnico durante la ejecución, o fallo del transporte contratado.",
		occurrences: [
			{ code: "OperationStatus.failed", db: "operation.status" },
			{ code: "CarrierOrderStatus.failed", db: "carrier_order.status" },
		],
		href: "/admin/operations",
	},
	{
		slug: "estado-operacion-cancelada",
		kind: "status",
		section: "operation",
		label: operationStatusLabelMap.cancelled,
		definition:
			"La operación fue compensada dentro de la ventana administrativa: sus salidas quedaron canceladas y su demanda volvió a la cola.",
		occurrences: [
			{ code: "OperationStatus.cancelled", db: "operation.status" },
		],
		href: "/admin/operations",
	},
	{
		slug: "estado-estrategia-fifo",
		kind: "status",
		section: "operation",
		label: operationStrategyLabelMap.fifo,
		definition:
			"La demanda entra a la operación en el orden en que se agregó al carrito.",
		occurrences: [{ code: "OperationStrategy.fifo", db: "operation.strategy" }],
		href: "/admin/operations",
	},
	{
		slug: "estado-estrategia-otra",
		kind: "status",
		section: "operation",
		label: operationStrategyLabelMap.other,
		definition: "Reservado para estrategias de agregación futuras.",
		occurrences: [
			{ code: "OperationStrategy.other", db: "operation.strategy" },
		],
		href: "/admin/operations",
	},

	// --- Estados: lote y línea de lote ---------------------------------------
	{
		slug: "estado-lote-pendiente",
		kind: "status",
		section: "operation",
		label: lotStatusLabelMap.pending,
		definition:
			"El lote o su línea existen, pero la demanda que califica todavía no se terminó de armar ni se pidió al proveedor.",
		occurrences: [
			{ code: "LotStatus.pending", db: "lot.status" },
			{ code: "LotItemStatus.pending", db: "lot_item.status" },
		],
		href: "/admin/lots",
	},
	{
		slug: "estado-lote-armando",
		kind: "status",
		section: "operation",
		label: lotStatusLabelMap.assembling,
		definition:
			"El sistema está agregando y validando demanda dentro del lote.",
		occurrences: [{ code: "LotStatus.assembling", db: "lot.status" }],
		href: "/admin/lots",
	},
	{
		slug: "estado-lote-solicitado",
		kind: "status",
		section: "operation",
		label: lotStatusLabelMap.requested,
		definition:
			"El lote o su línea se convirtieron en un pedido al proveedor y esperan confirmación.",
		occurrences: [
			{ code: "LotStatus.requested", db: "lot.status" },
			{ code: "LotItemStatus.requested", db: "lot_item.status" },
		],
		href: "/admin/lots",
	},
	{
		slug: "estado-lote-confirmado",
		kind: "status",
		section: "operation",
		label: lotStatusLabelMap.confirmed,
		definition: "El proveedor confirmó el contenido del lote o de la línea.",
		occurrences: [
			{ code: "LotStatus.confirmed", db: "lot.status" },
			{ code: "LotItemStatus.confirmed", db: "lot_item.status" },
		],
		href: "/admin/lots",
	},
	{
		slug: "estado-lote-listo-para-empaque",
		kind: "status",
		section: "operation",
		label: lotStatusLabelMap.readyForPackaging,
		definition:
			"La cantidad está disponible para asignarse a paquetes y envíos.",
		occurrences: [
			{ code: "LotStatus.readyForPackaging", db: "lot.status" },
			{ code: "LotItemStatus.readyForPackaging", db: "lot_item.status" },
		],
		href: "/admin/lots",
	},
	{
		slug: "estado-lote-completado",
		kind: "status",
		section: "operation",
		label: lotStatusLabelMap.completed,
		definition:
			"El lote o su línea llegaron a su estado terminal exitoso: se cumplieron o se cerraron bien.",
		occurrences: [
			{ code: "LotStatus.completed", db: "lot.status" },
			{ code: "LotItemStatus.completed", db: "lot_item.status" },
		],
		href: "/admin/lots",
	},
	{
		slug: "estado-lote-cancelado",
		kind: "status",
		section: "operation",
		label: lotStatusLabelMap.cancelled,
		definition:
			"El lote o su línea se cancelaron y no siguen por el fulfillment.",
		occurrences: [
			{ code: "LotStatus.cancelled", db: "lot.status" },
			{ code: "LotItemStatus.cancelled", db: "lot_item.status" },
		],
		href: "/admin/lots",
	},

	// --- Estados: orden de proveedor -----------------------------------------
	{
		slug: "estado-orden-proveedor-pendiente",
		kind: "status",
		section: "operation",
		label: supplierOrderStatusLabelMap.pending,
		definition: "La orden de proveedor existe pero todavía no se envió.",
		occurrences: [
			{ code: "SupplierOrderStatus.pending", db: "supplier_order.status" },
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-orden-proveedor-solicitada",
		kind: "status",
		section: "operation",
		label: supplierOrderStatusLabelMap.requested,
		definition:
			"La orden se envió al proveedor y espera su confirmación. Aplica igual a la orden de transporte pedida al transportista.",
		occurrences: [
			{ code: "SupplierOrderStatus.requested", db: "supplier_order.status" },
			{ code: "CarrierOrderStatus.requested", db: "carrier_order.status" },
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-orden-proveedor-confirmada",
		kind: "status",
		section: "operation",
		label: supplierOrderStatusLabelMap.confirmed,
		definition:
			"El proveedor aceptó el contenido de la orden, o el transportista aceptó la contratación.",
		occurrences: [
			{ code: "SupplierOrderStatus.confirmed", db: "supplier_order.status" },
			{ code: "CarrierOrderStatus.confirmed", db: "carrier_order.status" },
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-orden-proveedor-lista-para-recepcion",
		kind: "status",
		section: "operation",
		label: supplierOrderStatusLabelMap.readyForReceipt,
		definition:
			"El proveedor tiene la orden lista para retiro, despacho o recepción en depósito.",
		occurrences: [
			{
				code: "SupplierOrderStatus.readyForReceipt",
				db: "supplier_order.status",
			},
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-orden-proveedor-cancelada",
		kind: "status",
		section: "operation",
		label: supplierOrderStatusLabelMap.cancelled,
		definition:
			"La orden de proveedor o de transporte se canceló antes de completarse.",
		occurrences: [
			{ code: "SupplierOrderStatus.cancelled", db: "supplier_order.status" },
			{ code: "CarrierOrderStatus.cancelled", db: "carrier_order.status" },
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-orden-transporte-pendiente",
		kind: "status",
		section: "operation",
		label: carrierOrderStatusLabelMap.pending,
		definition:
			"La orden de transporte existe pero todavía no se pidió al transportista.",
		occurrences: [
			{ code: "CarrierOrderStatus.pending", db: "carrier_order.status" },
		],
		href: "/admin/carrier-orders",
	},
	{
		slug: "estado-orden-transporte-en-transito",
		kind: "status",
		section: "operation",
		label: carrierOrderStatusLabelMap.inTransit,
		definition:
			"El transportista está moviendo los envíos que la orden agrupa.",
		occurrences: [
			{ code: "CarrierOrderStatus.inTransit", db: "carrier_order.status" },
		],
		href: "/admin/carrier-orders",
	},

	// --- Estados: rollover ---------------------------------------------------
	{
		slug: "estado-rollover-abierto",
		kind: "status",
		section: "operation",
		label: rollOverStatusLabelMap.open,
		definition:
			"Cantidad esperando que alguien la resuelva: es la bandeja de trabajo de rollovers.",
		occurrences: [{ code: "RollOverStatus.open", db: "roll_over.status" }],
		href: "/admin/roll-overs",
	},
	{
		slug: "estado-rollover-reagrupado",
		kind: "status",
		section: "operation",
		label: rollOverStatusLabelMap.rebatched,
		definition: "La cantidad volvió a entrar en una operación posterior.",
		occurrences: [{ code: "RollOverStatus.rebatched", db: "roll_over.status" }],
		href: "/admin/roll-overs",
	},
	{
		slug: "estado-rollover-resuelto",
		kind: "status",
		section: "operation",
		label: rollOverStatusLabelMap.resolved,
		definition:
			"Se registró una decisión terminal auditada sobre la cantidad (reembolso, baja u otra).",
		occurrences: [{ code: "RollOverStatus.resolved", db: "roll_over.status" }],
		href: "/admin/roll-overs",
	},
	{
		slug: "estado-rollover-cancelado",
		kind: "status",
		section: "operation",
		label: rollOverStatusLabelMap.cancelled,
		definition:
			"El rollover quedó sin efecto porque se compensó la operación que lo creó.",
		occurrences: [{ code: "RollOverStatus.cancelled", db: "roll_over.status" }],
		href: "/admin/roll-overs",
	},
	{
		slug: "estado-rollover-antes-de-asignacion",
		kind: "status",
		section: "operation",
		label: rollOverStageLabelMap.preAllocation,
		definition:
			"La cantidad se cayó antes de llegar a una línea de proveedor, típicamente por no alcanzar el mínimo del lote.",
		occurrences: [
			{ code: "RollOverStage.preAllocation", db: "roll_over.stage" },
		],
		href: "/admin/roll-overs",
	},
	{
		slug: "estado-rollover-despues-de-asignacion",
		kind: "status",
		section: "operation",
		label: rollOverStageLabelMap.postAllocation,
		definition:
			"La cantidad ya estaba asignada a una línea de proveedor cuando se cayó: recorte del proveedor, paquete fallido o envío dado de baja.",
		occurrences: [
			{ code: "RollOverStage.postAllocation", db: "roll_over.stage" },
		],
		href: "/admin/roll-overs",
	},

	// --- Estados: paquete y línea de paquete ---------------------------------
	{
		slug: "estado-paquete-entrada",
		kind: "status",
		section: "operation",
		label: packageLegLabelMap.inbound,
		definition:
			"Tramo proveedor → destino, creado al registrar un despacho de proveedor.",
		occurrences: [{ code: "PackageLeg.inbound", db: "package.leg" }],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-salida",
		kind: "status",
		section: "operation",
		label: packageLegLabelMap.outbound,
		definition:
			"Tramo destino → usuario final, creado por fraccionamiento o promoviendo un paquete de entrada mono-cliente.",
		occurrences: [{ code: "PackageLeg.outbound", db: "package.leg" }],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-pendiente",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.pending,
		definition:
			"El registro existe pero el empaque no arrancó. Aplica al paquete, a su línea y al envío que todavía no se prepara.",
		occurrences: [
			{ code: "PackageStatus.pending", db: "package.status" },
			{ code: "PackageLotItemStatus.pending", db: "package_lot_item.status" },
			{ code: "ShipmentStatus.pending", db: "shipment.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-empacando",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.packing,
		definition:
			"Se está preparando y asignando contenido dentro del paquete o de su línea.",
		occurrences: [
			{ code: "PackageStatus.packing", db: "package.status" },
			{ code: "PackageLotItemStatus.packing", db: "package_lot_item.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-empacado",
		kind: "status",
		section: "operation",
		label: packageLotItemStatusLabelMap.packed,
		definition: "La línea quedó empacada dentro de su paquete.",
		occurrences: [
			{ code: "PackageLotItemStatus.packed", db: "package_lot_item.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-linea-enviada",
		kind: "status",
		section: "operation",
		label: packageLotItemStatusLabelMap.shipped,
		definition: "La línea salió con el paquete en un envío.",
		occurrences: [
			{ code: "PackageLotItemStatus.shipped", db: "package_lot_item.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-listo-para-envio",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.readyForShipment,
		definition: "El paquete está empacado y esperando que lo suban a un envío.",
		occurrences: [
			{ code: "PackageStatus.readyForShipment", db: "package.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-en-transito",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.inTransit,
		definition: "El paquete o su envío se están moviendo hacia su destino.",
		occurrences: [
			{ code: "PackageStatus.inTransit", db: "package.status" },
			{ code: "ShipmentStatus.inTransit", db: "shipment.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-recibido",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.received,
		definition:
			"El registro llegó a su destino y fue recibido: el paquete, su línea o el envío que lo transporta.",
		occurrences: [
			{ code: "PackageStatus.received", db: "package.status" },
			{ code: "PackageLotItemStatus.received", db: "package_lot_item.status" },
			{ code: "ShipmentStatus.received", db: "shipment.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-demorado",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.delayed,
		definition:
			"El paquete o el envío están demorados en tránsito o antes de despachar. Es un estado recuperable.",
		occurrences: [
			{ code: "PackageStatus.delayed", db: "package.status" },
			{ code: "ShipmentStatus.delayed", db: "shipment.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-fallido",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.failed,
		definition:
			"El paquete o el envío no llegaron a destino. Su seguimiento terminal es darlo de baja.",
		occurrences: [
			{ code: "PackageStatus.failed", db: "package.status" },
			{ code: "ShipmentStatus.failed", db: "shipment.status" },
		],
		href: "/admin/packages",
	},
	{
		slug: "estado-paquete-cancelado",
		kind: "status",
		section: "operation",
		label: packageStatusLabelMap.cancelled,
		definition:
			"El paquete, su línea o el envío se cancelaron antes de completarse.",
		occurrences: [
			{ code: "PackageStatus.cancelled", db: "package.status" },
			{ code: "PackageLotItemStatus.cancelled", db: "package_lot_item.status" },
			{ code: "ShipmentStatus.cancelled", db: "shipment.status" },
		],
		href: "/admin/packages",
	},

	// --- Estados: envío ------------------------------------------------------
	{
		slug: "estado-envio-transferencia-interna",
		kind: "status",
		section: "operation",
		label: shipmentTypeLabelMap.internalTransfer,
		definition:
			"El envío mueve paquetes entre ubicaciones internas, típicamente de proveedor a destino.",
		occurrences: [
			{ code: "ShipmentType.internalTransfer", db: "shipment.type" },
		],
		href: "/admin/shipments",
	},
	{
		slug: "estado-envio-entrega-a-usuario",
		kind: "status",
		section: "operation",
		label: shipmentTypeLabelMap.endUserDelivery,
		definition:
			"El envío va hacia el usuario final; es el único tipo donde el modo de entrega tiene sentido.",
		occurrences: [
			{ code: "ShipmentType.endUserDelivery", db: "shipment.type" },
		],
		href: "/admin/shipments",
	},
	{
		slug: "estado-envio-preparando",
		kind: "status",
		section: "operation",
		label: shipmentStatusLabelMap.preparing,
		definition: "El envío se está armando y documentando.",
		occurrences: [{ code: "ShipmentStatus.preparing", db: "shipment.status" }],
		href: "/admin/shipments",
	},
	{
		slug: "estado-envio-listo-para-despacho",
		kind: "status",
		section: "operation",
		label: shipmentStatusLabelMap.readyForDispatch,
		definition:
			"El envío está listo para salir con el transportista o el transporte interno asignado.",
		occurrences: [
			{ code: "ShipmentStatus.readyForDispatch", db: "shipment.status" },
		],
		href: "/admin/shipments",
	},
	{
		slug: "estado-entrega-a-domicilio",
		kind: "status",
		section: "operation",
		label: deliveryModeLabelMap.homeDelivery,
		definition:
			"El envío viaja a la dirección del cliente; su arribo confirma la entrega de todos los paquetes que lleva.",
		occurrences: [
			{ code: "DeliveryMode.homeDelivery", db: "shipment.deliveryMode" },
		],
		href: "/admin/shipments",
	},
	{
		slug: "estado-entrega-punto-de-retiro",
		kind: "status",
		section: "operation",
		label: deliveryModeLabelMap.pickupPoint,
		definition:
			"El envío viaja a un punto de retiro; cada cliente retira su paquete por separado, con su propia confirmación.",
		occurrences: [
			{ code: "DeliveryMode.pickupPoint", db: "shipment.deliveryMode" },
		],
		href: "/admin/shipments",
	},

	// --- Estados: fulfillment del ítem de carrito ----------------------------
	{
		slug: "estado-fulfillment-pendiente-de-agregacion",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.awaitingAggregation,
		definition:
			"La demanda está enviada pero todavía no entró en ninguna operación.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.awaitingAggregation",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-en-operacion",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.includedInOperation,
		definition: "La demanda fue tomada por una operación de agregación.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.includedInOperation",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-asignado-a-proveedor",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.allocatedToSupplierItem,
		definition:
			"La demanda quedó puenteada a un ítem de lote mediante una asignación de demanda.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.allocatedToSupplierItem",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-pedido-a-proveedor",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.requestedFromSupplier,
		definition:
			"El lote que contiene la demanda ya se pidió en una orden de proveedor.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.requestedFromSupplier",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-confirmado-por-proveedor",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.supplierConfirmed,
		definition: "El proveedor confirmó la línea que cubre esta demanda.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.supplierConfirmed",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-empaquetado",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.packaged,
		definition: "La cantidad quedó asignada dentro de un paquete.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.packaged",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-envio-interno",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.inInternalShipment,
		definition:
			"La cantidad viaja en una transferencia interna hacia el destino.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.inInternalShipment",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-en-deposito",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.atWarehouse,
		definition:
			"La cantidad llegó al destino interno y espera fraccionamiento o retiro.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.atWarehouse",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-envio-a-usuario",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.inEndUserShipment,
		definition: "La cantidad viaja en un envío hacia el usuario final.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.inEndUserShipment",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-entregado",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.delivered,
		definition: "Se registró la entrega física del paquete al cliente.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.delivered",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-parcialmente-rebalanceado",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.partiallyRolledOver,
		definition:
			"Parte de la cantidad se cayó a un rollover y el resto sigue su camino.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.partiallyRolledOver",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-rebalanceado",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.rolledOver,
		definition:
			"Toda la cantidad viva quedó en rollovers esperando resolución.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.rolledOver",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-cancelado",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.cancelled,
		definition:
			"La demanda ya no se va a cumplir: el ítem fue cancelado por el usuario o por un admin.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.cancelled",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-fulfillment-excepcion",
		kind: "status",
		section: "operation",
		label: fulfillmentStatusLabelMap.exception,
		definition:
			"El linaje de la demanda toca un paquete o envío demorado o fallido. Se limpia solo cuando los registros se recuperan o la cantidad se reencamina.",
		occurrences: [
			{
				code: "CartItemFulfillmentStatus.exception",
				db: "cart_item.fulfillmentStatus",
			},
		],
		href: "/admin/carts",
	},
];
