"use client";

import { useMemo, useState } from "react";

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
import { CartProvider, getDefaultQuantity, useCart } from "~/store/cart-store";
import type { Category, Product, ProductWithCategory } from "~/types/product";

type Filters = {
  search: string;
  categoryId: number | "all";
};

type ProductsPageProps = {
  products?: ProductWithCategory[];
  categories?: Category[];
};

const mockCategories: Category[] = [
  { id: 1, name: "Bebidas" },
  { id: 2, name: "Snacks" },
  { id: 3, name: "Cuidado personal" },
  { id: 4, name: "Lácteos" },
];

const mockProducts: Product[] = [
  {
    id: 1,
    name: "Caja de kombucha de maracuyá",
    description:
      "Kombucha artesanal fermentada en pequeños lotes, sabor maracuyá. Ideal para clientes que buscan bebidas funcionales.",
    tags: ["fermentado", "sin azúcar", "premium"],
    images: [
      "https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 19.9,
    priceUnit: "USD/caja",
    customerMoq: 2,
    customerUnit: "cajas",
    minFractionPerUser: 1,
    moqByProvider: 20,
    supplierMoq: 10,
    supplierUnit: "cajas",
    supplierUrl: "https://supplier.example.com/kombucha-maracuya",
    categoryId: 1,
  },
  {
    id: 2,
    name: "Chips de garbanzo paprika",
    description:
      "Snacks horneados de garbanzo con paprika ahumada. Alto contenido de proteína y fibra.",
    tags: ["vegano", "alto en fibra"],
    images: [
      "https://images.unsplash.com/photo-1505253668822-42074d58a7c0?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 11.5,
    priceUnit: "USD/caja",
    customerMoq: 5,
    customerUnit: "cajas",
    minFractionPerUser: 2,
    moqByProvider: 40,
    supplierMoq: 20,
    supplierUnit: "cajas",
    supplierUrl: "https://supplier.example.com/chips-garbanzo",
    categoryId: 2,
  },
  {
    id: 3,
    name: "Yogur griego natural 1kg",
    description:
      "Yogur griego ultra cremoso, sin azúcar añadido. Perfecto para restaurantes y cafeterías.",
    tags: ["alto en proteína", "sin azúcar"],
    images: [
      "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 6.2,
    priceUnit: "USD/unidad",
    customerMoq: 12,
    customerUnit: "unidades",
    minFractionPerUser: 3,
    moqByProvider: 80,
    supplierMoq: 50,
    supplierUnit: "unidades",
    categoryId: 4,
  },
  {
    id: 4,
    name: "Barras de proteína surtidas",
    description:
      "Caja con mix de 24 barras de proteína con sabores chocolate y caramelo salado.",
    tags: ["alto en proteína", "sin gluten"],
    images: [
      "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 28.5,
    priceUnit: "USD/caja",
    customerMoq: 3,
    customerUnit: "cajas",
    minFractionPerUser: 1,
    moqByProvider: 25,
    supplierMoq: 15,
    supplierUnit: "cajas",
    categoryId: 2,
  },
  {
    id: 5,
    name: "Agua mineral premium 500ml",
    description:
      "Agua de manantial en botella de vidrio retornable. Caja por 24 unidades.",
    tags: ["vidrio", "retornable"],
    images: [
      "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 17.4,
    priceUnit: "USD/caja",
    customerMoq: 4,
    customerUnit: "cajas",
    minFractionPerUser: 2,
    moqByProvider: 30,
    supplierMoq: 15,
    supplierUnit: "cajas",
    categoryId: 1,
  },
  {
    id: 6,
    name: "Leche de almendra barista",
    description:
      "Leche vegetal formulada para café, con espuma estable. Caja de 12 unidades de 1L.",
    tags: ["plant-based", "barista"],
    images: [
      "https://images.unsplash.com/photo-1510626176961-4b37d0b4e904?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 21.8,
    priceUnit: "USD/caja",
    customerMoq: 6,
    customerUnit: "cajas",
    minFractionPerUser: 2,
    moqByProvider: 32,
    supplierMoq: 16,
    supplierUnit: "cajas",
    categoryId: 4,
  },
  {
    id: 7,
    name: "Jabón líquido neutro 5L",
    description:
      "Jabón líquido biodegradable, ideal para hostelería y servicios de limpieza.",
    tags: ["biodegradable", "hogar"],
    images: [
      "https://images.unsplash.com/photo-1582719478248-54e9f2af75a9?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 9.9,
    priceUnit: "USD/garrafa",
    customerMoq: 10,
    customerUnit: "garrafas",
    minFractionPerUser: 2,
    moqByProvider: 60,
    supplierMoq: 25,
    supplierUnit: "garrafas",
    categoryId: 3,
  },
  {
    id: 8,
    name: "Pack de aguas saborizadas 330ml",
    description:
      "Pack con sabores cítricos y frutos rojos, endulzado con stevia. Caja por 24 unidades.",
    tags: ["sin azúcar", "stevia"],
    images: [
      "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=1200&q=80",
    ],
    price: 15.6,
    priceUnit: "USD/caja",
    customerMoq: 4,
    customerUnit: "cajas",
    minFractionPerUser: 1,
    moqByProvider: 24,
    supplierMoq: 12,
    supplierUnit: "cajas",
    categoryId: 1,
  },
];

function FiltersSidebar({
  categories,
  filters,
  onChange,
}: {
  categories: Category[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>Refina el listado por nombre o categoría.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Search by name..."
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={String(filters.categoryId)}
            onValueChange={(value) =>
              onChange({
                ...filters,
                categoryId: value === "all" ? "all" : Number(value),
              })
            }
          >
            <SelectTrigger className="w-full justify-between">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className="w-[220px]">
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductCard({
  product,
  onOpenDetail,
}: {
  product: ProductWithCategory;
  onOpenDetail: (product: ProductWithCategory) => void;
}) {
  const { addItem } = useCart();
  const image = product.images?.[0];
  const fallbackInitial = product.name.charAt(0).toUpperCase();

  const handleQuickAdd = () => {
    const qty = getDefaultQuantity(product);
    addItem(product, qty);
  };

  return (
    <Card className="h-full">
      <div className="relative mx-6 mt-6 overflow-hidden rounded-lg border bg-muted/40">
        <div className="aspect-[4/3] w-full">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10 text-2xl font-semibold text-muted-foreground">
              {fallbackInitial}
            </div>
          )}
        </div>
      </div>
      <CardHeader className="pb-0">
        <CardTitle className="line-clamp-2">{product.name}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          {product.category?.name && (
            <Badge variant="secondary">{product.category.name}</Badge>
          )}
          <span className="font-semibold text-foreground">
            {product.price.toFixed(2)} {product.priceUnit}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            MOQ cliente:{" "}
            <span className="font-semibold text-foreground">
              {product.customerMoq} {product.customerUnit}
            </span>
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span>
            Fracción mínima:{" "}
            <span className="font-semibold text-foreground">
              {product.minFractionPerUser}
            </span>
          </span>
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:flex-1" onClick={() => onOpenDetail(product)}>
            Ver detalles
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleQuickAdd}>
            + Carrito
          </Button>
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
                  <p className="text-muted-foreground text-xs">MOQ by provider</p>
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
                  <a href={product.supplierUrl} target="_blank" rel="noreferrer">
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

export default function ProductsPage({
  products,
  categories,
}: ProductsPageProps) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    categoryId: "all",
  });
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory>();
  const [detailOpen, setDetailOpen] = useState(false);

  const categoriesList = categories ?? mockCategories;
  const productsWithCategory = useMemo(() => {
    const baseProducts = products ?? mockProducts;
    return baseProducts.map((product) => ({
      ...product,
      category: categoriesList.find(
        (category) => category.id === product.categoryId,
      ),
    }));
  }, [products, categoriesList]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    return productsWithCategory.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesCategory =
        filters.categoryId === "all" ||
        product.categoryId === filters.categoryId;

      return matchesSearch && matchesCategory;
    });
  }, [filters, productsWithCategory]);

  const handleOpenDetail = (product: ProductWithCategory) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  return (
    <CartProvider>
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-primary text-sm">Catálogo mayorista</p>
            <h1 className="font-bold text-2xl text-foreground">Productos</h1>
            <p className="text-muted-foreground text-sm">
              Explora el catálogo, filtra por categoría y revisa los mínimos de compra
              colaborativa.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {filteredProducts.length} productos
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <FiltersSidebar
            categories={categoriesList}
            filters={filters}
            onChange={setFilters}
          />
          <section className="space-y-4">
            {filteredProducts.length > 0 ? (
              <ProductGrid
                products={filteredProducts}
                onOpenDetail={handleOpenDetail}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <span className="text-xl">🔎</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      No products found for these filters
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Ajusta el texto de búsqueda o cambia la categoría para ver más
                      opciones.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        <ProductDetailDialog
          open={detailOpen}
          product={selectedProduct}
          onOpenChange={setDetailOpen}
        />
      </main>
    </CartProvider>
  );
}
