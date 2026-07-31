import type { Metadata } from "next";
import {
	type AdminSearchParams,
	idFilterParam,
} from "~/shared/common/admin-crud/search-params";
import { RollOversClient } from "./_components/roll-overs-client";

export const metadata: Metadata = {
	title: "Rollovers",
};

export default async function AdminRollOversPage({
	searchParams,
}: {
	searchParams: Promise<AdminSearchParams>;
}) {
	const params = await searchParams;

	return (
		<RollOversClient
			initialFilters={{ operationId: idFilterParam(params.operationId) }}
		/>
	);
}
