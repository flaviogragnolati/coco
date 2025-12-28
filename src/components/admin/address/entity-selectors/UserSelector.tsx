"use client";

import { FormCombobox } from "~/components/form/form-combobox";
import { api } from "~/trpc/react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface UserSelectorProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
}

export function UserSelector<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name }: UserSelectorProps<TFieldValues, TName>) {
  const { data: usersData } = api.user.search.useQuery({
    query: "",
    limit: 50,
  });

  return (
    <FormCombobox
      control={control}
      name={name}
      label="Usuario"
      placeholder="Seleccionar usuario"
      searchPlaceholder="Buscar por nombre o email..."
      emptyText="No se encontraron usuarios"
      options={
        usersData?.map((user) => ({
          value: user.id,
          label: `${user.name ?? user.email} (${user.email})`,
        })) ?? []
      }
    />
  );
}
