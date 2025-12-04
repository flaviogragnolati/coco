"use client";

import { useEffect, useMemo } from "react";
import {
  useForm,
  type DefaultValues,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import { Form } from "~/ui/form";
import { FieldInput } from "~/components/form/form-input";
import { FieldTextarea } from "~/components/form/form-textarea";
import { FieldSwitch } from "~/components/form/form-switch";
import {
  createCarrierSchema,
  type CreateCarrierInput,
} from "~/schema/carrier";

interface CarrierFormProps {
  defaultValues?: Partial<CreateCarrierInput>;
  onSubmit: SubmitHandler<CreateCarrierInput>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
}

const buildDefaultValues = (
  values?: Partial<CreateCarrierInput>,
): DefaultValues<CreateCarrierInput> => ({
  name: values?.name ?? "",
  description: values?.description ?? null,
  image: values?.image ?? null,
  phone: values?.phone ?? null,
  email: values?.email ?? null,
  website: values?.website ?? null,
  taxId: values?.taxId ?? null,
  taxType: values?.taxType ?? null,
  isActive: values?.isActive ?? true,
});

const sanitizeNullable = (value?: string | null) => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function CarrierForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Guardar transportista",
  cancelLabel = "Cancelar",
  isSubmitting = false,
}: CarrierFormProps) {
  const form = useForm<CreateCarrierInput>({
    resolver: zodResolver(createCarrierSchema),
    defaultValues: useMemo(() => buildDefaultValues(defaultValues), [defaultValues]),
  });

  useEffect(() => {
    form.reset(buildDefaultValues(defaultValues));
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit((values) => {
    const normalized: CreateCarrierInput = {
      name: values.name.trim(),
      description: sanitizeNullable(values.description),
      image: sanitizeNullable(values.image),
      phone: sanitizeNullable(values.phone),
      email: sanitizeNullable(values.email),
      website: sanitizeNullable(values.website),
      taxId: sanitizeNullable(values.taxId),
      taxType: sanitizeNullable(values.taxType),
      isActive: values.isActive,
    };

    onSubmit(normalized);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FieldInput
            control={form.control}
            name="name"
            label="Nombre *"
            placeholder="Nombre del transportista"
          />

          <FieldInput
            control={form.control}
            name="image"
            label="Imagen"
            placeholder="https://..."
          />

          <FieldInput
            control={form.control}
            name="email"
            label="Correo electrónico"
            type="email"
            placeholder="logistica@empresa.com"
          />

          <FieldInput
            control={form.control}
            name="phone"
            label="Teléfono"
            placeholder="+54 11 1234-5678"
          />

          <FieldInput
            control={form.control}
            name="website"
            label="Sitio web"
            placeholder="https://empresa.com"
          />

          <FieldInput
            control={form.control}
            name="taxType"
            label="Tipo fiscal"
            placeholder="CUIT"
          />

          <FieldInput
            control={form.control}
            name="taxId"
            label="Identificación fiscal"
            placeholder="30-00000000-0"
          />
        </div>

        <FieldTextarea
          control={form.control}
          name="description"
          label="Descripción"
          rows={3}
          placeholder="Descripción resumida de la empresa de transporte"
        />

        <FieldSwitch
          control={form.control}
          name="isActive"
          label="Transportista activo"
          description="Los transportistas inactivos no podrán ser asignados a envíos."
        />

        <DialogFooter className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
