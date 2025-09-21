"use client";

import { useState } from "react";
import { ExternalLink, Mail, Phone, Package, Plus, Edit } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { SupplierModal } from "~/components/admin/supplier-modal";

type Supplier = RouterOutputs["suppliers"]["getAllSuppliers"][number];

interface SuppliersTableProps {
	suppliers: Supplier[];
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedSupplier, setSelectedSupplier] = useState<
		Supplier | undefined
	>(undefined);

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase())
			.join("")
			.substring(0, 2);
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("es-AR", {
			year: "numeric",
			month: "short",
			day: "numeric",
		}).format(new Date(date));
	};

	const handleCreateSupplier = () => {
		setSelectedSupplier(undefined);
		setModalOpen(true);
	};

	const handleEditSupplier = (supplier: Supplier) => {
		setSelectedSupplier(supplier);
		setModalOpen(true);
	};

	const handleModalClose = () => {
		setModalOpen(false);
		setSelectedSupplier(undefined);
	};

	if (suppliers.length === 0) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-lg">Proveedores</h3>
					<Button
						onClick={handleCreateSupplier}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Agregar Proveedor
					</Button>
				</div>
				<div className="rounded-md border border-dashed p-8 text-center">
					<Package className="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 className="mt-4 font-semibold text-lg">
						No se encontraron proveedores
					</h3>
					<p className="text-muted-foreground">
						Comienza agregando tu primer proveedor.
					</p>
				</div>
				<SupplierModal
					isOpen={modalOpen}
					onClose={handleModalClose}
					supplier={selectedSupplier}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-lg">
					Proveedores ({suppliers.length})
				</h3>
				<Button
					onClick={handleCreateSupplier}
					className="flex items-center gap-2"
				>
					<Plus className="h-4 w-4" />
					Agregar Proveedor
				</Button>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Proveedor</TableHead>
							<TableHead>Contacto</TableHead>
							<TableHead>Tax Info</TableHead>
							<TableHead>Productos</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Creado</TableHead>
							<TableHead className="w-[100px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{suppliers.map((supplier) => (
							<TableRow key={supplier.id}>
								<TableCell>
									<div className="flex items-center space-x-3">
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={supplier.image ?? undefined}
												alt={supplier.name}
											/>
											<AvatarFallback className="text-xs">
												{getInitials(supplier.name)}
											</AvatarFallback>
										</Avatar>
										<div>
											<div className="font-medium">{supplier.name}</div>
											{supplier.description && (
												<div className="line-clamp-1 text-muted-foreground text-sm">
													{supplier.description}
												</div>
											)}
										</div>
									</div>
								</TableCell>
								<TableCell>
									<div className="space-y-1">
										{supplier.email && (
											<div className="flex items-center space-x-2 text-sm">
												<Mail className="h-3 w-3 text-muted-foreground" />
												<span className="text-muted-foreground">
													{supplier.email}
												</span>
											</div>
										)}
										{supplier.phone && (
											<div className="flex items-center space-x-2 text-sm">
												<Phone className="h-3 w-3 text-muted-foreground" />
												<span className="text-muted-foreground">
													{supplier.phone}
												</span>
											</div>
										)}
										{supplier.website && (
											<div className="flex items-center space-x-2 text-sm">
												<ExternalLink className="h-3 w-3 text-muted-foreground" />
												<a
													href={supplier.website}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:text-blue-800 hover:underline"
												>
													Website
												</a>
											</div>
										)}
									</div>
								</TableCell>
								<TableCell>
									{supplier.taxId && supplier.taxType ? (
										<div className="text-sm">
											<div className="font-medium">{supplier.taxType}</div>
											<div className="text-muted-foreground">
												{supplier.taxId}
											</div>
										</div>
									) : (
										<span className="text-muted-foreground text-sm">N/A</span>
									)}
								</TableCell>
								<TableCell>
									<div className="text-sm">
										<span className="font-medium">
											{supplier._count.products}
										</span>
										<span className="text-muted-foreground"> products</span>
									</div>
									{supplier._count.addresses > 0 && (
										<div className="text-muted-foreground text-xs">
											{supplier._count.addresses} addresses
										</div>
									)}
								</TableCell>
								<TableCell>
									<Badge variant={supplier.isActive ? "default" : "secondary"}>
										{supplier.isActive ? "Active" : "Inactive"}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="text-muted-foreground text-sm">
										{formatDate(supplier.createdAt)}
									</div>
								</TableCell>
								<TableCell>
									<div className="flex items-center space-x-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleEditSupplier(supplier)}
											className="flex items-center gap-1"
										>
											<Edit className="h-3 w-3" />
											Edit
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<SupplierModal
				isOpen={modalOpen}
				onClose={handleModalClose}
				supplier={selectedSupplier}
			/>
		</div>
	);
}
