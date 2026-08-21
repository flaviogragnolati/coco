import {
	CircleHelpIcon,
	ClipboardListIcon,
	PercentIcon,
	PlayIcon,
} from "lucide-react";

import type { CrudStatItem } from "~/features/admin/crud/_components/crud-stats-cards";
import type { QaTicketStats } from "~/shared/common/admin-crud/qa-ticket.types";

/** Shown as the OK rate whenever nothing has been executed yet. */
export const QA_TICKET_RATE_PLACEHOLDER = "—";

/**
 * The four headline numbers of a QA pass, derived from the global `getStats`
 * response so they describe the whole board rather than whatever the local
 * filters (`includeDeleted` included) happen to leave on screen.
 *
 * Only `passed` and `failed` count as executed: blocked, skipped and
 * `needsClarification` are interruptions, and letting them into the denominator
 * would make the OK rate drop for reasons that say nothing about the product.
 */
export function buildQaTicketKpis(stats: QaTicketStats): CrudStatItem[] {
	const active = stats.total - stats.deleted;
	const executed = stats.passed + stats.failed;
	const okRate =
		executed === 0
			? QA_TICKET_RATE_PLACEHOLDER
			: `${Math.round((stats.passed / executed) * 100)}%`;

	return [
		{
			label: "Activos",
			value: active,
			description: "Tickets vivos de la pasada",
			icon: ClipboardListIcon,
			accent: "default",
			hint: "Todos los tickets menos los enviados a papelera.",
		},
		{
			label: "Ejecutados",
			value: `${executed} / ${active}`,
			description: "Con resultado verificable",
			icon: PlayIcon,
			accent: "info",
			hint: "Completo OK más Fallido. Bloqueado, omitido y por aclarar quedan afuera porque no verificaron nada.",
		},
		{
			label: "Tasa OK",
			value: okRate,
			description:
				executed === 0
					? "Todavía no se ejecutó ningún caso"
					: `${stats.passed} de ${executed} ejecutados dieron OK`,
			icon: PercentIcon,
			accent: "success",
			hint: "Completo OK sobre ejecutados; el denominador es Completo OK más Fallido.",
		},
		{
			label: "Por aclarar",
			value: stats.needsClarification,
			description: "Definición insuficiente",
			icon: CircleHelpIcon,
			accent: "warning",
			hint: "La definición no alcanza para ejecutar o decidir el caso; el filtro de estado los aísla.",
		},
	];
}
