"use client";

import { FormCombobox } from "~/components/form/form-combobox";
import { api } from "~/trpc/react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface CarrierSelectorProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
}

export function CarrierSelector<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name }: CarrierSelectorProps<TFieldValues, TName>) {
  const { data: carriersData } = api.carriers.search.useQuery({
    query: "",
    limit: 50,
  });

  return (
    <FormCombobox
      control={control}
      name={name}
      label="Transportista"
      placeholder="Seleccionar transportista"
      searchPlaceholder="Buscar por nombre o email..."
      emptyText="No se encontraron transportistas"
      options={
        carriersData?.map((carrier) => ({
          value: String(carrier.id),
          label: carrier.email
            ? `${carrier.name} (${carrier.email})`
            : carrier.name,
        })) ?? []
      }
    />
  );
}
