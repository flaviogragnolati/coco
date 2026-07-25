import type { ElementType, ReactNode } from "react";

export type CrudEntityId = number | string;

export type CrudModalMode = "create" | "edit";

export type CrudStatusFilter = "all" | "active" | "inactive";

/** Date sort applied to an admin list: newest first (`desc`) or oldest first. */
export type CrudSortDirection = "desc" | "asc";

export type CrudModalState<TId extends CrudEntityId = CrudEntityId> =
	| { open: false; mode: null; entityId: null }
	| { open: true; mode: CrudModalMode; entityId: TId | null };

export type CrudMutationResult<TId extends CrudEntityId = CrudEntityId> = {
	id: TId;
};

export type CrudColumn<TItem> = {
	key: string;
	header: ReactNode;
	cell: (item: TItem) => ReactNode;
	className?: string;
};

export type CrudRowAction<TItem> = {
	label: string;
	icon?: ElementType;
	onSelect: (item: TItem) => void;
	disabled?: (item: TItem) => boolean;
	destructive?: boolean;
	/**
	 * Why the action is unavailable. Rendered inline rather than as a tooltip:
	 * a disabled menu item takes no pointer events and no keyboard focus, so a
	 * tooltip would never reach either kind of user.
	 */
	hint?: string;
};
