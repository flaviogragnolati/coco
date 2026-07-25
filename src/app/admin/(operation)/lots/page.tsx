import type { Metadata } from "next";
import {
	type AdminSearchParams,
	detailIdParam,
} from "~/shared/common/admin-crud/search-params";
import { LotsClient } from "./_components/lots-client";

export const metadata: Metadata = {
	title: "Lotes",
};

export default async function AdminLotsPage({
	searchParams,
}: {
	searchParams: Promise<AdminSearchParams>;
}) {
	const params = await searchParams;

	return <LotsClient initialDetailId={detailIdParam(params)} />;
}
