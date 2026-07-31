import { qaTicketStatusLabelMap } from "~/features/admin/crud/qa-ticket/qa-ticket.mappers";
import type { GlossaryEntry } from "../glossary.types";

export const qaGlossaryEntries: GlossaryEntry[] = [
	// --- Conceptos -----------------------------------------------------------
	{
		slug: "concepto-pasada-de-qa",
		kind: "concept",
		section: "qa",
		label: "Pasada de QA",
		term: "QA pass",
		definition:
			"Un barrido de los tickets de QA por parte de un tester. Deliberadamente no es un registro: el ticket lleva un único estado vivo que la próxima pasada pisa, y el historial vive en el log de auditoría.",
		aliases: ["Corrida", "Ejecución", "Ciclo"],
		href: "/admin/qa-tickets",
	},
	{
		slug: "concepto-camino-de-regresion",
		kind: "concept",
		section: "qa",
		label: "Camino de regresión",
		term: "Regression path",
		definition:
			"El subconjunto de tickets de QA que forman el camino feliz end-to-end, marcado en el ticket para poder correr el barrido corto. Es una propiedad del ticket, no una suite aparte.",
		aliases: ["Smoke suite", "Suite de camino feliz"],
		href: "/admin/qa-tickets",
	},

	// --- Entidades -----------------------------------------------------------
	{
		slug: "entidad-ticket-de-qa",
		kind: "entity",
		section: "qa",
		label: "Ticket de QA",
		term: "QA ticket",
		definition:
			"El registro de un caso de prueba manual: sus pasos, su resultado esperado, el estado al que llegó, quién lo tomó y el hallazgo. Une la especificación y el ítem de trabajo en un solo registro.",
		aliases: ["Caso de prueba", "Test", "Bug", "Issue"],
		occurrences: [{ code: "QaTicket", db: "qa_ticket" }],
		href: "/admin/qa-tickets",
	},

	// --- Estados -------------------------------------------------------------
	{
		slug: "estado-qa-pendiente",
		kind: "status",
		section: "qa",
		label: qaTicketStatusLabelMap.pending,
		definition: "El ticket todavía no se corrió en esta pasada.",
		occurrences: [{ code: "QaTicketStatus.pending", db: "qa_ticket.status" }],
		href: "/admin/qa-tickets",
	},
	{
		slug: "estado-qa-en-curso",
		kind: "status",
		section: "qa",
		label: qaTicketStatusLabelMap.inProgress,
		definition: "Un tester lo tomó y lo está ejecutando.",
		occurrences: [
			{ code: "QaTicketStatus.inProgress", db: "qa_ticket.status" },
		],
		href: "/admin/qa-tickets",
	},
	{
		slug: "estado-qa-pasado",
		kind: "status",
		section: "qa",
		label: qaTicketStatusLabelMap.passed,
		definition:
			"El caso dio el resultado esperado. El slug conserva «pasado» porque en base el valor sigue siendo `QaTicketStatus.passed`: sólo cambió el nombre que se lee en pantalla.",
		occurrences: [{ code: "QaTicketStatus.passed", db: "qa_ticket.status" }],
		href: "/admin/qa-tickets",
	},
	{
		slug: "estado-qa-fallido",
		kind: "status",
		section: "qa",
		label: qaTicketStatusLabelMap.failed,
		definition:
			"El caso no dio el resultado esperado; el hallazgo queda en las notas del ticket.",
		occurrences: [{ code: "QaTicketStatus.failed", db: "qa_ticket.status" }],
		href: "/admin/qa-tickets",
	},
	{
		slug: "estado-qa-bloqueado",
		kind: "status",
		section: "qa",
		label: qaTicketStatusLabelMap.blocked,
		definition:
			"El caso no se pudo correr por una dependencia rota o datos faltantes.",
		occurrences: [{ code: "QaTicketStatus.blocked", db: "qa_ticket.status" }],
		href: "/admin/qa-tickets",
	},
	{
		slug: "estado-qa-omitido",
		kind: "status",
		section: "qa",
		label: qaTicketStatusLabelMap.skipped,
		definition:
			'El caso queda deliberadamente fuera de esta pasada. Distinto de pendiente, que es "todavía no se corrió".',
		occurrences: [{ code: "QaTicketStatus.skipped", db: "qa_ticket.status" }],
		href: "/admin/qa-tickets",
	},
];
