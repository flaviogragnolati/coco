import { Suspense } from "react";

import { CategoriesTable } from "~/components/admin/category";
import { CategoriesPageSkeleton } from "~/components/admin/category/categories-page-skeleton";
import { api } from "~/trpc/server";

async function CategoriesContent() {
  const categories = await api.categories.getAllCategories();

  const totalCategories = categories.length;
  const activeCategories = categories.filter((category) => category.isActive).length;
  const totalProducts = categories.reduce(
    (acc, category) => acc + (category._count?.products ?? 0),
    0,
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Categorías</h1>
        <p className="text-muted-foreground">
          Organiza y administra las categorías utilizadas en el catálogo de productos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalCategories}</div>
          <div className="text-muted-foreground text-sm">Total de categorías</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{activeCategories}</div>
          <div className="text-muted-foreground text-sm">Categorías activas</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalProducts}</div>
          <div className="text-muted-foreground text-sm">Productos asociados</div>
        </div>
      </div>

      <CategoriesTable categories={categories} />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageSkeleton />}>
      <CategoriesContent />
    </Suspense>
  );
}
