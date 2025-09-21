import { Suspense } from "react";

import { SuppliersPageSkeleton } from "~/components/admin/suppliers/suppliers-page-skeleton";
import { SuppliersTable } from "~/components/admin/suppliers/suppliers-table";
import { api } from "~/trpc/server";

async function SuppliersContent() {
	const suppliers = await api.suppliers.getAllSuppliers();

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* Header */}
			<div>
				<h1 className="font-bold text-3xl tracking-tight">Proveedores</h1>
				<p className="text-muted-foreground">
					Gestiona tus proveedores y su información
				</p>
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-lg border p-4">
					<div className="font-bold text-2xl">{suppliers.length}</div>
					<div className="text-muted-foreground text-sm">Total Proveedores</div>
				</div>
				<div className="rounded-lg border p-4">
					<div className="font-bold text-2xl">
						{suppliers.filter((s) => s.isActive).length}
					</div>
					<div className="text-muted-foreground text-sm">
						Proveedores Activos
					</div>
				</div>
				<div className="rounded-lg border p-4">
					<div className="font-bold text-2xl">
						{suppliers.reduce((acc, s) => acc + s._count.products, 0)}
					</div>
					<div className="text-muted-foreground text-sm">Total Productos</div>
				</div>
			</div>

			{/* Suppliers table */}
			<SuppliersTable suppliers={suppliers} />
		</div>
	);
}

export default function SuppliersPage() {
	return (
		<Suspense fallback={<SuppliersPageSkeleton />}>
			<SuppliersContent />
		</Suspense>
	);
}
