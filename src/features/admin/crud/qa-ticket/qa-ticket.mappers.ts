import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	CircleDashedIcon,
	ClockIcon,
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
};

// `pending` and `skipped` share the inert preset — neither is a result — so the
// icon is what tells "todavía no se corrió" apart from "queda fuera de la pasada".
export const qaTicketStatusConfig: Record<QaTicketStatus, StatusConfig> = {
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
};

export const qaTicketStatusOptions = Object.entries(qaTicketStatusLabelMap).map(
	([value, label]) => ({ value: value as QaTicketStatus, label }),
);

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
