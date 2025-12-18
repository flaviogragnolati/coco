"use client";

import { ProductsTable } from "~/components/admin/product";
import { ProductsPageSkeleton } from "~/components/admin/product/products-page-skeleton";
import { api } from "~/trpc/react";

export default function ProductsPage() {
  const { data: products, isLoading: loadingProducts } =
    api.products.getAllProducts.useQuery();
  const { data: suppliers, isLoading: loadingSuppliers } =
    api.suppliers.getAllSuppliers.useQuery();
  const { data: categories, isLoading: loadingCategories } =
    api.categories.getAllCategories.useQuery();

  const isLoading = loadingProducts || loadingSuppliers || loadingCategories;

  if (isLoading) {
    return <ProductsPageSkeleton />;
  }

  const productsList = products ?? [];
  const suppliersList = suppliers ?? [];
  const categoriesList = categories ?? [];

  const totalProducts = productsList.length;
  const activeProducts = productsList.filter(
    (product) => product.isActive,
  ).length;
  const uniqueSuppliers = new Set(
    productsList.map((product) => product.supplier.id),
  ).size;

  const supplierSummaries = suppliersList.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    image: supplier.image ?? undefined,
  }));

  const categoryList = categoriesList.map((category) => ({
    id: category.id,
    name: category.name,
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
        products={productsList}
        suppliers={supplierSummaries}
        categories={categoryList}
      />
    </div>
  );
}
