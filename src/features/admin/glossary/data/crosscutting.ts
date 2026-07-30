import type { GlossaryEntry } from "../glossary.types";

export const crosscuttingGlossaryEntries: GlossaryEntry[] = [
	// --- Conceptos -----------------------------------------------------------
	{
		slug: "concepto-conservacion-de-demanda",
		kind: "concept",
		section: "crosscutting",
		label: "Conservación de demanda",
		term: "Demand conservation",
		definition:
			"La invariante de que cada unidad de demanda pagada está siempre en exactamente un lugar activo — demanda original sin asignar, un rollover abierto o una asignación viva — o en una resolución terminal auditada.",
		aliases: ["Balance de cantidad"],
	},
	{
		slug: "concepto-linaje-de-fulfillment",
		kind: "concept",
		section: "crosscutting",
		label: "Linaje de fulfillment",
		term: "Fulfillment lineage",
		definition:
			"El camino trazable de una solicitud del cliente por agregación, abastecimiento, empaque, envío y entrega: rollovers, asignaciones a líneas de lote e ítems de orden. Los eventos de seguimiento son historia, no linaje.",
		aliases: [
			"Estado de la orden",
			"Estado del envío",
			"Eventos de seguimiento",
		],
		href: "/admin/carts",
	},
	{
		slug: "concepto-estado-operativo",
		kind: "concept",
		section: "crosscutting",
		label: "Estado operativo",
		term: "Operational state",
		definition:
			"El estado que responde dónde está la demanda dentro del abastecimiento, el empaque, el envío y la entrega.",
		aliases: ["Estado comercial", "Estado de la solicitud"],
	},
	{
		slug: "concepto-diagnostico-operativo",
		kind: "concept",
		section: "crosscutting",
		label: "Diagnóstico operativo",
		term: "Operational diagnostic",
		definition:
			"Una señal de solo lectura, con código estable y severidad, que compara registros, cantidades y estados para revelar evidencia faltante o linaje inconsistente. Nunca corrige nada.",
		aliases: ["Corrección", "Mutación", "Acción"],
		href: "/admin/lots",
	},
	{
		slug: "concepto-incidencia-de-fulfillment",
		kind: "concept",
		section: "crosscutting",
		label: "Incidencia de fulfillment",
		term: "Fulfillment exception",
		definition:
			"Una condición derivada: demanda cuyo linaje tiene un paquete o envío demorado o fallido tocando cantidad viva. Se limpia sola cuando los registros se recuperan o la cantidad se reencamina.",
		aliases: ["Incidente", "Estado de error"],
		href: "/admin/carts",
	},
	{
		slug: "concepto-estado-agregado",
		kind: "concept",
		section: "crosscutting",
		label: "Estado agregado",
		term: "Aggregate status",
		definition:
			"Un estado resumen pensado para mostrarse, recalculado desde los registros operativos vivos que lo respaldan en vez de arrastrarse en los eventos que lo movieron.",
		aliases: ["Fuente de verdad", "Prueba", "Estado transportado por eventos"],
	},
	{
		slug: "concepto-glosario",
		kind: "concept",
		section: "crosscutting",
		label: "Glosario",
		term: "Glossary",
		definition:
			"Esta referencia dentro de la app: para una palabra del dominio, cómo la llama la UI, cómo la llama el código y cómo la llama la base. Es una vista sobre datos curados a mano; la fuente canónica del lenguaje es CONTEXT.md.",
		aliases: ["Diccionario", "Ayuda", "Documentación"],
	},
	{
		slug: "concepto-entrada-de-glosario",
		kind: "concept",
		section: "crosscutting",
		label: "Entrada de glosario",
		term: "Glossary entry",
		definition:
			"Una unidad consultable del glosario: un concepto, una entidad o un estado, con su label en español, su definición, sus apariciones y los sinónimos que este proyecto evita. Una entrada puede cubrir varias apariciones.",
		aliases: ["Término", "Definición", "Fila"],
	},
	{
		slug: "concepto-aparicion",
		kind: "concept",
		section: "crosscutting",
		label: "Aparición",
		term: "Occurrence",
		definition:
			"Un lugar concreto donde una entrada se materializa: un modelo de Prisma y su tabla, o un valor de enum y la columna que lo guarda. Es lo que hace la entrada accionable en una consola SQL.",
		aliases: ["Referencia", "Ubicación", "Mapeo"],
	},
	{
		slug: "concepto-accion-rapida",
		kind: "concept",
		section: "crosscutting",
		label: "Acción rápida",
		term: "Quick action",
		definition:
			"Un atajo del admin alcanzable desde el botón flotante en cualquier pantalla. Hoy la única abre el glosario.",
		aliases: ["Atajo", "Herramienta", "Shortcut"],
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-log-de-auditoria",
		kind: "entity",
		section: "crosscutting",
		label: "Log de auditoría",
		definition:
			"El registro de quién hizo qué sobre qué entidad, con el antes y el después. Es donde vive el historial que los estados vivos pisan.",
		occurrences: [{ code: "AuditLog", db: "audit_log" }],
	},
	{
		slug: "entidad-outbox-de-eventos",
		kind: "entity",
		section: "crosscutting",
		label: "Outbox de eventos de dominio",
		definition:
			"La cola transaccional de eventos de dominio: se escriben junto al cambio que los produjo y se despachan después, con reintentos y bloqueo.",
		occurrences: [{ code: "DomainEventOutbox", db: "domain_event_outbox" }],
	},
	{
		slug: "entidad-canal",
		kind: "entity",
		section: "crosscutting",
		label: "Canal",
		definition:
			"Un canal de notificación declarado con su tipo y su credencial. Está modelado pero todavía sin uso en la aplicación.",
		occurrences: [{ code: "Channel", db: "channel" }],
	},

	// --- Estados: outbox -----------------------------------------------------
	{
		slug: "estado-outbox-pendiente",
		kind: "status",
		section: "crosscutting",
		label: "Pendiente de despacho",
		definition: "El evento está encolado y todavía no lo tomó ningún worker.",
		occurrences: [
			{
				code: "DomainEventOutboxStatus.pending",
				db: "domain_event_outbox.status",
			},
		],
	},
	{
		slug: "estado-outbox-procesando",
		kind: "status",
		section: "crosscutting",
		label: "Procesando",
		definition:
			"Un worker tomó el evento y lo tiene bloqueado mientras lo despacha.",
		occurrences: [
			{
				code: "DomainEventOutboxStatus.processing",
				db: "domain_event_outbox.status",
			},
		],
	},
	{
		slug: "estado-outbox-procesado",
		kind: "status",
		section: "crosscutting",
		label: "Procesado",
		definition: "El evento se despachó con éxito.",
		occurrences: [
			{
				code: "DomainEventOutboxStatus.processed",
				db: "domain_event_outbox.status",
			},
		],
	},
	{
		slug: "estado-outbox-fallido",
		kind: "status",
		section: "crosscutting",
		label: "Fallido en el despacho",
		definition:
			"El despacho falló; el error queda en `lastError` y el contador de intentos sube.",
		occurrences: [
			{
				code: "DomainEventOutboxStatus.failed",
				db: "domain_event_outbox.status",
			},
		],
	},

	// --- Estados: canal ------------------------------------------------------
	{
		slug: "estado-canal-email",
		kind: "status",
		section: "crosscutting",
		label: "Email",
		occurrences: [{ code: "ChannelType.email", db: "channel.type" }],
	},
	{
		slug: "estado-canal-sms",
		kind: "status",
		section: "crosscutting",
		label: "SMS",
		occurrences: [{ code: "ChannelType.sms", db: "channel.type" }],
	},
	{
		slug: "estado-canal-whatsapp",
		kind: "status",
		section: "crosscutting",
		label: "WhatsApp",
		occurrences: [{ code: "ChannelType.whatsapp", db: "channel.type" }],
	},
	{
		slug: "estado-canal-push",
		kind: "status",
		section: "crosscutting",
		label: "Notificación push",
		occurrences: [
			{ code: "ChannelType.push_notification", db: "channel.type" },
		],
	},
	{
		slug: "estado-canal-otro",
		kind: "status",
		section: "crosscutting",
		label: "Otro canal",
		occurrences: [{ code: "ChannelType.other", db: "channel.type" }],
	},
];
