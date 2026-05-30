import type { ElementType, ReactNode } from "react";

export type CrudEntityId = number | string;

export type CrudModalMode = "create" | "edit";

export type CrudStatusFilter = "all" | "active" | "inactive";

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
};
