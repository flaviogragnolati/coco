import {
	cartItemStatusLabelMap,
	cartStatusLabelMap,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import { orderStatusLabelMap } from "~/shared/common/order-display";
import type { GlossaryEntry } from "../glossary.types";

export const cartGlossaryEntries: GlossaryEntry[] = [
	// --- Conceptos -----------------------------------------------------------
	{
		slug: "concepto-solicitud-del-cliente",
		kind: "concept",
		section: "cart",
		label: "Solicitud del cliente",
		term: "Customer request",
		definition:
			"La demanda de cara al cliente capturada antes y durante el envío de la orden. Es la unidad que después se agrega, se abastece y se traza.",
		aliases: ["Línea de orden", "Línea de compra"],
		href: "/admin/carts",
	},
	{
		slug: "concepto-mini-carrito",
		kind: "concept",
		section: "cart",
		label: "Mini-carrito",
		term: "Mini-cart",
		definition:
			"La vista lateral del carrito que se abre desde la barra de navegación y al agregar un producto. Complementa a la página del carrito, nunca la reemplaza.",
		aliases: ["Cart drawer", "Popover del carrito"],
	},
	{
		slug: "concepto-checkout",
		kind: "concept",
		section: "cart",
		label: "Checkout",
		definition:
			"El flujo que convierte un carrito en checkout en una orden enviada más un intento de pago: revisar, elegir dirección y medio de pago, aceptar términos y pagar. Precios y cantidades se congelan al confirmar.",
		aliases: ["Colocación de orden", "Flujo de compra"],
		href: "/admin/carts",
	},
	{
		slug: "concepto-volver-a-editar-el-carrito",
		kind: "concept",
		section: "cart",
		label: "Volver a editar el carrito",
		term: "Leave checkout",
		definition:
			"La salida explícita de un carrito congelado en checkout: cancela la orden viva y su intento de pago pendiente, y devuelve el carrito a pendiente. Está bloqueada mientras un pago está en proceso.",
		aliases: ["Cancelar checkout", "Abortar checkout"],
		href: "/admin/carts",
	},
	{
		slug: "concepto-cierre-de-orden",
		kind: "concept",
		section: "cart",
		label: "Cierre de orden",
		term: "Order closure",
		definition:
			"El cierre comercial derivado de una orden: completada cuando todos sus ítems llegaron a un estado terminal y al menos uno fue entregado, cancelada cuando todos terminaron cancelados. Nunca se fija a mano.",
		aliases: ["Completar orden", "Cierre manual"],
		href: "/admin/carts",
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-carrito",
		kind: "entity",
		section: "cart",
		label: "Carrito",
		definition:
			"El contenedor de la demanda de un usuario mientras todavía es editable, y la fuente de verdad hasta que arranca el checkout.",
		occurrences: [{ code: "Cart", db: "cart" }],
		href: "/admin/carts",
	},
	{
		slug: "entidad-item-de-carrito",
		kind: "entity",
		section: "cart",
		label: "Ítem de carrito",
		definition:
			"Una solicitud del cliente materializada: producto, términos de cliente y cantidad. Lleva dos estados en paralelo, el de la solicitud y el de su fulfillment.",
		occurrences: [{ code: "CartItem", db: "cart_item" }],
		href: "/admin/carts",
	},
	{
		slug: "entidad-orden-del-usuario",
		kind: "entity",
		section: "cart",
		label: "Orden del usuario",
		definition:
			"La orden comercial que resulta de confirmar un checkout, con sus snapshots de direcciones y términos aceptados.",
		occurrences: [{ code: "UserOrder", db: "user_order" }],
		href: "/admin/carts",
	},
	{
		slug: "entidad-item-de-orden",
		kind: "entity",
		section: "cart",
		label: "Ítem de orden",
		definition:
			"La foto de un ítem de carrito al momento de confirmar: cantidad, producto y precio congelados para la orden.",
		occurrences: [{ code: "UserOrderItem", db: "user_order_item" }],
		href: "/admin/carts",
	},

	// --- Estados: carrito ----------------------------------------------------
	{
		slug: "estado-carrito-borrador",
		kind: "status",
		section: "cart",
		label: cartStatusLabelMap.draft,
		definition:
			"El carrito se está creando y todavía no está atado a una sesión durable del usuario.",
		occurrences: [{ code: "CartStatus.draft", db: "cart.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-carrito-pendiente",
		kind: "status",
		section: "cart",
		label: cartStatusLabelMap.pending,
		definition:
			"El carrito está asociado a un usuario y sigue editable; el checkout no arrancó.",
		occurrences: [{ code: "CartStatus.pending", db: "cart.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-carrito-en-checkout",
		kind: "status",
		section: "cart",
		label: cartStatusLabelMap.atCheckout,
		definition:
			"El usuario arrancó el checkout: el carrito quedó congelado contra ediciones mientras se valida y confirma.",
		occurrences: [{ code: "CartStatus.atCheckout", db: "cart.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-carrito-enviado",
		kind: "status",
		section: "cart",
		label: cartStatusLabelMap.submitted,
		definition:
			"El checkout se confirmó: el carrito se convirtió en orden y sus ítems quedaron trazables operativamente.",
		occurrences: [
			{ code: "CartStatus.submitted", db: "cart.status" },
			{ code: "CartItemStatus.submitted", db: "cart_item.status" },
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-carrito-abandonado",
		kind: "status",
		section: "cart",
		label: cartStatusLabelMap.abandoned,
		definition:
			"El carrito quedó inactivo y ya no se espera que siga por el checkout.",
		occurrences: [{ code: "CartStatus.abandoned", db: "cart.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-carrito-cancelado",
		kind: "status",
		section: "cart",
		label: cartStatusLabelMap.cancelled,
		definition:
			"El carrito se canceló antes de convertirse en orden, o la solicitud ya enviada la canceló el usuario o un admin.",
		occurrences: [
			{ code: "CartStatus.cancelled", db: "cart.status" },
			{ code: "CartItemStatus.cancelled", db: "cart_item.status" },
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-carrito-abortado",
		kind: "status",
		section: "cart",
		label: cartStatusLabelMap.aborted,
		definition:
			"El checkout se detuvo por la fuerza, por un admin o por el sistema.",
		occurrences: [{ code: "CartStatus.aborted", db: "cart.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-item-carrito-en-carrito",
		kind: "status",
		section: "cart",
		label: cartItemStatusLabelMap.inCart,
		definition:
			"El ítem sigue mutable en el carrito y todavía no se envió como solicitud.",
		occurrences: [{ code: "CartItemStatus.inCart", db: "cart_item.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-item-carrito-removido",
		kind: "status",
		section: "cart",
		label: cartItemStatusLabelMap.dropped,
		definition:
			"El ítem se sacó del carrito antes de convertirse en una solicitud enviada, así que no tiene linaje de fulfillment.",
		occurrences: [{ code: "CartItemStatus.dropped", db: "cart_item.status" }],
		href: "/admin/carts",
	},

	// --- Estados: orden del usuario ------------------------------------------
	{
		slug: "estado-orden-pendiente",
		kind: "status",
		section: "cart",
		label: orderStatusLabelMap.pending,
		definition:
			"La orden existe pero todavía no entró en manejo operativo activo.",
		occurrences: [{ code: "UserOrderStatus.pending", db: "user_order.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-orden-en-procesamiento",
		kind: "status",
		section: "cart",
		label: orderStatusLabelMap.processing,
		definition: "La orden tiene trabajo de pago o de fulfillment en curso.",
		occurrences: [
			{ code: "UserOrderStatus.processing", db: "user_order.status" },
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-orden-completado",
		kind: "status",
		section: "cart",
		label: orderStatusLabelMap.completed,
		definition:
			"La orden quedó cerrada comercialmente: todos sus ítems llegaron a un estado terminal exitoso.",
		occurrences: [
			{ code: "UserOrderStatus.completed", db: "user_order.status" },
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-orden-cancelado",
		kind: "status",
		section: "cart",
		label: orderStatusLabelMap.cancelled,
		definition: "La orden se canceló antes de completarse con éxito.",
		occurrences: [
			{ code: "UserOrderStatus.cancelled", db: "user_order.status" },
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-orden-fallido",
		kind: "status",
		section: "cart",
		label: orderStatusLabelMap.failed,
		definition:
			"La orden falló por problemas de pago o de orquestación del fulfillment.",
		occurrences: [{ code: "UserOrderStatus.failed", db: "user_order.status" }],
		href: "/admin/carts",
	},
	{
		slug: "estado-orden-reembolsado",
		kind: "status",
		section: "cart",
		label: orderStatusLabelMap.refunded,
		definition:
			"La orden se reembolsó, después de una cancelación o de un problema posterior a la entrega.",
		occurrences: [
			{ code: "UserOrderStatus.refunded", db: "user_order.status" },
		],
		href: "/admin/carts",
	},
	{
		slug: "estado-orden-contracargo",
		kind: "status",
		section: "cart",
		label: orderStatusLabelMap.chargedBack,
		definition:
			"El pago completado de la orden fue disputado o revertido externamente después del procesamiento comercial.",
		occurrences: [
			{ code: "UserOrderStatus.chargedBack", db: "user_order.status" },
		],
		href: "/admin/carts",
	},
];
