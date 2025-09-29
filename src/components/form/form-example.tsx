"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import {
  FormCheckbox,
  FormDatePicker,
  FormInput,
  FormRadioGroup,
  FormSelect,
  FormSwitch,
  FormTextarea,
  FormCombobox,
} from "~/components/form";

// Example schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  birthDate: z.date().optional(),
  gender: z.string().min(1, "Please select a gender"),
  country: z.string().min(1, "Please select a country"),
  city: z.string().min(1, "Please select a city"),
  bio: z.string().optional(),
  notifications: z.boolean(),
  newsletter: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

// Example options
const genderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const countryOptions = [
  { label: "United States", value: "us" },
  { label: "Canada", value: "ca" },
  { label: "United Kingdom", value: "uk" },
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
];

const cityOptions = [
  { label: "New York", value: "ny" },
  { label: "Los Angeles", value: "la" },
  { label: "Toronto", value: "to" },
  { label: "London", value: "ln" },
  { label: "Berlin", value: "br" },
  { label: "Paris", value: "pr" },
];

export function FormExample() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      birthDate: undefined,
      gender: "",
      country: "",
      city: "",
      bio: "",
      notifications: false,
      newsletter: false,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Form Data:", data);
    // Handle form submission here
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Form Components Example</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormInput
            name="name"
            control={form.control}
            label="Full Name"
            placeholder="Enter your full name"
            description="This will be displayed on your profile."
          />

          <FormInput
            name="email"
            control={form.control}
            label="Email"
            type="email"
            placeholder="Enter your email"
            description="We'll never share your email with anyone else."
          />

          <FormDatePicker
            name="birthDate"
            control={form.control}
            label="Date of Birth"
            placeholder="Pick your birth date"
            description="Your age will be calculated from this date."
          />

          <FormRadioGroup
            name="gender"
            control={form.control}
            label="Gender"
            options={genderOptions}
            description="Please select your gender."
          />

          <FormSelect
            name="country"
            control={form.control}
            label="Country"
            placeholder="Select your country"
            options={countryOptions}
            description="Select the country where you reside."
          />

          <FormCombobox
            name="city"
            control={form.control}
            label="City"
            placeholder="Select your city"
            searchPlaceholder="Search cities..."
            options={cityOptions}
            description="Select the city where you live."
          />

          <FormTextarea
            name="bio"
            control={form.control}
            label="Bio"
            placeholder="Tell us a little about yourself"
            rows={4}
            description="Write a short bio about yourself."
          />

          <FormSwitch
            name="notifications"
            control={form.control}
            label="Enable Notifications"
            description="Receive notifications about important updates."
          />

          <FormCheckbox
            name="newsletter"
            control={form.control}
            label="Subscribe to newsletter"
            description="Get weekly updates about new features and content."
          />

          <div className="flex gap-4">
            <Button type="submit">Submit</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
