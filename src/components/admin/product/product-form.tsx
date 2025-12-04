"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useForm,
  type DefaultValues,
  type Resolver,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Upload, X } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  BUNDLE_UNITS,
  CATEGORIES,
  CURRENCIES,
  UNITS,
  type ProductCategoryOption,
  type ProductCategorySummary,
  type ProductFormValues,
  type ProductSupplierSummary,
} from "~/types";
import { productFormSchema, type ProductFormInput } from "~/schema/product";

type CategoryOptionInput = ProductCategorySummary | ProductCategoryOption;

interface ProductFormProps {
  onSubmit: (values: ProductFormInput) => void | Promise<void>;
  onCancel?: () => void;
  defaultValues?: Partial<ProductFormInput>;
  suppliers: ProductSupplierSummary[];
  categories?: CategoryOptionInput[];
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

type NormalizedCategoryOption =
  | { kind: "id"; label: string; value: number }
  | { kind: "slug"; label: string; value: string };

const normalizeCategoryOptions = (
  options?: CategoryOptionInput[],
): NormalizedCategoryOption[] => {
  if (!options || options.length === 0) {
    return CATEGORIES.map((option) => ({
      kind: "slug" as const,
      label: option.label,
      value: option.value,
    }));
  }

  return options.map((option) => {
    if ("id" in option) {
      return {
        kind: "id" as const,
        label: option.name,
        value: option.id,
      };
    }

    return {
      kind: "slug" as const,
      label: option.label,
      value: option.value,
    };
  });
};

const sanitizeString = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const sanitizeOptionalNumber = (value?: number | null) => {
  if (value === null || value === undefined) return undefined;
  return Number.isNaN(value) ? undefined : value;
};

export function ProductForm({
  onSubmit,
  onCancel,
  defaultValues,
  suppliers,
  categories,
  isSubmitting = false,
  submitLabel = "Guardar producto",
  cancelLabel = "Cancelar",
}: ProductFormProps) {
  const [tagInput, setTagInput] = useState("");
  const [additionalImagesText, setAdditionalImagesText] = useState(() =>
    (defaultValues?.additionalImages ?? []).join("\n"),
  );

  const normalizedCategories = useMemo(
    () => normalizeCategoryOptions(categories),
    [categories],
  );

  const buildDefaultValues = useCallback(
    (values?: Partial<ProductFormInput>): DefaultValues<ProductFormInput> => ({
      name: values?.name ?? "",
      description: values?.description ?? null,
      tags: values?.tags ?? [],
      price: values?.price ?? undefined,
      currency: values?.currency ?? CURRENCIES[0]?.value ?? "ARS",
      sku: values?.sku ?? null,
      supplierSku: values?.supplierSku ?? null,
      code: values?.code ?? null,
      mainImage: values?.mainImage ?? null,
      additionalImages: values?.additionalImages ?? [],
      moq: values?.moq ?? 1,
      unit: values?.unit ?? UNITS[0]?.value ?? "piece",
      step: values?.step ?? 1,
      minQuantity: sanitizeOptionalNumber(values?.minQuantity),
      maxQuantity: sanitizeOptionalNumber(values?.maxQuantity),
      bundleSize: sanitizeOptionalNumber(values?.bundleSize),
      bundleUnit: values?.bundleUnit ?? undefined,
      categoryId: values?.categoryId ?? undefined,
      categorySlug: values?.categorySlug ?? undefined,
      supplierId: values?.supplierId ?? suppliers[0]?.id ?? undefined,
      isActive: values?.isActive ?? true,
    }),
    [suppliers],
  );

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormInput>,
    defaultValues: buildDefaultValues(defaultValues),
  });

  const tags = form.watch("tags") ?? [];
  const selectedCategoryId = form.watch("categoryId");
  const selectedCategorySlug = form.watch("categorySlug");

  useEffect(() => {
    const nextValues = buildDefaultValues(defaultValues);
    form.reset(nextValues);
    setAdditionalImagesText((nextValues.additionalImages ?? []).join("\n"));
    setTagInput("");
  }, [buildDefaultValues, defaultValues, form]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput("");
      return;
    }

    const nextTags = [...tags, trimmed];
    form.setValue("tags", nextTags, { shouldDirty: true });
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((tag) => tag !== tagToRemove);
    form.setValue("tags", nextTags, { shouldDirty: true });
  };

  const handleAdditionalImagesChange = (value: string) => {
    setAdditionalImagesText(value);
    const urls = value
      .split(/\n|,/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    form.setValue("additionalImages", urls, { shouldDirty: true });
  };

  const handleCategoryChange = (selectValue: string) => {
    if (!selectValue) {
      form.setValue("categoryId", undefined, { shouldDirty: true });
      form.setValue("categorySlug", undefined, { shouldDirty: true });
      return;
    }

    const [kind, rawValue] = selectValue.split(":");
    if (kind === "id") {
      const parsed = Number(rawValue);
      if (!Number.isNaN(parsed)) {
        form.setValue("categoryId", parsed, { shouldDirty: true });
        form.setValue("categorySlug", undefined, { shouldDirty: true });
      }
    } else {
      form.setValue("categoryId", undefined, { shouldDirty: true });
      form.setValue("categorySlug", rawValue, { shouldDirty: true });
    }
  };

  const categorySelectValue =
    selectedCategoryId !== undefined && selectedCategoryId !== null
      ? `id:${selectedCategoryId}`
      : selectedCategorySlug
        ? `slug:${selectedCategorySlug}`
        : undefined;

  const onFormSubmit: SubmitHandler<ProductFormInput> = (values) => {
    const sanitized: ProductFormInput = {
      ...values,
      name: values.name.trim(),
      description: sanitizeString(values.description),
      tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
      sku: sanitizeString(values.sku),
      supplierSku: sanitizeString(values.supplierSku),
      code: sanitizeString(values.code),
      mainImage: sanitizeString(values.mainImage),
      additionalImages:
        values.additionalImages?.map((url) => url.trim()).filter(Boolean) ?? [],
      bundleUnit:
        sanitizeOptionalNumber(values.bundleSize) !== undefined
          ? sanitizeString(values.bundleUnit)
          : undefined,
      minQuantity: sanitizeOptionalNumber(values.minQuantity),
      maxQuantity: sanitizeOptionalNumber(values.maxQuantity),
      bundleSize: sanitizeOptionalNumber(values.bundleSize),
      categorySlug: sanitizeString(values.categorySlug) ?? undefined,
    };

    onSubmit(sanitized);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onFormSubmit)}
        className="space-y-6"
        noValidate
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información básica</CardTitle>
            <CardDescription>
              Completa los detalles principales del producto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nombre del producto
                      <span className="text-destructive"> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Proveedor
                      <span className="text-destructive"> *</span>
                    </FormLabel>
                    <Select
                      value={
                        field.value !== undefined && field.value !== null
                          ? String(field.value)
                          : undefined
                      }
                      onValueChange={(value) => {
                        const parsed = Number(value);
                        field.onChange(
                          Number.isNaN(parsed) ? undefined : parsed,
                        );
                      }}
                      disabled={suppliers.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.length === 0 ? (
                          <SelectItem value="no-suppliers" disabled>
                            No hay proveedores disponibles
                          </SelectItem>
                        ) : (
                          suppliers.map((supplier) => (
                            <SelectItem
                              key={supplier.id}
                              value={String(supplier.id)}
                            >
                              {supplier.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={() => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      value={categorySelectValue}
                      onValueChange={handleCategoryChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {normalizedCategories.map((option) => (
                          <SelectItem
                            key={`${option.kind}:${option.value}`}
                            value={`${option.kind}:${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Puedes seleccionar una categoría existente o una sugerida.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Código interno del producto"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente el producto"
                      rows={3}
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex flex-wrap gap-2">
                <div className="flex flex-1 gap-2">
                  <Input
                    value={tagInput}
                    placeholder="Agregar etiqueta"
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Producto activo</FormLabel>
                    <FormDescription>
                      Controla si este producto está disponible para los
                      usuarios.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Activar o desactivar producto"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Precios</CardTitle>
            <CardDescription>
              Define la moneda y el precio del producto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Precio
                    <span className="text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const { value } = event.target;
                        field.onChange(
                          value === "" ? undefined : Number(value),
                        );
                      }}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Moneda
                    <span className="text-destructive"> *</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona moneda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Códigos de producto</CardTitle>
            <CardDescription>
              Identificadores internos y referencias del proveedor.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="supplierSku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU del proveedor</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Código del proveedor"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código interno</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Referencia interna"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen principal</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="https://ejemplo.com/imagen.jpg"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <Button type="button" variant="secondary" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuracion proveedor</CardTitle>
            <CardDescription>
              Configura cantidades mínimas, máximas y unidades del producto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="moq"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cantidad mínima
                      <span className="text-destructive"> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const { value } = event.target;
                          field.onChange(
                            value === "" ? undefined : Number(value),
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unidad
                      <span className="text-destructive"> *</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bundleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamaño del paquete</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const { value } = event.target;
                          field.onChange(
                            value === "" ? undefined : Number(value),
                          );
                        }}
                        placeholder="Unidades por paquete"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bundleUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad del paquete</FormLabel>
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={(value) =>
                        field.onChange(value || undefined)
                      }
                      disabled={
                        sanitizeOptionalNumber(form.getValues("bundleSize")) ===
                        undefined
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona unidad del paquete" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUNDLE_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Disponible cuando definas un tamaño de paquete.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Configuracion lado cliente
            </CardTitle>
            <CardDescription>
              Configura cantidades mínimas, máximas y unidades del producto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="moq"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cantidad mínima que compra el cliente
                      <span className="text-destructive"> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const { value } = event.target;
                          field.onChange(
                            value === "" ? undefined : Number(value),
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unidad
                      <span className="text-destructive"> *</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bundleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamaño del paquete</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const { value } = event.target;
                          field.onChange(
                            value === "" ? undefined : Number(value),
                          );
                        }}
                        placeholder="Unidades por paquete"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bundleUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad del paquete</FormLabel>
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={(value) =>
                        field.onChange(value || undefined)
                      }
                      disabled={
                        sanitizeOptionalNumber(form.getValues("bundleSize")) ===
                        undefined
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona unidad del paquete" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUNDLE_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Disponible cuando definas un tamaño de paquete.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Imágenes adicionales</CardTitle>
            <CardDescription>
              Agrega URLs separadas por salto de línea o comas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="additionalImages"
              render={() => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      value={additionalImagesText}
                      onChange={(event) =>
                        handleAdditionalImagesChange(event.target.value)
                      }
                      placeholder="https://ejemplo.com/imagen-1.jpg
https://ejemplo.com/imagen-2.jpg"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Se aceptan múltiples URLs. Se limpiarán automáticamente al
                    guardar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
