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
  ADDRESS_TYPES,
  createAddressSchema,
  type CreateAddressInput,
} from "~/schema/address";
import {
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

interface AddressFormProps {
  defaultValues?: Partial<CreateAddressInput>;
  supplierOptions?: Array<{ id: number; name: string }>;
  carrierOptions?: Array<{ id: number; name: string }>;
  onSubmit: SubmitHandler<CreateAddressInput>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
}

const buildDefaultValues = (
  values?: Partial<CreateAddressInput>,
): DefaultValues<CreateAddressInput> => ({
  type: values?.type ?? ADDRESS_TYPES[0],
  fullAddress: values?.fullAddress ?? "",
  street: values?.street ?? "",
  number: values?.number ?? "",
  city: values?.city ?? "",
  state: values?.state ?? "",
  postalCode: values?.postalCode ?? "",
  country: values?.country ?? "",
  description: values?.description ?? null,
  userId: values?.userId ?? null,
  supplierId: values?.supplierId ?? null,
  carrierId: values?.carrierId ?? null,
  isActive: values?.isActive ?? true,
});

const sanitizeNullableString = (value?: string | null) => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function AddressForm({
  defaultValues,
  supplierOptions = [],
  carrierOptions = [],
  onSubmit,
  onCancel,
  submitLabel = "Guardar dirección",
  cancelLabel = "Cancelar",
  isSubmitting = false,
}: AddressFormProps) {
  const form = useForm<CreateAddressInput>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: useMemo(() => buildDefaultValues(defaultValues), [defaultValues]),
  });

  useEffect(() => {
    form.reset(buildDefaultValues(defaultValues));
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit((values) => {
    const normalized: CreateAddressInput = {
      ...values,
      fullAddress: values.fullAddress.trim(),
      street: values.street.trim(),
      number: values.number.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      postalCode: values.postalCode.trim(),
      country: values.country.trim(),
      description: sanitizeNullableString(values.description),
      userId: sanitizeNullableString(values.userId),
      supplierId: values.supplierId ?? null,
      carrierId: values.carrierId ?? null,
      isActive: values.isActive,
    };

    onSubmit(normalized);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ADDRESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type
                          .toLowerCase()
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (char) => char.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FieldInput
            control={form.control}
            name="userId"
            label="Usuario relacionado"
            placeholder="ID de usuario (opcional)"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor vinculado</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : null)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proveedor asociado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin proveedor</SelectItem>
                    {supplierOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Selecciona un proveedor si la dirección pertenece a uno.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="carrierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transportista vinculado</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : null)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin transportista asociado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin transportista</SelectItem>
                    {carrierOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Asigna la dirección a un transportista si corresponde.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FieldTextarea
          control={form.control}
          name="fullAddress"
          label="Dirección completa *"
          rows={2}
          placeholder="Ej: Parque Industrial, Bodega 12, Ciudad"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FieldInput
            control={form.control}
            name="street"
            label="Calle *"
            placeholder="Nombre de la calle"
          />
          <FieldInput
            control={form.control}
            name="number"
            label="Número *"
            placeholder="000"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FieldInput
            control={form.control}
            name="city"
            label="Ciudad *"
            placeholder="Ciudad"
          />
          <FieldInput
            control={form.control}
            name="state"
            label="Provincia *"
            placeholder="Provincia"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FieldInput
            control={form.control}
            name="postalCode"
            label="Código postal *"
            placeholder="0000"
          />
          <FieldInput
            control={form.control}
            name="country"
            label="País *"
            placeholder="Argentina"
          />
        </div>

        <FieldTextarea
          control={form.control}
          name="description"
          label="Descripción"
          rows={3}
          placeholder="Notas internas sobre la dirección"
        />

        <FieldSwitch
          control={form.control}
          name="isActive"
          label="Dirección activa"
          description="Desactiva la dirección para ocultarla temporalmente."
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
