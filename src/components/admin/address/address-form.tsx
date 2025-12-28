"use client";

import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { api } from "~/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import { Form } from "~/ui/form";
import { FieldInput } from "~/components/form/form-input";
import { FieldTextarea } from "~/components/form/form-textarea";
import { FieldSwitch } from "~/components/form/form-switch";
import { UserSelector } from "./entity-selectors/UserSelector";
import { SupplierSelector } from "./entity-selectors/SupplierSelector";
import { CarrierSelector } from "./entity-selectors/CarrierSelector";
import {
  ADDRESS_TYPES,
  ADDRESS_TYPE_LABELS,
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
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";

interface AddressFormProps {
  defaultValues?: Partial<CreateAddressInput>;
  supplierOptions?: Array<{ id: number; name: string }>;
  carrierOptions?: Array<{ id: number; name: string }>;
  onSubmit: SubmitHandler<CreateAddressInput>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  hideRelations?: boolean;
  showStatusSwitch?: boolean;
}

const buildDefaultValues = (
  values?: Partial<CreateAddressInput>,
): CreateAddressInput => ({
  type: values?.type ?? ADDRESS_TYPES[0],
  fullAddress: values?.fullAddress ?? "",
  street: values?.street ?? "",
  number: values?.number ?? "",
  city: values?.city ?? "",
  state: values?.state ?? "Tierra del Fuego",
  postalCode: values?.postalCode ?? "",
  country: values?.country ?? "Argentina",
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
  hideRelations = false,
  showStatusSwitch = true,
}: AddressFormProps) {
  console.log("@AddressForm rendered", defaultValues);
  const [linkedEntityType, setLinkedEntityType] = useState<
    "user" | "supplier" | "carrier"
  >("user");

  const form = useForm({
    resolver: zodResolver(createAddressSchema),
    defaultValues: buildDefaultValues(defaultValues),
  });

  useEffect(() => {
    form.reset(buildDefaultValues(defaultValues));
    // Always default to "user"
    setLinkedEntityType("user");
  }, [defaultValues, form]);

  const handleEntityTypeChange = (type: "user" | "supplier" | "carrier") => {
    setLinkedEntityType(type);

    // Clear all entity fields
    form.setValue("userId", null);
    form.setValue("supplierId", null);
    form.setValue("carrierId", null);
  };

  const handleSubmit = form.handleSubmit((values: CreateAddressInput) => {
    const normalized: CreateAddressInput = {
      type: values.type,
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ADDRESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ADDRESS_TYPE_LABELS[type] ?? type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {!hideRelations && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Vincular dirección a:</Label>
                <RadioGroup
                  value={linkedEntityType}
                  onValueChange={(value) =>
                    handleEntityTypeChange(
                      value as "user" | "supplier" | "carrier",
                    )
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="entity-user" />
                    <Label
                      htmlFor="entity-user"
                      className="cursor-pointer font-normal"
                    >
                      Usuario
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="supplier" id="entity-supplier" />
                    <Label
                      htmlFor="entity-supplier"
                      className="cursor-pointer font-normal"
                    >
                      Proveedor
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="carrier" id="entity-carrier" />
                    <Label
                      htmlFor="entity-carrier"
                      className="cursor-pointer font-normal"
                    >
                      Transportista
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {linkedEntityType === "user" && (
                <UserSelector control={form.control} name="userId" />
              )}
              {linkedEntityType === "supplier" && (
                <SupplierSelector control={form.control} name="supplierId" />
              )}
              {linkedEntityType === "carrier" && (
                <CarrierSelector control={form.control} name="carrierId" />
              )}
            </div>
          )}
        </div>

        {/* {!hideRelations ? (
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor vinculado</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : "-"}
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
                    value={field.value ? String(field.value) : "-"}
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
        ) : null} */}

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
            placeholder="Tierra del Fuego"
            disabled
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
            disabled
          />
        </div>

        <FieldTextarea
          control={form.control}
          name="description"
          label="Descripción"
          rows={3}
          placeholder="Notas internas sobre la dirección"
        />

        {showStatusSwitch ? (
          <FieldSwitch
            control={form.control}
            name="isActive"
            label="Dirección activa"
            description="Desactiva la dirección para ocultarla temporalmente."
          />
        ) : null}

        <DialogFooter className="flex items-center gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
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
