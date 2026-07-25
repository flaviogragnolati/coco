import type { Metadata } from "next";
import {
	type AdminSearchParams,
	detailIdParam,
} from "~/shared/common/admin-crud/search-params";
import { ShipmentsClient } from "./_components/shipments-client";

export const metadata: Metadata = {
	title: "Envíos",
};

export default async function AdminShipmentsPage({
	searchParams,
}: {
	searchParams: Promise<AdminSearchParams>;
}) {
	const params = await searchParams;

	return <ShipmentsClient initialDetailId={detailIdParam(params)} />;
}
