import { paymentStatusLabelMap } from "~/shared/common/order-display";
import type { GlossaryEntry } from "../glossary.types";

export const paymentsGlossaryEntries: GlossaryEntry[] = [
	// --- Conceptos -----------------------------------------------------------
	{
		slug: "concepto-contracargo",
		kind: "concept",
		section: "payments",
		label: "Contracargo",
		term: "Chargeback",
		definition:
			"Un pago del cliente disputado o revertido externamente después de haberse completado. Se distingue del reembolso porque no es el camino ordinario de devolución de la plataforma.",
		aliases: ["Reembolso", "Fallo de pago"],
		href: "/admin/payments",
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-intento-de-pago",
		kind: "entity",
		section: "payments",
		label: "Intento de pago",
		term: "Payment attempt",
		definition:
			"Un intento de pago del cliente atado a una orden comercial. No es un lote de agregación para fulfillment: una orden puede acumular varios intentos.",
		aliases: ["Operación", "Operación de pago"],
		occurrences: [{ code: "UserTransaction", db: "user_transaction" }],
		href: "/admin/payments",
	},
	{
		slug: "entidad-medio-de-pago",
		kind: "entity",
		section: "payments",
		label: "Medio de pago",
		definition:
			"Un instrumento de pago guardado de un usuario, con su tipo, su etiqueta y la referencia externa que el proveedor le asignó.",
		occurrences: [{ code: "PaymentMethod", db: "payment_method" }],
		href: "/admin/payments",
	},
	{
		slug: "entidad-configuracion-de-proveedor-de-pago",
		kind: "entity",
		section: "payments",
		label: "Configuración de proveedor de pago",
		definition:
			"La habilitación y el modo (sandbox o producción) de un proveedor de pagos, más sus credenciales y ajustes.",
		occurrences: [
			{ code: "PaymentProviderConfig", db: "payment_provider_config" },
		],
		href: "/admin/payments",
	},
	{
		slug: "entidad-evento-de-proveedor-de-pago",
		kind: "entity",
		section: "payments",
		label: "Evento de proveedor de pago",
		definition:
			"Un webhook recibido del proveedor de pagos, con su payload crudo, la validez de su firma y el resultado de su procesamiento. Es el registro de auditoría de la conciliación.",
		occurrences: [
			{ code: "PaymentProviderEvent", db: "payment_provider_event" },
		],
		href: "/admin/payments",
	},
	{
		slug: "entidad-transaccion-de-proveedor",
		kind: "entity",
		section: "payments",
		label: "Transacción de proveedor",
		definition:
			"El pago que la plataforma le hace a un proveedor mayorista por una orden de proveedor.",
		occurrences: [{ code: "SupplierTransaction", db: "supplier_transaction" }],
		href: "/admin/supplier-orders",
	},

	// --- Estados: intento de pago --------------------------------------------
	{
		slug: "estado-pago-pendiente",
		kind: "status",
		section: "payments",
		label: paymentStatusLabelMap.pending,
		definition: "El intento de pago se creó pero todavía no se procesó.",
		occurrences: [
			{ code: "UserTransactionStatus.pending", db: "user_transaction.status" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-pago-en-proceso",
		kind: "status",
		section: "payments",
		label: paymentStatusLabelMap.inProcess,
		definition: "El proveedor todavía está procesando el intento de pago.",
		occurrences: [
			{
				code: "UserTransactionStatus.inProcess",
				db: "user_transaction.status",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-pago-aprobado",
		kind: "status",
		section: "payments",
		label: paymentStatusLabelMap.completed,
		definition:
			'El pago se capturó con éxito. El admin de carritos muestra este mismo valor como "Completa".',
		occurrences: [
			{
				code: "UserTransactionStatus.completed",
				db: "user_transaction.status",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-pago-rechazado",
		kind: "status",
		section: "payments",
		label: paymentStatusLabelMap.failed,
		definition:
			'El intento de pago falló. El admin de carritos muestra este mismo valor como "Fallida".',
		occurrences: [
			{ code: "UserTransactionStatus.failed", db: "user_transaction.status" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-pago-cancelado",
		kind: "status",
		section: "payments",
		label: paymentStatusLabelMap.cancelled,
		definition:
			"El intento de pago se abortó antes de capturarse, típicamente porque el usuario volvió a editar el carrito.",
		occurrences: [
			{
				code: "UserTransactionStatus.cancelled",
				db: "user_transaction.status",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-pago-reembolsado",
		kind: "status",
		section: "payments",
		label: paymentStatusLabelMap.refunded,
		definition: "El pago se devolvió después de una captura exitosa.",
		occurrences: [
			{ code: "UserTransactionStatus.refunded", db: "user_transaction.status" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-pago-contracargo",
		kind: "status",
		section: "payments",
		label: paymentStatusLabelMap.chargedBack,
		definition:
			"El pago completado fue disputado o revertido externamente; no es el camino ordinario de reembolso.",
		occurrences: [
			{
				code: "UserTransactionStatus.chargedBack",
				db: "user_transaction.status",
			},
		],
		href: "/admin/payments",
	},

	// --- Estados: proveedor de pago ------------------------------------------
	{
		slug: "estado-proveedor-sandbox",
		kind: "status",
		section: "payments",
		label: "Sandbox",
		definition:
			"El proveedor opera contra su entorno de pruebas: los pagos no mueven dinero real.",
		occurrences: [
			{
				code: "PaymentProviderMode.sandbox",
				db: "payment_provider_config.mode",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-proveedor-produccion",
		kind: "status",
		section: "payments",
		label: "Producción",
		definition: "El proveedor opera contra su entorno real.",
		occurrences: [
			{
				code: "PaymentProviderMode.production",
				db: "payment_provider_config.mode",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-evento-pago-recibido",
		kind: "status",
		section: "payments",
		label: "Recibido",
		definition:
			"El webhook llegó y quedó guardado, pero todavía no se procesó.",
		occurrences: [
			{
				code: "PaymentProviderEventStatus.received",
				db: "payment_provider_event.status",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-evento-pago-procesado",
		kind: "status",
		section: "payments",
		label: "Procesado",
		definition:
			"El webhook se aplicó sobre el intento de pago que le corresponde.",
		occurrences: [
			{
				code: "PaymentProviderEventStatus.processed",
				db: "payment_provider_event.status",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-evento-pago-fallido",
		kind: "status",
		section: "payments",
		label: "Fallido",
		definition:
			"El procesamiento del webhook falló; el error queda en `lastError` y se reintenta.",
		occurrences: [
			{
				code: "PaymentProviderEventStatus.failed",
				db: "payment_provider_event.status",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-evento-pago-ignorado",
		kind: "status",
		section: "payments",
		label: "Ignorado",
		definition:
			"El webhook es válido pero no aplica: duplicado, de otro recurso, o sin transacción asociada.",
		occurrences: [
			{
				code: "PaymentProviderEventStatus.ignored",
				db: "payment_provider_event.status",
			},
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-evento-pago-rechazado",
		kind: "status",
		section: "payments",
		label: "Rechazado",
		definition:
			"El webhook se descartó por firma inválida o payload inaceptable.",
		occurrences: [
			{
				code: "PaymentProviderEventStatus.rejected",
				db: "payment_provider_event.status",
			},
		],
		href: "/admin/payments",
	},

	// --- Estados: pago a proveedor -------------------------------------------
	{
		slug: "estado-pago-proveedor-pendiente",
		kind: "status",
		section: "payments",
		label: "Pendiente",
		definition:
			"El pago al proveedor está registrado pero todavía no se procesó.",
		occurrences: [
			{
				code: "SupplierTransactionStatus.pending",
				db: "supplier_transaction.status",
			},
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-pago-proveedor-completada",
		kind: "status",
		section: "payments",
		label: "Completada",
		definition: "El pago al proveedor se completó con éxito.",
		occurrences: [
			{
				code: "SupplierTransactionStatus.completed",
				db: "supplier_transaction.status",
			},
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-pago-proveedor-fallida",
		kind: "status",
		section: "payments",
		label: "Fallida",
		definition: "El pago al proveedor falló.",
		occurrences: [
			{
				code: "SupplierTransactionStatus.failed",
				db: "supplier_transaction.status",
			},
		],
		href: "/admin/supplier-orders",
	},
	{
		slug: "estado-pago-proveedor-reembolsada",
		kind: "status",
		section: "payments",
		label: "Reembolsada",
		definition:
			"El pago al proveedor se devolvió o revirtió después de completarse.",
		occurrences: [
			{
				code: "SupplierTransactionStatus.refunded",
				db: "supplier_transaction.status",
			},
		],
		href: "/admin/supplier-orders",
	},

	// --- Estados: moneda -----------------------------------------------------
	{
		slug: "estado-moneda-ars",
		kind: "status",
		section: "payments",
		label: "Peso argentino (ARS)",
		definition:
			"Moneda por defecto de los términos comerciales y de las transacciones.",
		occurrences: [{ code: "Currency.ARS", db: "user_transaction.currency" }],
		href: "/admin/payments",
	},
	{
		slug: "estado-moneda-usd",
		kind: "status",
		section: "payments",
		label: "Dólar estadounidense (USD)",
		occurrences: [{ code: "Currency.USD", db: "user_transaction.currency" }],
		href: "/admin/payments",
	},
	{
		slug: "estado-moneda-eur",
		kind: "status",
		section: "payments",
		label: "Euro (EUR)",
		occurrences: [{ code: "Currency.EUR", db: "user_transaction.currency" }],
		href: "/admin/payments",
	},
	{
		slug: "estado-moneda-brl",
		kind: "status",
		section: "payments",
		label: "Real brasileño (BRL)",
		occurrences: [{ code: "Currency.BRL", db: "user_transaction.currency" }],
		href: "/admin/payments",
	},

	// --- Estados: tipo de medio de pago --------------------------------------
	{
		slug: "estado-medio-pago-tarjeta",
		kind: "status",
		section: "payments",
		label: "Tarjeta de crédito",
		occurrences: [
			{ code: "PaymentMethodType.credit_card", db: "payment_method.type" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-medio-pago-mercadopago",
		kind: "status",
		section: "payments",
		label: "Mercado Pago",
		definition:
			"Checkout del proveedor Mercado Pago; el pago se completa fuera del sitio y vuelve por webhook.",
		occurrences: [
			{ code: "PaymentMethodType.mercadopago", db: "payment_method.type" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-medio-pago-transferencia",
		kind: "status",
		section: "payments",
		label: "Transferencia bancaria",
		occurrences: [
			{ code: "PaymentMethodType.bank_transfer", db: "payment_method.type" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-medio-pago-google-pay",
		kind: "status",
		section: "payments",
		label: "Google Pay",
		occurrences: [
			{ code: "PaymentMethodType.google_pay", db: "payment_method.type" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-medio-pago-efectivo",
		kind: "status",
		section: "payments",
		label: "Efectivo",
		occurrences: [
			{ code: "PaymentMethodType.cash", db: "payment_method.type" },
		],
		href: "/admin/payments",
	},
	{
		slug: "estado-medio-pago-otro",
		kind: "status",
		section: "payments",
		label: "Otro medio de pago",
		occurrences: [
			{ code: "PaymentMethodType.other", db: "payment_method.type" },
		],
		href: "/admin/payments",
	},
];
