import { Suspense } from "react";

import { ProductsTable } from "~/components/admin/product";
import { ProductsPageSkeleton } from "~/components/admin/product/products-page-skeleton";
import { api } from "~/trpc/server";

async function ProductsContent() {
  const [products, suppliers] = await Promise.all([
    api.products.getAllProducts(),
    api.suppliers.getAllSuppliers(),
  ]);

  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.isActive).length;
  const uniqueSuppliers = new Set(
    products.map((product) => product.supplier.id),
  ).size;
  const categories = Array.from(
    new Map(
      products
        .filter((product) => product.category)
        .map((product) => [
          product.category!.id,
          {
            id: product.category!.id,
            name: product.category!.name,
          },
        ]),
    ).values(),
  );

  const supplierSummaries = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    image: supplier.image ?? undefined,
  }));

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Productos</h1>
        <p className="text-muted-foreground">
          Gestiona el catálogo disponible para tus clientes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalProducts}</div>
          <div className="text-muted-foreground text-sm">Total productos</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{activeProducts}</div>
          <div className="text-muted-foreground text-sm">Productos activos</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{uniqueSuppliers}</div>
          <div className="text-muted-foreground text-sm">
            Proveedores vinculados
          </div>
        </div>
      </div>

      <ProductsTable
        products={products}
        suppliers={supplierSummaries}
        categories={categories}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}
