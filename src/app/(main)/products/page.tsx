"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Eye, Minus, Plus, ShoppingCart } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { MultiSelect } from "~/components/ui/multi-select";
import { TagInput } from "~/components/ui/tag-input";
import { useCart } from "~/store/cart-store";
import type { ProductWithCategory } from "~/types/product";
import { api } from "~/trpc/react";

type Filters = {
  search: string;
  categoryIds: string[];
  tags: string[];
};

type SortOrder = "price-asc" | "price-desc" | "default";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function FiltersSidebar({
  categories,
  availableTags,
  filters,
  onChange,
}: {
  categories: { value: string; label: string }[];
  availableTags: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>
          Refina el listado por nombre, categoría o etiquetas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">Buscar por nombre</Label>
          <Input
            id="search"
            placeholder="Buscar productos..."
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Categorías</Label>
          <MultiSelect
            options={categories}
            selected={filters.categoryIds}
            onChange={(categoryIds) => onChange({ ...filters, categoryIds })}
            placeholder="Selecciona categorías..."
          />
        </div>
        <div className="space-y-2">
          <Label>Etiquetas</Label>
          <TagInput
            availableTags={availableTags}
            selected={filters.tags}
            onChange={(tags) => onChange({ ...filters, tags })}
            placeholder="Buscar etiquetas..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function formatUnitDisplay(multiplier: number, unit: string): string {
  // Format as "multiplier/unit", e.g., "1/kg" or "100/g"
  return `${multiplier}/${unit}`;
}

function ProductCard({
  product,
  onOpenDetail,
}: {
  product: ProductWithCategory;
  onOpenDetail: (product: ProductWithCategory) => void;
}) {
  const { items, addItem, incrementItem, decrementItem, setItemQuantity } =
    useCart();
  const image = product.images?.[0];
  const fallbackInitial = product.name.charAt(0).toUpperCase();
  const step = product.minFractionPerUser ?? 1;

  // Check if product is in cart
  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;

  const handleAddToCart = () => {
    addItem(product);
  };

  const handleIncrement = () => {
    incrementItem(product.id, step);
  };

  const handleDecrement = () => {
    decrementItem(product.id, step);
  };

  const handleQuantityChange = (value: string) => {
    const newQty = Number.parseInt(value, 10);
    if (!Number.isNaN(newQty) && newQty >= 0) {
      setItemQuantity(product.id, newQty);
    }
  };

  // Format public price and MOQ
  const publicPriceDisplay = product.publicPrice
    ? Math.floor(product.publicPrice)
    : Math.floor(product.price);
  const publicPriceUnitDisplay =
    product.publicPriceUnit && product.publicPriceMultiplier
      ? formatUnitDisplay(
          product.publicPriceMultiplier,
          product.publicPriceUnit,
        )
      : product.priceUnit;

  const customerMoqDisplay = formatUnitDisplay(
    product.customerUnitMultiplier ?? 1,
    product.customerUnit,
  );

  return (
    <Card className="flex h-full flex-col">
      <div className="relative mx-4 mt-4 overflow-hidden rounded-lg">
        <div className="aspect-square w-full">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10 text-4xl font-semibold text-muted-foreground">
              {fallbackInitial}
            </div>
          )}
        </div>
      </div>
      <CardHeader className="flex-1 space-y-2 pb-2">
        <CardTitle className="line-clamp-2 text-base">{product.name}</CardTitle>
        {product.category?.name && (
          <Badge variant="secondary" className="w-fit">
            {product.category.name}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-lg">${publicPriceDisplay}</span>
            <span className="text-muted-foreground text-xs">
              {publicPriceUnitDisplay}
            </span>
          </div>
          <div className="text-muted-foreground text-xs">
            MOQ: {product.customerMoq} {customerMoqDisplay}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="shrink-0"
            onClick={() => onOpenDetail(product)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {quantity === 0 ? (
            <Button className="flex-1" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          ) : (
            <div className="flex flex-1 items-center gap-1 rounded-md border">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                onClick={handleDecrement}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="h-9 border-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                min="0"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                onClick={handleIncrement}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductGrid({
  products,
  onOpenDetail,
}: {
  products: ProductWithCategory[];
  onOpenDetail: (product: ProductWithCategory) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}

function ProductDetailDialog({
  open,
  product,
  onOpenChange,
}: {
  open: boolean;
  product?: ProductWithCategory;
  onOpenChange: (open: boolean) => void;
}) {
  const mainImage = product?.images?.[0];
  const fallbackInitial = product?.name?.charAt(0).toUpperCase() ?? "";

  if (!product) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border bg-muted/40">
              <div className="aspect-[4/3] w-full">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10 text-3xl font-semibold text-muted-foreground">
                    {fallbackInitial}
                  </div>
                )}
              </div>
            </div>
            {product.images.length > 1 && (
              <ScrollArea className="h-24">
                <div className="flex gap-3 pr-3">
                  {product.images.map((image) => (
                    <div
                      key={image}
                      className="relative aspect-[4/3] w-24 overflow-hidden rounded-md border"
                    >
                      <img
                        src={image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 pr-2">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl">{product.name}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-sm">
                  {product.category?.name && (
                    <Badge variant="secondary">{product.category.name}</Badge>
                  )}
                  <span className="font-semibold text-foreground">
                    {product.price.toFixed(2)} {product.priceUnit}
                  </span>
                </DialogDescription>
              </DialogHeader>
              {product.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {product.description}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">Supplier MOQ</p>
                  <p className="font-semibold">
                    {product.supplierMoq} {product.supplierUnit}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">Customer MOQ</p>
                  <p className="font-semibold">
                    {product.customerMoq} {product.customerUnit}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">
                    Minimum fraction per user
                  </p>
                  <p className="font-semibold">{product.minFractionPerUser}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">
                    MOQ by provider
                  </p>
                  <p className="font-semibold">{product.moqByProvider}</p>
                </div>
              </div>
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {product.supplierUrl && (
                <Button asChild variant="outline">
                  <a
                    href={product.supplierUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver página del proveedor
                  </a>
                </Button>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    categoryIds: [],
    tags: [],
  });
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch products and categories from tRPC
  const { data: productsData, isLoading: productsLoading } =
    api.products.getAllProducts.useQuery();
  const { data: categoriesData, isLoading: categoriesLoading } =
    api.categories.getAllCategories.useQuery();

  // Map products from API to ProductWithCategory type
  const productsWithCategory = useMemo<ProductWithCategory[]>(() => {
    if (!productsData) return [];

    return productsData.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description ?? undefined,
      tags: product.tags,
      images: product.images,
      price: product.price,
      priceUnit: product.priceUnit,
      customerMoq: product.customerMoq,
      customerUnit: product.customerUnit,
      customerUnitMultiplier: product.customerUnitMultiplier,
      minFractionPerUser: product.minFractionPerUser,
      moqByProvider: product.supplierMoq,
      supplierMoq: product.supplierMoq,
      supplierUnit: product.supplierUnit,
      supplierUrl: product.supplierUrl ?? undefined,
      publicPrice: product.publicPrice,
      publicPriceUnit: product.publicPriceUnit,
      publicPriceMultiplier: product.publicPriceMultiplier,
      categoryId: product.category?.id ?? 0,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
          }
        : undefined,
    }));
  }, [productsData]);

  // Extract unique tags from all products
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const product of productsWithCategory) {
      for (const tag of product.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [productsWithCategory]);

  // Map categories for multi-select
  const categoryOptions = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
    }));
  }, [categoriesData]);

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    return productsWithCategory.filter((product) => {
      // Search by name
      const matchesSearch =
        normalizedSearch === "" ||
        product.name.toLowerCase().includes(normalizedSearch);

      // Filter by categories
      const matchesCategory =
        filters.categoryIds.length === 0 ||
        filters.categoryIds.includes(String(product.categoryId));

      // Filter by tags
      const matchesTags =
        filters.tags.length === 0 ||
        filters.tags.some((tag) => product.tags.includes(tag));

      return matchesSearch && matchesCategory && matchesTags;
    });
  }, [filters, productsWithCategory]);

  // Sorting
  const sortedProducts = useMemo(() => {
    const products = [...filteredProducts];

    if (sortOrder === "price-asc") {
      return products.sort((a, b) => {
        const priceA = a.publicPrice ?? a.price;
        const priceB = b.publicPrice ?? b.price;
        return priceA - priceB;
      });
    }

    if (sortOrder === "price-desc") {
      return products.sort((a, b) => {
        const priceA = a.publicPrice ?? a.price;
        const priceB = b.publicPrice ?? b.price;
        return priceB - priceA;
      });
    }

    return products;
  }, [filteredProducts, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, currentPage, pageSize]);

  // Reset to page 1 when filters, sorting, or page size changes
  useMemo(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortOrder, pageSize]);

  const handleOpenDetail = (product: ProductWithCategory) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  const isLoading = productsLoading || categoriesLoading;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-primary text-sm">Catálogo mayorista</p>
          <h1 className="font-bold text-2xl text-foreground">Productos</h1>
          <p className="text-muted-foreground text-sm">
            Explora el catálogo, filtra por categoría, etiquetas y revisa los
            mínimos de compra colaborativa.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {sortedProducts.length} productos
        </Badge>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-muted-foreground">Cargando productos...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <FiltersSidebar
            categories={categoryOptions}
            availableTags={availableTags}
            filters={filters}
            onChange={setFilters}
          />
          <section className="space-y-4">
            {sortedProducts.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Ordenar por:</Label>
                    <Select
                      value={sortOrder}
                      onValueChange={(value) => setSortOrder(value as SortOrder)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            Por defecto
                          </div>
                        </SelectItem>
                        <SelectItem value="price-asc">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            Precio: menor a mayor
                          </div>
                        </SelectItem>
                        <SelectItem value="price-desc">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            Precio: mayor a menor
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Mostrar:</Label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) =>
                        setPageSize(Number(value) as PageSize)
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ProductGrid
                  products={paginatedProducts}
                  onOpenDetail={handleOpenDetail}
                />
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <span className="text-xl">🔎</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      No se encontraron productos para estos filtros
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Ajusta el texto de búsqueda, categorías o etiquetas para
                      ver más opciones.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}

      <ProductDetailDialog
        open={detailOpen}
        product={selectedProduct}
        onOpenChange={setDetailOpen}
      />
    </main>
  );
}
