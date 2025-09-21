"use client";

import { useEffect, useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Loader2 } from "lucide-react";

import { api } from "~/trpc/react";
import type {
	CreateSupplierInput,
	UpdateSupplierInput,
} from "~/schema/supplier";
import type { RouterOutputs } from "~/trpc/react";

type Supplier = RouterOutputs["suppliers"]["getAllSuppliers"][number];

interface SupplierModalProps {
	isOpen: boolean;
	onClose: () => void;
	supplier?: Supplier;
	onSuccess?: () => void;
}

interface FormData {
	name: string;
	description: string;
	image: string;
	phone: string;
	email: string;
	website: string;
	taxId: string;
	taxType: string;
	isActive: boolean;
}

export function SupplierModal({
	isOpen,
	onClose,
	supplier,
	onSuccess,
}: SupplierModalProps) {
	const isEdit = Boolean(supplier);
	const utils = api.useUtils();

	const [formData, setFormData] = useState<FormData>({
		name: "",
		description: "",
		image: "",
		phone: "",
		email: "",
		website: "",
		taxId: "",
		taxType: "",
		isActive: true,
	});

	const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
		{},
	);

	// Reset form when supplier changes or modal opens/closes
	useEffect(() => {
		if (isOpen) {
			if (supplier) {
				// Edit mode: populate form with existing data
				setFormData({
					name: supplier.name,
					description: supplier.description ?? "",
					image: supplier.image ?? "",
					phone: supplier.phone ?? "",
					email: supplier.email ?? "",
					website: supplier.website ?? "",
					taxId: supplier.taxId ?? "",
					taxType: supplier.taxType ?? "",
					isActive: supplier.isActive,
				});
			} else {
				// Create mode: reset to defaults
				setFormData({
					name: "",
					description: "",
					image: "",
					phone: "",
					email: "",
					website: "",
					taxId: "",
					taxType: "",
					isActive: true,
				});
			}
			setErrors({});
		}
	}, [isOpen, supplier]);

	const createMutation = api.suppliers.createSupplier.useMutation({
		onSuccess: () => {
			alert("Supplier created successfully!");
			utils.suppliers.getAllSuppliers.invalidate();
			onSuccess?.();
			onClose();
		},
		onError: (error) => {
			alert(error.message || "Failed to create supplier");
		},
	});

	const updateMutation = api.suppliers.updateSupplier.useMutation({
		onSuccess: () => {
			alert("Supplier updated successfully!");
			utils.suppliers.getAllSuppliers.invalidate();
			onSuccess?.();
			onClose();
		},
		onError: (error) => {
			alert(error.message || "Failed to update supplier");
		},
	});

	const isLoading = createMutation.isPending || updateMutation.isPending;

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof FormData, string>> = {};

		if (!formData.name.trim()) {
			newErrors.name = "Supplier name is required";
		} else if (formData.name.length > 255) {
			newErrors.name = "Supplier name must be less than 255 characters";
		}

		if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Please enter a valid email address";
		}

		if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
			newErrors.website = "Please enter a valid URL";
		}

		if (formData.image && !/^https?:\/\/.+/.test(formData.image)) {
			newErrors.image = "Please enter a valid URL";
		}

		if (formData.phone && !/^\+?[\d\s\-\(\)\.]{7,20}$/.test(formData.phone)) {
			newErrors.phone = "Please enter a valid phone number";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		// Convert empty strings to null for optional fields
		const processedData = {
			...formData,
			description: formData.description.trim() || null,
			image: formData.image.trim() || null,
			phone: formData.phone.trim() || null,
			email: formData.email.trim() || null,
			website: formData.website.trim() || null,
			taxId: formData.taxId.trim() || null,
			taxType: formData.taxType.trim() || null,
		};

		if (isEdit && supplier) {
			updateMutation.mutate({
				id: supplier.id,
				...processedData,
			} as UpdateSupplierInput);
		} else {
			createMutation.mutate(processedData as CreateSupplierInput);
		}
	};

	const handleClose = () => {
		if (!isLoading) {
			setFormData({
				name: "",
				description: "",
				image: "",
				phone: "",
				email: "",
				website: "",
				taxId: "",
				taxType: "",
				isActive: true,
			});
			setErrors({});
			onClose();
		}
	};

	const handleInputChange = (
		field: keyof FormData,
		value: string | boolean,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
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

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{/* Name */}
						<div className="space-y-2">
							<Label htmlFor="name">Name *</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => handleInputChange("name", e.target.value)}
								placeholder="Supplier name"
								className={errors.name ? "border-red-500" : ""}
							/>
							{errors.name && (
								<p className="text-red-500 text-sm">{errors.name}</p>
							)}
						</div>

						{/* Email */}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) => handleInputChange("email", e.target.value)}
								placeholder="contact@supplier.com"
								className={errors.email ? "border-red-500" : ""}
							/>
							{errors.email && (
								<p className="text-red-500 text-sm">{errors.email}</p>
							)}
						</div>

						{/* Phone */}
						<div className="space-y-2">
							<Label htmlFor="phone">Phone</Label>
							<Input
								id="phone"
								value={formData.phone}
								onChange={(e) => handleInputChange("phone", e.target.value)}
								placeholder="+54 11 1234-5678"
								className={errors.phone ? "border-red-500" : ""}
							/>
							{errors.phone && (
								<p className="text-red-500 text-sm">{errors.phone}</p>
							)}
						</div>

						{/* Website */}
						<div className="space-y-2">
							<Label htmlFor="website">Website</Label>
							<Input
								id="website"
								type="url"
								value={formData.website}
								onChange={(e) => handleInputChange("website", e.target.value)}
								placeholder="https://supplier.com"
								className={errors.website ? "border-red-500" : ""}
							/>
							{errors.website && (
								<p className="text-red-500 text-sm">{errors.website}</p>
							)}
						</div>

						{/* Tax ID */}
						<div className="space-y-2">
							<Label htmlFor="taxId">Tax ID</Label>
							<Input
								id="taxId"
								value={formData.taxId}
								onChange={(e) => handleInputChange("taxId", e.target.value)}
								placeholder="20-12345678-9"
							/>
						</div>

						{/* Tax Type */}
						<div className="space-y-2">
							<Label htmlFor="taxType">Tax Type</Label>
							<Input
								id="taxType"
								value={formData.taxType}
								onChange={(e) => handleInputChange("taxType", e.target.value)}
								placeholder="CUIT"
							/>
						</div>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => handleInputChange("description", e.target.value)}
							placeholder="Brief description of the supplier..."
							rows={3}
						/>
					</div>

					{/* Image URL */}
					<div className="space-y-2">
						<Label htmlFor="image">Image URL</Label>
						<Input
							id="image"
							type="url"
							value={formData.image}
							onChange={(e) => handleInputChange("image", e.target.value)}
							placeholder="https://example.com/image.jpg"
							className={errors.image ? "border-red-500" : ""}
						/>
						{errors.image && (
							<p className="text-red-500 text-sm">{errors.image}</p>
						)}
						<p className="text-muted-foreground text-sm">
							Optional image URL for the supplier logo or photo
						</p>
					</div>

					{/* Active Status */}
					<div className="flex flex-row items-center justify-between rounded-lg border p-4">
						<div className="space-y-0.5">
							<Label className="text-base">Active Status</Label>
							<p className="text-muted-foreground text-sm">
								Whether this supplier is currently active
							</p>
						</div>
						<Switch
							checked={formData.isActive}
							onCheckedChange={(checked) =>
								handleInputChange("isActive", checked)
							}
						/>
					</div>

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
			</DialogContent>
		</Dialog>
	);
}
