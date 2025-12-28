"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { FormInput, FormTextarea, FormSwitch } from "~/components/form";
import { Loader2 } from "lucide-react";

import { api } from "~/trpc/react";
import {
  createSupplierSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from "~/schema/supplier";
import type { RouterOutputs } from "~/trpc/react";
import { Form } from "~/ui/form";
import { FieldInput } from "../form/form-input";
import { FieldSwitch } from "../form/form-switch";
import { FieldTextarea } from "../form/form-textarea";
import { showToast } from "~/utils/show-toast";

type Supplier = RouterOutputs["suppliers"]["getAllSuppliers"][number];

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier;
  onSuccess?: () => void;
}

export function SupplierModal({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}: SupplierModalProps) {
  const isEdit = Boolean(supplier);
  const utils = api.useUtils();

  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: "",
      description: null,
      image: null,
      phone: null,
      email: null,
      website: null,
      taxId: null,
      taxType: null,
      isActive: true,
    },
  });

  // Reset form when supplier changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        // Edit mode: populate form with existing data
        form.reset({
          name: supplier.name,
          description: supplier.description,
          image: supplier.image,
          phone: supplier.phone,
          email: supplier.email,
          website: supplier.website,
          taxId: supplier.taxId,
          taxType: supplier.taxType,
          isActive: supplier.isActive,
        });
      } else {
        // Create mode: reset to defaults
        form.reset({
          name: "",
          description: null,
          image: null,
          phone: null,
          email: null,
          website: null,
          taxId: null,
          taxType: null,
          isActive: true,
        });
      }
    }
  }, [isOpen, supplier, form]);

  const createMutation = api.suppliers.createSupplier.useMutation({
    onSuccess: async () => {
      showToast("success", "Supplier created successfully!");
      await utils.suppliers.getAllSuppliers.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      showToast("error", error.message || "Failed to create supplier");
    },
  });

  const updateMutation = api.suppliers.updateSupplier.useMutation({
    onSuccess: async () => {
      showToast("success", "Supplier updated successfully!");
      await utils.suppliers.getAllSuppliers.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      showToast("error", error.message || "Failed to update supplier");
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: CreateSupplierInput) => {
    // Convert empty strings to null for optional fields
    const processedData: CreateSupplierInput = {
      name: data.name,
      description: data.description?.trim() || null,
      image: data.image?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      website: data.website?.trim() || null,
      taxId: data.taxId?.trim() || null,
      taxType: data.taxType?.trim() || null,
      isActive: data.isActive,
    };

    if (isEdit && supplier) {
      updateMutation.mutate({
        id: supplier.id,
        ...processedData,
      } as UpdateSupplierInput);
    } else {
      createMutation.mutate(processedData);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Supplier" : "Create New Supplier"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the supplier information below."
              : "Fill in the details to create a new supplier."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Name */}
              <FieldInput
                control={form.control}
                name="name"
                label="Name *"
                placeholder="Supplier name"
              />

              {/* Email */}
              <FieldInput
                control={form.control}
                name="email"
                label="Email"
                type="email"
                placeholder="contact@supplier.com"
              />

              {/* Phone */}
              <FieldInput
                control={form.control}
                name="phone"
                label="Phone"
                placeholder="+54 11 1234-5678"
              />

              {/* Website */}
              <FieldInput
                control={form.control}
                name="website"
                label="Website"
                type="url"
                placeholder="https://supplier.com"
              />

              {/* Tax ID */}
              <FieldInput
                control={form.control}
                name="taxId"
                label="Tax ID"
                placeholder="20-12345678-9"
              />

              {/* Tax Type */}
              <FieldInput
                control={form.control}
                name="taxType"
                label="Tax Type"
                placeholder="CUIT"
              />
            </div>

            {/* Description */}
            <FieldTextarea
              control={form.control}
              name="description"
              label="Description"
              placeholder="Brief description of the supplier..."
              rows={3}
            />

            {/* Image URL */}
            <FieldInput
              control={form.control}
              name="image"
              label="Image URL"
              type="url"
              placeholder="https://example.com/image.jpg"
              description="Optional image URL for the supplier logo or photo"
            />

            {/* Active Status */}
            <FieldSwitch
              control={form.control}
              name="isActive"
              label="Active Status"
              description="Whether this supplier is currently active"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update Supplier" : "Create Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
