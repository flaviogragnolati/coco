"use client";

import * as React from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Switch } from "~/components/ui/switch";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

export interface FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function FormSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  disabled = false,
  className,
}: FormSwitchProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  return (
    <FormItem
      className={`flex flex-row items-center justify-between rounded-lg border p-4 ${className}`}
    >
      <div className="space-y-0.5">
        {label && <FormLabel className="text-base">{label}</FormLabel>}
        {description && <FormDescription>{description}</FormDescription>}
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
          disabled={disabled}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

import { FormField } from "~/components/ui/form";
export function FieldSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  disabled = false,
  className,
}: FormSwitchProps<TFieldValues, TName>) {
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem
          className={`flex flex-row items-center justify-between rounded-lg border p-4 ${className}`}
        >
          <div className="space-y-0.5">
            {label && <FormLabel className="text-base">{label}</FormLabel>}
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
