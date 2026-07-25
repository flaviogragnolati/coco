"use client";

import { useCallback, useMemo, useState } from "react";

import type { CrudListSort } from "~/features/admin/crud/_lib/crud-list-sort";
import type {
	CrudEntityId,
	CrudModalMode,
	CrudModalState,
	CrudStatusFilter,
} from "~/shared/common/admin-crud/crud.types";

const closedFormState = {
	open: false,
	mode: null,
	entityId: null,
} as const;

export type CrudPageState<TId extends CrudEntityId, TListItem> = {
	includeDeleted: boolean;
	setIncludeDeleted: (value: boolean) => void;
	statusFilter: CrudStatusFilter;
	setStatusFilter: (value: CrudStatusFilter) => void;
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	listSort: CrudListSort;
	setListSort: (value: CrudListSort) => void;
	formState: CrudModalState<TId>;
	softDeleteTarget: TListItem | null;
	setSoftDeleteTarget: (target: TListItem | null) => void;
	hardDeleteTarget: TListItem | null;
	setHardDeleteTarget: (target: TListItem | null) => void;
	selectedId: TId | null;
	formMode: CrudModalMode;
	openCreate: () => void;
	openEdit: (id: TId) => void;
	closeForm: () => void;
};

/**
 * Owns the state slots every crud-home page declares: the two filter controls,
 * the search box, the list ordering, the create/edit modal state, and the two
 * delete targets. `TId` stays generic because `user` is keyed by string while
 * every other entity is keyed by number.
 */
export function useCrudPageState<
	TId extends CrudEntityId,
	TListItem,
>(): CrudPageState<TId, TListItem> {
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [listSort, setListSort] = useState<CrudListSort>("default");
	const [formState, setFormState] =
		useState<CrudModalState<TId>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] = useState<TListItem | null>(
		null,
	);
	const [hardDeleteTarget, setHardDeleteTarget] = useState<TListItem | null>(
		null,
	);

	const openCreate = useCallback(() => {
		setFormState({ open: true, mode: "create", entityId: null });
	}, []);

	const openEdit = useCallback((id: TId) => {
		setFormState({ open: true, mode: "edit", entityId: id });
	}, []);

	const closeForm = useCallback(() => {
		setFormState(closedFormState);
	}, []);

	const selectedId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	return useMemo(
		() => ({
			closeForm,
			formMode,
			formState,
			hardDeleteTarget,
			includeDeleted,
			listSort,
			openCreate,
			openEdit,
			searchTerm,
			selectedId,
			setHardDeleteTarget,
			setIncludeDeleted,
			setListSort,
			setSearchTerm,
			setSoftDeleteTarget,
			setStatusFilter,
			softDeleteTarget,
			statusFilter,
		}),
		[
			closeForm,
			formMode,
			formState,
			hardDeleteTarget,
			includeDeleted,
			listSort,
			openCreate,
			openEdit,
			searchTerm,
			selectedId,
			softDeleteTarget,
			statusFilter,
		],
	);
}
