import type { Metadata } from "next";
import {
	type AdminSearchParams,
	detailIdParam,
	idFilterParam,
} from "~/shared/common/admin-crud/search-params";
import { SupplierOrdersClient } from "./_components/supplier-orders-client";

export const metadata: Metadata = {
	title: "Órdenes de proveedor",
};

export default async function AdminSupplierOrdersPage({
	searchParams,
}: {
	searchParams: Promise<AdminSearchParams>;
}) {
	const params = await searchParams;

	return (
		<SupplierOrdersClient
			initialDetailId={detailIdParam(params)}
			initialFilters={{ operationId: idFilterParam(params.operationId) }}
		/>
	);
}
