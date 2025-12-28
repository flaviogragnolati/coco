"use client";

import { FormCombobox } from "~/components/form/form-combobox";
import { api } from "~/trpc/react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface SupplierSelectorProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
}

export function SupplierSelector<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name }: SupplierSelectorProps<TFieldValues, TName>) {
  const { data: suppliersData } = api.suppliers.search.useQuery({
    query: "",
    limit: 50,
  });

  return (
    <FormCombobox
      control={control}
      name={name}
      label="Proveedor"
      placeholder="Seleccionar proveedor"
      searchPlaceholder="Buscar por nombre o email..."
      emptyText="No se encontraron proveedores"
      options={
        suppliersData?.map((supplier) => ({
          value: String(supplier.id),
          label: supplier.email
            ? `${supplier.name} (${supplier.email})`
            : supplier.name,
        })) ?? []
      }
    />
  );
}
