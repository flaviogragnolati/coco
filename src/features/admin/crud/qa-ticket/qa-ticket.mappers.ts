import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	CircleDashedIcon,
	CircleHelpIcon,
	ClockIcon,
	type LucideIcon,
	RotateCcwIcon,
	SkipForwardIcon,
	XCircleIcon,
} from "lucide-react";

import type {
	QaTicketDetail,
	QaTicketFormInput,
	QaTicketStatus,
} from "~/shared/common/admin-crud/qa-ticket.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

export const qaTicketStatusLabelMap: Record<QaTicketStatus, string> = {
	pending: "Pendiente",
	inProgress: "En curso",
	passed: "Completo OK",
	failed: "Fallido",
	blocked: "Bloqueado",
	skipped: "Omitido",
	needsClarification: "Requiere aclaración",
	retest: "Re-test",
};

/** Every QA status carries an icon, which is what lets the result selector reuse it. */
type QaTicketStatusConfig = StatusConfig & { icon: LucideIcon };

// `pending` and `skipped` share the inert preset — neither is a result — so the
// icon is what tells "todavía no se corrió" apart from "queda fuera de la pasada".
// `blocked` and `needsClarification` share the amber preset because both stop the
// pass; there the label, the icon and the hint carry the distinction between a
// missing environment and a missing definition, since the colour cannot.
// `retest` takes the info preset rather than the inert one: unlike `pending`, a
// fix landed and the case is waiting on a tester. It shares that colour with
// `inProgress`, so its icon tells "hay que volver a correrlo" from "lo están corriendo".
export const qaTicketStatusConfig: Record<
	QaTicketStatus,
	QaTicketStatusConfig
> = {
	pending: {
		...statusPresets.inert,
		icon: CircleDashedIcon,
		label: qaTicketStatusLabelMap.pending,
	},
	inProgress: {
		...statusPresets.inProgress,
		icon: ClockIcon,
		label: qaTicketStatusLabelMap.inProgress,
	},
	passed: {
		...statusPresets.success,
		icon: CheckCircle2Icon,
		label: qaTicketStatusLabelMap.passed,
	},
	failed: {
		...statusPresets.failed,
		icon: XCircleIcon,
		label: qaTicketStatusLabelMap.failed,
	},
	blocked: {
		...statusPresets.attention,
		icon: AlertTriangleIcon,
		label: qaTicketStatusLabelMap.blocked,
	},
	skipped: {
		...statusPresets.inert,
		icon: SkipForwardIcon,
		label: qaTicketStatusLabelMap.skipped,
	},
	needsClarification: {
		...statusPresets.attention,
		icon: CircleHelpIcon,
		label: qaTicketStatusLabelMap.needsClarification,
		hint: "La definición no alcanza para ejecutar o decidir el resultado.",
	},
	retest: {
		...statusPresets.inProgress,
		icon: RotateCcwIcon,
		label: qaTicketStatusLabelMap.retest,
		hint: "Se corrigió o implementó después de la última corrida: hay que volver a correrlo.",
	},
};

export const qaTicketStatusOptions = Object.entries(qaTicketStatusLabelMap).map(
	([value, label]) => ({ value: value as QaTicketStatus, label }),
);

/**
 * What a tester can record after running the case. `pending`, `inProgress` and
 * `retest` describe where the ticket sits in the queue, not how it went, so they
 * stay out of the operational selector and remain reachable only from the admin
 * form.
 */
const qaTicketResultStatuses = [
	"passed",
	"failed",
	"blocked",
	"skipped",
	"needsClarification",
] as const satisfies readonly QaTicketStatus[];

export const qaTicketResultOptions = qaTicketResultStatuses.map((status) => ({
	value: status,
	label: qaTicketStatusLabelMap[status],
	icon: qaTicketStatusConfig[status].icon,
}));

export type QaTicketWorkAction = "claim" | "continue" | "assigned" | "none";

export function getQaTicketWorkAction(
	ticket: Pick<QaTicketDetail, "assignee" | "deleted">,
	currentUserId: string,
): QaTicketWorkAction {
	if (ticket.deleted) return "none";
	if (!ticket.assignee) return "claim";
	return ticket.assignee.id === currentUserId ? "continue" : "assigned";
}

export const defaultQaTicketFormValues: QaTicketFormInput = {
	section: "",
	title: "",
	actor: "",
	feature: "",
	steps: "",
	expectedResult: "",
	status: "pending",
	isRegressionPath: false,
	notes: "",
	assigneeId: undefined,
};

export function qaTicketDetailToFormValues(
	ticket: QaTicketDetail,
): QaTicketFormInput {
	return {
		section: ticket.section,
		title: ticket.title,
		actor: ticket.actor,
		feature: ticket.feature,
		steps: ticket.steps,
		expectedResult: ticket.expectedResult,
		status: ticket.status,
		isRegressionPath: ticket.isRegressionPath,
		notes: ticket.notes ?? "",
		assigneeId: ticket.assignee?.id ?? undefined,
	};
}
