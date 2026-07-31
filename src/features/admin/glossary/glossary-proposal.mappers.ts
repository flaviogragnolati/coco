import {
	CircleDashedIcon,
	FileCheck2Icon,
	ThumbsUpIcon,
	XCircleIcon,
} from "lucide-react";

import type {
	GlossaryProposalField,
	GlossaryProposalStatus,
} from "~/shared/common/admin-crud/glossary-proposal.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

export const glossaryProposalStatusLabelMap: Record<
	GlossaryProposalStatus,
	string
> = {
	open: "Abierta",
	accepted: "Aceptada",
	applied: "Aplicada",
	rejected: "Rechazada",
};

// `accepted` is agreement, not completion — the code still says the old thing —
// so it takes the in-progress preset and only `applied` earns `success`.
export const glossaryProposalStatusConfig: Record<
	GlossaryProposalStatus,
	StatusConfig
> = {
	open: {
		...statusPresets.inert,
		icon: CircleDashedIcon,
		label: glossaryProposalStatusLabelMap.open,
	},
	accepted: {
		...statusPresets.inProgress,
		icon: ThumbsUpIcon,
		label: glossaryProposalStatusLabelMap.accepted,
	},
	applied: {
		...statusPresets.success,
		icon: FileCheck2Icon,
		label: glossaryProposalStatusLabelMap.applied,
	},
	rejected: {
		...statusPresets.failed,
		icon: XCircleIcon,
		label: glossaryProposalStatusLabelMap.rejected,
	},
};

export const glossaryProposalFieldLabelMap: Record<
	GlossaryProposalField,
	string
> = {
	label: "Nombre",
	definition: "Definición",
	identifier: "Identificador",
};

export const glossaryProposalFieldOptions = Object.entries(
	glossaryProposalFieldLabelMap,
).map(([value, label]) => ({ value: value as GlossaryProposalField, label }));

/** "Sin cerrar" is the default view: both states still need someone to act. */
export const glossaryProposalStatusFilterOptions = [
	{ value: "unresolved", label: "Sin cerrar" },
	...Object.entries(glossaryProposalStatusLabelMap).map(([value, label]) => ({
		value: value as GlossaryProposalStatus,
		label,
	})),
	{ value: "all", label: "Todas" },
] as const;

export const unresolvedGlossaryProposalStatuses: GlossaryProposalStatus[] = [
	"open",
	"accepted",
];
