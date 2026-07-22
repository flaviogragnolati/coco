import type { CrudStatItem } from "~/features/admin/crud/_components/crud-stats-cards";
import { crudStatusStatAccents } from "~/features/admin/crud/_lib/crud-status-stats";

export type CrudEntityStats = {
	total: number;
	active: number;
	inactive: number;
	deleted: number;
};

type CrudStatCopy = { label: string; description: string };

/**
 * Every string and gendered form that varies between crud-home entities. The
 * page shell renders one template driven by this object, so anything not
 * expressible here is genuine per-entity behavior and belongs in the client
 * (extra queries, extra dialogs) rather than in this type.
 *
 * Delete-dialog prose is a function of the target because entities identify
 * their records differently: most interpolate `name`, `address` uses `#id`.
 */
export type CrudEntityCopy<TListItem> = {
	idPrefix: string;
	/**
	 * Overrides the generated `${idPrefix}-include-deleted` DOM id, which the
	 * product-terms panels need because theirs are suffixed onto the search id
	 * rather than the prefix.
	 */
	includeDeletedId?: string;
	/**
	 * Present for a standalone page, absent for a panel embedded in a shared
	 * shell (the product-terms tabs), which also moves the create button from
	 * the page header into the panel body.
	 */
	pageShell?: { title: string; description: string };
	createButtonLabel: string;
	searchPlaceholder: string;
	statusLabels: { active: string; inactive: string };
	stats: {
		total: CrudStatCopy;
		active: CrudStatCopy;
		inactive: CrudStatCopy;
		deleted: CrudStatCopy;
	};
	includeDeletedLabel: string;
	includeDeletedHint: string;
	listErrorMessage: string;
	statsErrorMessage: string;
	detailErrorMessage: string;
	empty: { title: string; description: string };
	softDelete: {
		title: string;
		confirmLabel: string;
		describe: (target: TListItem) => string;
	};
	hardDelete: {
		title: string;
		confirmLabel: string;
		describe: (target: TListItem) => string;
		confirmationValue?: (target: TListItem) => string;
		confirmationLabel?: (target: TListItem) => string;
	};
};

export function crudElementIds(copy: {
	idPrefix: string;
	includeDeletedId?: string;
}) {
	return {
		searchId: `${copy.idPrefix}-search`,
		includeDeletedId:
			copy.includeDeletedId ?? `${copy.idPrefix}-include-deleted`,
	};
}

export function buildCrudStatItems<TListItem>(
	copy: CrudEntityCopy<TListItem>,
	stats: CrudEntityStats,
): CrudStatItem[] {
	return [
		{
			label: copy.stats.total.label,
			value: stats.total,
			...crudStatusStatAccents.total,
			description: copy.stats.total.description,
		},
		{
			label: copy.stats.active.label,
			value: stats.active,
			...crudStatusStatAccents.active,
			description: copy.stats.active.description,
		},
		{
			label: copy.stats.inactive.label,
			value: stats.inactive,
			...crudStatusStatAccents.inactive,
			description: copy.stats.inactive.description,
		},
		{
			label: copy.stats.deleted.label,
			value: stats.deleted,
			...crudStatusStatAccents.deleted,
			description: copy.stats.deleted.description,
		},
	];
}
