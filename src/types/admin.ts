import type { RouterOutputs } from "~/trpc/react";

// Product types derived from tRPC router outputs
export type ProductRecord = RouterOutputs["products"]["getAllProducts"][number];
export type ProductSupplierSummary = {
  id: number;
  name: string;
  image: string | null | undefined;
};

export type ProductCategorySummary = {
  id: number;
  name: string;
};

export type ProductCategoryOption = {
  label: string;
  value: string;
};

export type ProductFormValues = {
  name: string;
  description?: string | null;
  tags: string[];
  price: number;
  currency: string;
  sku?: string | null;
  supplierSku?: string | null;
  code?: string | null;
  mainImage?: string | null;
  additionalImages: string[];
  moq: number;
  unit: string;
  step: number;
  minQuantity?: number;
  maxQuantity?: number;
  bundleSize?: number;
  bundleUnit?: string;
  supplierId: number;
  categoryId?: number;
  categorySlug?: string;
  isActive: boolean;
};

// Constants
export const CURRENCIES = [
  { label: "Peso Argentino (ARS)", value: "ARS" },
  { label: "Dólar Estadounidense (USD)", value: "USD" },
  { label: "Euro (EUR)", value: "EUR" },
] as const;

export const UNITS = [
  { label: "Unidad", value: "piece" },
  { label: "Kilogramo", value: "kg" },
  { label: "Litro", value: "liter" },
  { label: "Metro", value: "meter" },
  { label: "Caja", value: "box" },
  { label: "Paquete", value: "pack" },
] as const;

export const BUNDLE_UNITS = [
  { label: "Caja", value: "box" },
  { label: "Paquete", value: "pack" },
  { label: "Pallet", value: "pallet" },
  { label: "Bulto", value: "bundle" },
  { label: "Display", value: "display" },
] as const;

export const CATEGORIES = [
  { label: "Alimentos", value: "alimentos" },
  { label: "Bebidas", value: "bebidas" },
  { label: "Lácteos", value: "lacteos" },
  { label: "Snacks", value: "snacks" },
  { label: "Limpieza", value: "limpieza" },
  { label: "Cuidado Personal", value: "cuidado-personal" },
] as const;
