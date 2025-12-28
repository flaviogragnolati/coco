"use client";

import { useState } from "react";
import {
  ExternalLink,
  Mail,
  Phone,
  Package,
  Plus,
  Edit,
  Trash,
  Loader2,
} from "lucide-react";

import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { AppTable, type ColumnConfig } from "~/components/ui/app-table";
import { SupplierModal } from "~/components/admin/supplier-modal";
import { useConfirm } from "~/ui/confirm";
import { showToast } from "~/utils/show-toast";

type Supplier = RouterOutputs["suppliers"]["getAllSuppliers"][number];

interface SuppliersTableProps {
  suppliers: Supplier[];
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<
    Supplier | undefined
  >(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const confirm = useConfirm();
  const utils = api.useUtils();

  const deleteMutation = api.suppliers.deleteSupplier.useMutation({
    async onSuccess() {
      showToast("success", "Proveedor eliminado exitosamente");
      await utils.suppliers.getAllSuppliers.invalidate();
      setDeletingId(null);
    },
    onError(error) {
      showToast("error", `Error al eliminar el proveedor: ${error.message}`);
      setDeletingId(null);
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .substring(0, 2);
  };

  const handleCreateSupplier = () => {
    setSelectedSupplier(undefined);
    setModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const supplier = suppliers.find((s) => s.id === id);
    const result = await confirm({
      title: "Eliminar proveedor",
      description: `¿Estás seguro de que deseas eliminar el proveedor "${supplier?.name}"?`,
      confirmationText: "Eliminar",
      cancellationText: "Cancelar",
    });

    if (!result.confirmed) return;

    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync({ id });
    } catch (error) {
      showToast("error", "Error deleting supplier");
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedSupplier(undefined);
  };

  const columns: ColumnConfig<Supplier>[] = [
    {
      key: "supplier",
      title: "Proveedor",
      type: "custom",
      render: (supplier) => (
        <div className="flex items-center gap-3">
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
      ),
    },
    {
      key: "contact",
      title: "Contacto",
      type: "custom",
      render: (supplier) => (
        <div className="space-y-1">
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{supplier.email}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{supplier.phone}</span>
            </div>
          )}
          {supplier.website && (
            <div className="flex items-center gap-2 text-sm">
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
      ),
    },
    {
      key: "taxInfo",
      title: "Tax Info",
      type: "custom",
      render: (supplier) =>
        supplier.taxId && supplier.taxType ? (
          <div className="text-sm">
            <div className="font-medium">{supplier.taxType}</div>
            <div className="text-muted-foreground">{supplier.taxId}</div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        ),
    },
    {
      key: "products",
      title: "Productos",
      type: "custom",
      render: (supplier) => (
        <div className="text-sm">
          <span className="font-medium">{supplier._count.products}</span>
          <span className="text-muted-foreground"> products</span>
          {supplier._count.addresses > 0 && (
            <div className="text-muted-foreground text-xs">
              {supplier._count.addresses} addresses
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Estado",
      type: "boolean",
      dataKey: "isActive",
      labels: {
        true: "Active",
        false: "Inactive",
      },
      asBadge: true,
    },
    {
      key: "createdAt",
      title: "Creado",
      type: "text",
      dataKey: "createdAt",
      transform: (value) => {
        if (!value) return "-";

        return new Intl.DateTimeFormat("es-AR", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date(value as string | number | Date));
      },
    },
    {
      key: "actions",
      title: "Acciones",
      width: "160px",
      type: "custom",
      render: (supplier) => {
        const isDeleting = deletingId === supplier.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSupplier(supplier)}
              disabled={isDeleting}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(supplier.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash className="h-3 w-3" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  const emptyState = (
    <div className="mx-auto max-w-md rounded-md border border-dashed p-8 text-center">
      <Package className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 font-semibold text-lg">
        No se encontraron proveedores
      </h3>
      <p className="text-muted-foreground">
        Comienza agregando tu primer proveedor.
      </p>
    </div>
  );

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
        <AppTable
          columns={columns}
          data={suppliers}
          emptyState={emptyState}
          emptyMessage="No se encontraron proveedores"
        />
      </div>
      <SupplierModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        supplier={selectedSupplier}
      />
    </div>
  );
}
