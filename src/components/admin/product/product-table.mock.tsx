"use client";

import { useForm } from "react-hook-form";
import { CURRENCIES, UNITS, BUNDLE_UNITS, CATEGORIES } from "~/types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { X, Plus, Upload } from "lucide-react";
import { useState } from "react";

interface ProductFormProps {
  onSubmit: (data: Product) => void;
  defaultValues?: Partial<Product>;
  isLoading?: boolean;
}

export function ProductForm({
  onSubmit,
  defaultValues,
  isLoading,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Product>({
    defaultValues: {
      currency: "ARS",
      unit: "piece",
      moq: 1,
      step: 1,
      tags: [],
      additionalImages: [],
      ...defaultValues,
    },
  });

  const [tagInput, setTagInput] = useState("");
  const tags = watch("tags") || [];
  const currency = watch("currency");
  const unit = watch("unit");
  const bundleUnit = watch("bundleUnit");
  const category = watch("category");

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue("tags", [...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue(
      "tags",
      tags.filter((tag) => tag !== tagToRemove),
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información Básica</CardTitle>
          <CardDescription>
            Detalles esenciales y descripción del producto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre del Producto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", {
                  required: "El nombre del producto es requerido",
                })}
                placeholder="Ingrese el nombre del producto"
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Categoría <span className="text-destructive">*</span>
              </Label>
              <Select
                value={category}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">
                  {errors.category.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Breve descripción del producto"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Agregar etiquetas"
              />
              <Button
                type="button"
                onClick={addTag}
                variant="secondary"
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Precios</CardTitle>
          <CardDescription>
            Configure el precio y moneda del producto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">
                Precio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price", {
                  required: "El precio es requerido",
                  valueAsNumber: true,
                  min: { value: 0, message: "El precio debe ser positivo" },
                })}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                Moneda <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currency}
                onValueChange={(value) => setValue("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Códigos de Producto</CardTitle>
          <CardDescription>
            SKU y códigos de referencia internos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...register("sku")}
                placeholder="SKU del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierSku">SKU del Proveedor</Label>
              <Input
                id="supplierSku"
                {...register("supplierSku")}
                placeholder="SKU del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código Interno</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="Código interno"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory & Ordering */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventario y Pedidos</CardTitle>
          <CardDescription>
            Reglas de cantidad y unidades de medida
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="moq">
                Cantidad Mínima <span className="text-destructive">*</span>
              </Label>
              <Input
                id="moq"
                type="number"
                {...register("moq", {
                  required: "La cantidad mínima es requerida",
                  valueAsNumber: true,
                  min: {
                    value: 1,
                    message: "La cantidad mínima debe ser al menos 1",
                  },
                })}
                placeholder="1"
              />
              {errors.moq && (
                <p className="text-sm text-destructive">{errors.moq.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">
                Unidad <span className="text-destructive">*</span>
              </Label>
              <Select
                value={unit}
                onValueChange={(value) => setValue("unit", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="step">
                Incremento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="step"
                type="number"
                {...register("step", {
                  required: "El incremento es requerido",
                  valueAsNumber: true,
                  min: {
                    value: 1,
                    message: "El incremento debe ser al menos 1",
                  },
                })}
                placeholder="1"
              />
              {errors.step && (
                <p className="text-sm text-destructive">
                  {errors.step.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxQuantity">Cantidad Máxima</Label>
              <Input
                id="maxQuantity"
                type="number"
                {...register("maxQuantity", { valueAsNumber: true })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bundleSize">Tamaño del Paquete</Label>
              <Input
                id="bundleSize"
                type="number"
                {...register("bundleSize", { valueAsNumber: true })}
                placeholder="Unidades por paquete"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundleUnit">Unidad de Paquete</Label>
              <Select
                value={bundleUnit}
                onValueChange={(value) => setValue("bundleUnit", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione unidad de paquete" />
                </SelectTrigger>
                <SelectContent>
                  {BUNDLE_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Proveedor</CardTitle>
          <CardDescription>Referencia y detalles del proveedor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier">
              Proveedor <span className="text-destructive">*</span>
            </Label>
            <Input
              id="supplier"
              {...register("supplier", {
                required: "El proveedor es requerido",
              })}
              placeholder="Nombre o referencia del proveedor"
            />
            {errors.supplier && (
              <p className="text-sm text-destructive">
                {errors.supplier.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Imágenes del Producto</CardTitle>
          <CardDescription>
            Imagen principal y fotos adicionales del producto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mainImage">URL de Imagen Principal</Label>
            <div className="flex gap-2">
              <Input
                id="mainImage"
                {...register("mainImage")}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <Button type="button" variant="secondary" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalImages">Imágenes Adicionales</Label>
            <p className="text-sm text-muted-foreground">
              Ingrese URLs de imágenes separadas por comas
            </p>
            <Textarea
              id="additionalImages"
              {...register("additionalImages")}
              placeholder="https://ejemplo.com/imagen1.jpg, https://ejemplo.com/imagen2.jpg"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creando..." : "Crear Producto"}
        </Button>
      </div>
    </form>
  );
}

type Column<TData> = {
  name: string;
  label?: string;
  type: "text" | "number" | "date" | "boolean" | "action" | "custom";
  renderCell?: (row: TData) => React.ReactNode;
};

type Product = {
  name: string; // product name
  description?: string; // brief description
  category: string; // predefined category or custom
  tags: string[]; // array of tags
  price: number; // in default currency
  currency: string; // default to ARS. dropdown ISO currency code, e.g., "USD"
  sku?: string; // product code
  supplierSku?: string; // supplier's product code
  code?: string; // internal product code
  mainImage?: string; // URL to main image
  additionalImages?: string[]; // URLs to additional images
  moq: number; // minimum order quantity
  unit: string; // dropdown e.g., "piece", "kg", "litre"
  step: number; // order quantity step
  maxQuantity?: number; // maximum order quantity
  bundleSize?: number; // items per bundle
  bundleUnit?: string; // e.g., "box", "crate"
  supplier: string; // predefined reference to supplier
};
