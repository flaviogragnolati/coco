"use client";

import { useCallback, useMemo, useState } from "react";
import { Edit, Package, Plus, Tag, Trash, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { AppTable, type ColumnConfig } from "~/components/ui/app-table";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  type ProductRecord,
  type ProductSupplierSummary,
  type ProductCategorySummary,
  type ProductCategoryOption,
  CURRENCIES,
  UNITS,
} from "~/types";
import type { ProductFormInput } from "~/schema/product";
import { useConfirm } from "~/components/ui/confirm";
import { ProductForm } from "./product-form";

interface ProductsTableProps {
  products: ProductRecord[];
  suppliers: ProductSupplierSummary[];
  categories?: Array<ProductCategorySummary | ProductCategoryOption>;
  isLoading?: boolean;
  onCreateProduct?: (values: ProductFormInput) => Promise<void> | void;
  onUpdateProduct?: (
    id: ProductRecord["id"],
    values: ProductFormInput,
  ) => Promise<void> | void;
  onDeleteProduct?: (product: ProductRecord) => Promise<void> | void;
}

interface FilterState {
  search: string;
  categoryIds: number[];
}

const currencyFormatters = new Map(
  CURRENCIES.map((currency) => [
    currency.value,
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency.value,
    }),
  ]),
);

const toFormDefaults = (product: ProductRecord): Partial<ProductFormInput> => {
  const [mainImage, ...additionalImages] = product.images ?? [];

  return {
    name: product.name,
    description: product.description ?? null,
    tags: product.tags ?? [],

    // Supplier pricing
    price: product.price,
    priceUnit: product.priceUnit,
    priceUnitMultiplier: product.priceUnitMultiplier,

    // Public pricing
    publicPrice: product.publicPrice,
    publicPriceUnit: product.publicPriceUnit,
    publicPriceMultiplier: product.publicPriceMultiplier,

    // Supplier MOQ
    supplierMoq: product.supplierMoq,
    supplierUnit: product.supplierUnit,
    supplierUnitMultiplier: product.supplierUnitMultiplier,

    // Customer MOQ
    customerMoq: product.customerMoq,
    customerUnit: product.customerUnit,
    customerUnitMultiplier: product.customerUnitMultiplier,

    currency: product.currency,
    sku: product.sku ?? null,
    supplierSku: product.supplierSku ?? null,
    code: product.code ?? null,
    mainImage: mainImage ?? null,
    additionalImages,
    supplierId: product.supplier.id,
    categoryId: product.category?.id ?? undefined,
    categorySlug: undefined,
    isActive: product.isActive,
  };
};

export function ProductsTable({
  products,
  suppliers,
  categories,
  isLoading = false,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductsTableProps) {
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Filtering state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    categoryIds: [],
  });

  // Filtered products based on search, categories, and tags
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(searchLower);
        const matchesDescription = product.description
          ?.toLowerCase()
          .includes(searchLower);
        if (!matchesName && !matchesDescription) return false;
      }

      // Category filter
      if (filters.categoryIds.length > 0) {
        if (
          !product.category ||
          !filters.categoryIds.includes(product.category.id)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [products, filters]);

  const handleCategoryToggle = useCallback((categoryId: number) => {
    setFilters((prev) => {
      const isSelected = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: isSelected
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: "",
      categoryIds: [],
    });
  }, []);

  const handleCreateClick = useCallback(() => {
    setEditingProduct(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((product: ProductRecord) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback(
    async (product: ProductRecord) => {
      if (!onDeleteProduct) return;

      const result = await confirm({
        title: "Eliminar producto",
        description: `¿Estás seguro de eliminar "${product.name}"? Esta acción no se puede deshacer.`,
        confirmationText: "Eliminar",
        cancellationText: "Cancelar",
      });

      if (!result.confirmed) return;

      try {
        await onDeleteProduct(product);
      } catch (error) {
        console.error("Failed to delete product", error);
      }
    },
    [confirm, onDeleteProduct],
  );

  const handleModalClose = useCallback(() => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingProduct(null);
  }, [isSaving]);

  const handleFormSubmit = useCallback(
    async (values: ProductFormInput) => {
      try {
        setIsSaving(true);

        if (editingProduct) {
          if (onUpdateProduct) {
            await onUpdateProduct(editingProduct.id, values);
          }
        } else if (onCreateProduct) {
          await onCreateProduct(values);
        }

        setIsModalOpen(false);
        setEditingProduct(null);
      } catch (error) {
        console.error("Failed to submit product form", error);
      } finally {
        setIsSaving(false);
      }
    },
    [editingProduct, onCreateProduct, onUpdateProduct],
  );

  const columns = useMemo<ColumnConfig<ProductRecord>[]>(() => {
    return [
      {
        key: "product",
        title: "Producto",
        type: "custom",
        render: (product) => (
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={product.images?.[0] ?? undefined}
                alt={product.name}
              />
              <AvatarFallback>
                {product.name
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="font-medium">{product.name}</div>
              {product.description && (
                <p className="line-clamp-2 text-muted-foreground text-sm">
                  {product.description}
                </p>
              )}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {product.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                  {product.tags.length > 3 && (
                    <Badge variant="outline">+{product.tags.length - 3}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "pricing",
        title: "Precios",
        type: "custom",
        render: (product) => {
          const formatter =
            currencyFormatters.get(product.currency) ??
            new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: product.currency,
            });

          const getUnitLabel = (unitValue: string) => {
            return UNITS.find((u) => u.value === unitValue)?.label ?? unitValue;
          };

          const supplierPrice = product.price / product.priceUnitMultiplier;
          const publicPrice =
            product.publicPrice / product.publicPriceMultiplier;

          return (
            <div className="space-y-1 text-sm">
              <div className="font-medium">
                Público: {formatter.format(publicPrice)}/
                {getUnitLabel(product.publicPriceUnit)}
              </div>
              <div className="text-muted-foreground">
                Proveedor: {formatter.format(supplierPrice)}/
                {getUnitLabel(product.priceUnit)}
              </div>
            </div>
          );
        },
      },
      {
        key: "moq",
        title: "MOQ",
        type: "custom",
        render: (product) => {
          const getUnitLabel = (unitValue: string) => {
            return UNITS.find((u) => u.value === unitValue)?.label ?? unitValue;
          };

          const supplierMoq =
            product.supplierMoq * product.supplierUnitMultiplier;
          const customerMoq =
            product.customerMoq * product.customerUnitMultiplier;

          return (
            <div className="space-y-1 text-sm">
              <div>
                Cliente: {customerMoq} {getUnitLabel(product.customerUnit)}
              </div>
              <div className="text-muted-foreground">
                Proveedor: {supplierMoq} {getUnitLabel(product.supplierUnit)}
              </div>
            </div>
          );
        },
      },
      {
        key: "supplier",
        title: "Proveedor",
        type: "custom",
        render: (product) => (
          <div className="space-y-1 text-sm">
            <div className="font-medium">{product.supplier.name}</div>
            {product.category && (
              <div className="text-muted-foreground">
                {product.category.name}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "status",
        title: "Estado",
        type: "boolean",
        dataKey: "isActive",
        labels: {
          true: "Activo",
          false: "Inactivo",
        },
        asBadge: true,
      },
      {
        key: "createdAt",
        title: "Creado",
        type: "date",
        dataKey: "createdAt",
        dateFormat: "DD MMM YYYY",
      },
      {
        key: "actions",
        title: "Acciones",
        type: "actions",
        width: "170px",
        actions: {
          layout: "inline",
          edit: {
            label: "Editar",
            icon: <Edit className="h-3 w-3" />,
            onClick: (product) => handleEditClick(product),
          },
          delete: onDeleteProduct
            ? {
                label: "Eliminar",
                icon: <Trash className="h-3 w-3" />,
                onClick: (product) => void handleDeleteClick(product),
              }
            : undefined,
        },
      },
    ];
  }, [handleDeleteClick, handleEditClick, onDeleteProduct]);

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Package className="h-12 w-12 text-muted-foreground" />
      <div>
        <h3 className="font-semibold text-lg">No hay productos cargados</h3>
        <p className="text-muted-foreground">
          Comienza agregando tu primer producto para verlo aquí.
        </p>
      </div>
    </div>
  );

  const hasActiveFilters =
    filters.search !== "" || filters.categoryIds.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            Productos ({filteredProducts.length})
          </h3>
          <p className="text-muted-foreground text-sm">
            Administra el catálogo disponible para tus clientes.
          </p>
        </div>
        <Button onClick={handleCreateClick} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-base">Filtros</Label>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8"
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Search by name */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por nombre</Label>
              <Input
                id="search"
                type="text"
                placeholder="Nombre del producto..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>

            {/* Category multi-select */}
            {categories && categories.length > 0 && (
              <div className="space-y-2">
                <Label>Categorías</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const categoryId = "id" in category ? category.id : 0;
                    const categoryName =
                      "name" in category ? category.name : category.label;
                    const isSelected = filters.categoryIds.includes(categoryId);

                    return (
                      <Badge
                        key={categoryId}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleCategoryToggle(categoryId)}
                      >
                        {categoryName}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <AppTable
          columns={columns}
          data={filteredProducts}
          loading={isLoading}
          emptyState={emptyState}
          emptyMessage="No hay productos disponibles"
        />
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleModalClose();
          } else {
            setIsModalOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar producto" : "Crear producto"}
            </DialogTitle>
            <DialogDescription>
              Completa los campos para{" "}
              {editingProduct ? "actualizar" : "registrar"} el producto.
            </DialogDescription>
          </DialogHeader>

          <ProductForm
            onSubmit={handleFormSubmit}
            onCancel={handleModalClose}
            defaultValues={
              editingProduct ? toFormDefaults(editingProduct) : undefined
            }
            suppliers={suppliers}
            categories={categories}
            isSubmitting={isSaving}
            submitLabel={editingProduct ? "Guardar cambios" : "Crear producto"}
            cancelLabel="Cerrar"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
