import type { Metadata } from "next";
import {
	type AdminSearchParams,
	detailIdParam,
} from "~/shared/common/admin-crud/search-params";
import { CarrierOrdersClient } from "./_components/carrier-orders-client";

export const metadata: Metadata = {
	title: "Órdenes de transporte",
};

export default async function AdminCarrierOrdersPage({
	searchParams,
}: {
	searchParams: Promise<AdminSearchParams>;
}) {
	const params = await searchParams;

	return <CarrierOrdersClient initialDetailId={detailIdParam(params)} />;
}
