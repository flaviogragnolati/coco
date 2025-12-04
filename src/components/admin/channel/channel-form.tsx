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
import {
  CHANNEL_TYPES,
  createChannelSchema,
  type CreateChannelInput,
} from "~/schema/channel";
import {
  FormControl,
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

interface ChannelFormProps {
  defaultValues?: Partial<CreateChannelInput>;
  onSubmit: SubmitHandler<CreateChannelInput>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
}

const buildDefaultValues = (
  values?: Partial<CreateChannelInput>,
): DefaultValues<CreateChannelInput> => ({
  type: values?.type ?? CHANNEL_TYPES[0],
  name: values?.name ?? "",
  description: values?.description ?? null,
  token: values?.token ?? "",
});

const sanitizeNullable = (value?: string | null) => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function ChannelForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Guardar canal",
  cancelLabel = "Cancelar",
  isSubmitting = false,
}: ChannelFormProps) {
  const form = useForm<CreateChannelInput>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: useMemo(() => buildDefaultValues(defaultValues), [defaultValues]),
  });

  useEffect(() => {
    form.reset(buildDefaultValues(defaultValues));
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit((values) => {
    const normalized: CreateChannelInput = {
      type: values.type,
      name: values.name.trim(),
      description: sanitizeNullable(values.description),
      token: values.token.trim(),
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
                    {CHANNEL_TYPES.map((type) => (
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
            name="name"
            label="Nombre *"
            placeholder="Nombre del canal"
          />
        </div>

        <FieldTextarea
          control={form.control}
          name="description"
          label="Descripción"
          rows={3}
          placeholder="Describe el uso del canal (opcional)"
        />

        <FieldTextarea
          control={form.control}
          name="token"
          label="Token / Credenciales *"
          rows={3}
          placeholder="Token de autenticación o credenciales necesarias"
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
