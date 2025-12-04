"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useForm,
  type DefaultValues,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "~/components/ui/button";
import {
  DialogFooter,
} from "~/components/ui/dialog";
import { Form } from "~/ui/form";
import { FieldInput } from "~/components/form/form-input";
import { FieldTextarea } from "~/components/form/form-textarea";
import { FieldSwitch } from "~/components/form/form-switch";
import {
  createCategorySchema,
  type CreateCategoryInput,
} from "~/schema/category";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";

interface CategoryFormProps {
  defaultValues?: Partial<CreateCategoryInput>;
  onSubmit: SubmitHandler<CreateCategoryInput>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
}

const buildDefaultValues = (
  values?: Partial<CreateCategoryInput>,
): DefaultValues<CreateCategoryInput> => ({
  name: values?.name ?? "",
  description: values?.description ?? null,
  image: values?.image ?? null,
  tags: values?.tags ?? [],
  isActive: values?.isActive ?? true,
});

const tagsToTextarea = (tags?: string[] | null) =>
  (tags ?? []).join(", ");

const textareaToTags = (value: string) =>
  value
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index);

export function CategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Guardar categoría",
  cancelLabel = "Cancelar",
  isSubmitting = false,
}: CategoryFormProps) {
  const [tagsText, setTagsText] = useState(tagsToTextarea(defaultValues?.tags));

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: useMemo(() => buildDefaultValues(defaultValues), [defaultValues]),
  });

  useEffect(() => {
    const defaults = buildDefaultValues(defaultValues);
    form.reset(defaults);
    setTagsText(tagsToTextarea(defaults.tags));
  }, [defaultValues, form]);

  useEffect(() => {
    form.setValue("tags", textareaToTags(tagsText), { shouldDirty: true });
  }, [form, tagsText]);

  const handleSubmit = form.handleSubmit((values) => {
    const normalizeNullable = (value?: string | null) => {
      if (value === null || value === undefined) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const normalized: CreateCategoryInput = {
      ...values,
      description: normalizeNullable(values.description),
      image: normalizeNullable(values.image),
      tags: textareaToTags(tagsText),
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
            placeholder="Nombre de la categoría"
          />

          <FieldInput
            control={form.control}
            name="image"
            label="Imagen"
            placeholder="https://..."
          />
        </div>

        <FieldTextarea
          control={form.control}
          name="description"
          label="Descripción"
          rows={3}
          placeholder="Describe brevemente la categoría"
        />

        <div className="space-y-2">
          <Label htmlFor="category-tags">Tags</Label>
          <Textarea
            id="category-tags"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            placeholder="separa los tags por coma o salto de línea"
            rows={3}
          />
          <p className="text-muted-foreground text-sm">
            Estos tags ayudan a clasificar los productos dentro de la categoría.
          </p>
        </div>

        <FieldSwitch
          control={form.control}
          name="isActive"
          label="Categoría activa"
          description="Las categorías inactivas no se mostrarán en los listados."
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
