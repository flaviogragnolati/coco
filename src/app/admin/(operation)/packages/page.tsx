import type { Metadata } from "next";
import {
	type AdminSearchParams,
	detailIdParam,
} from "~/shared/common/admin-crud/search-params";
import { PackagesClient } from "./_components/packages-client";

export const metadata: Metadata = {
	title: "Paquetes",
};

export default async function AdminPackagesPage({
	searchParams,
}: {
	searchParams: Promise<AdminSearchParams>;
}) {
	const params = await searchParams;

	return <PackagesClient initialDetailId={detailIdParam(params)} />;
}
