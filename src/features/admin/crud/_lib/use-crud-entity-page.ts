"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { applyCrudListSort } from "~/features/admin/crud/_lib/crud-list-sort";
import {
	matchesCrudStatus,
	matchesSearch,
	normalizeSearch,
} from "~/features/admin/crud/_lib/filter-helpers";
import type { CrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import type { CrudEntityId } from "~/shared/common/admin-crud/crud.types";

export type CrudQueryLike<TData> = {
	data: TData | undefined;
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: { message: string } | null;
};

export type CrudMutationLike = { isPending: boolean };

/**
 * Owns the filter memo, the detail-load-failure effect, and the submitting
 * flag shared by every crud-home page.
 *
 * It takes *already-called* query and mutation results rather than the tRPC
 * router proxy. Passing the proxy compiles but collapses the entity generics
 * to `{}`, and passing hook-returning closures trips
 * `lint/correctness/useHookAtTopLevel`. Callers therefore call
 * `api.admin.<entity>.*` themselves and hand the results here.
 */
export function useCrudEntityPage<
	TId extends CrudEntityId,
	TListItem extends {
		id: CrudEntityId;
		updatedAt: Date;
		active: boolean;
		deleted?: boolean;
	},
	TDetail,
>({
	state,
	listQuery,
	detailQuery,
	createMutation,
	updateMutation,
	searchFields,
	detailErrorMessage,
}: {
	state: CrudPageState<TId, TListItem>;
	listQuery: CrudQueryLike<TListItem[]>;
	detailQuery: CrudQueryLike<TDetail>;
	createMutation: CrudMutationLike;
	updateMutation: CrudMutationLike;
	searchFields: (item: TListItem) => Array<number | string | null>;
	detailErrorMessage: string;
}) {
	const { closeForm, formState, listSort, searchTerm, statusFilter } = state;
	const { data: listData } = listQuery;
	const { error: detailError, isError: detailIsError } = detailQuery;

	useEffect(() => {
		if (formState.open && formState.mode === "edit" && detailIsError) {
			toast.error(detailError?.message || detailErrorMessage);
			closeForm();
		}
	}, [
		closeForm,
		detailError,
		detailErrorMessage,
		detailIsError,
		formState.mode,
		formState.open,
	]);

	const filteredItems = useMemo(() => {
		const search = normalizeSearch(searchTerm);
		const matching = (listData ?? []).filter((item) => {
			return (
				matchesCrudStatus(statusFilter, item) &&
				matchesSearch(search, searchFields(item))
			);
		});

		return applyCrudListSort(matching, listSort);
	}, [listData, listSort, searchFields, searchTerm, statusFilter]);

	return {
		filteredItems,
		detail: state.formMode === "edit" ? detailQuery.data : undefined,
		isLoadingDetail: state.formMode === "edit" && detailQuery.isFetching,
		isFormSubmitting: createMutation.isPending || updateMutation.isPending,
	};
}
