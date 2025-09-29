"use client";

import * as React from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface FormRadioGroupProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  description?: string;
  options: RadioOption[];
  disabled?: boolean;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function FormRadioGroup<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  options,
  disabled = false,
  className,
  orientation = "vertical",
}: FormRadioGroupProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  return (
    <FormItem className={className}>
      {label && <FormLabel>{label}</FormLabel>}
      <FormControl>
        <RadioGroup
          onValueChange={field.onChange}
          value={field.value}
          className={
            orientation === "horizontal" ? "flex flex-row" : "flex flex-col"
          }
          disabled={disabled}
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`${name}-${option.value}`}
                disabled={disabled || option.disabled}
              />
              <Label
                htmlFor={`${name}-${option.value}`}
                className={
                  disabled || option.disabled ? "text-muted-foreground" : ""
                }
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}
