import type { Metadata } from "next";
import {
	type AdminSearchParams,
	detailIdParam,
	reviewIdParam,
} from "~/shared/common/admin-crud/search-params";
import { OperationsClient } from "./_components/operations-client";

export const metadata: Metadata = {
	title: "Operaciones",
};

export default async function AdminOperationsOperationsPage({
	searchParams,
}: {
	searchParams: Promise<AdminSearchParams>;
}) {
	const params = await searchParams;

	return (
		<OperationsClient
			initialDetailId={detailIdParam(params)}
			initialReviewId={reviewIdParam(params)}
		/>
	);
}
