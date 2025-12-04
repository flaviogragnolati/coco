"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Building2,
  MapPin,
  Plus,
  Trash,
  User,
  Truck,
  Edit,
} from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AppTable,
  type ColumnConfig,
} from "~/components/ui/app-table";
import { Badge } from "~/components/ui/badge";
import { useConfirm } from "~/components/ui/confirm";
import { AddressForm } from "./address-form";
import { api } from "~/trpc/react";
import {
  ADDRESS_TYPES,
} from "~/schema/address";

type AddressRecord = RouterOutputs["addresses"]["getAllAddresses"][number];

interface AddressesTableProps {
  addresses: AddressRecord[];
  suppliers: Array<{ id: number; name: string }>;
  carriers: Array<{ id: number; name: string }>;
  isLoading?: boolean;
}

const formatType = (type: (typeof ADDRESS_TYPES)[number]) =>
  type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function AddressesTable({
  addresses,
  suppliers,
  carriers,
  isLoading = false,
}: AddressesTableProps) {
  const confirm = useConfirm();
  const utils = api.useUtils();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(
    null,
  );

  const createMutation = api.addresses.createAddress.useMutation({
    async onSuccess() {
      await utils.addresses.getAllAddresses.invalidate();
      setIsModalOpen(false);
    },
  });

  const updateMutation = api.addresses.updateAddress.useMutation({
    async onSuccess() {
      await utils.addresses.getAllAddresses.invalidate();
      setIsModalOpen(false);
      setEditingAddress(null);
    },
  });

  const deleteMutation = api.addresses.deleteAddress.useMutation({
    async onSuccess() {
      await utils.addresses.getAllAddresses.invalidate();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleCreate = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((address: AddressRecord) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (address: AddressRecord) => {
      const result = await confirm({
        title: "Eliminar dirección",
        description: `¿Seguro que deseas eliminar la dirección "${address.fullAddress}"?`,
        confirmationText: "Eliminar",
        cancellationText: "Cancelar",
      });

      if (!result.confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id: address.id });
      } catch (error) {
        console.error("Error deleting address", error);
      }
    },
    [confirm, deleteMutation],
  );

  const handleModalClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  const columns = useMemo<ColumnConfig<AddressRecord>[]>(() => {
    return [
      {
        key: "address",
        title: "Dirección",
        type: "custom",
        render: (address) => (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{formatType(address.type)}</Badge>
              <span className="font-medium">{address.fullAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {address.street} {address.number} • {address.city},{" "}
                {address.state} ({address.postalCode}) - {address.country}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "relations",
        title: "Relaciones",
        type: "custom",
        render: (address) => (
          <div className="space-y-1 text-sm">
            {address.supplier ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {address.supplier.name}
                </span>
              </div>
            ) : null}
            {address.carrier ? (
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {address.carrier.name}
                </span>
              </div>
            ) : null}
            {address.user ? (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {address.user.name ?? address.user.id}
                </span>
              </div>
            ) : null}
            {!address.supplier && !address.carrier && !address.user ? (
              <span className="text-muted-foreground text-sm">
                Sin entidades asociadas
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: "status",
        title: "Estado",
        type: "custom",
        render: (address) => (
          <Badge variant={address.isActive ? "secondary" : "outline"}>
            {address.isActive ? "Activa" : "Inactiva"}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        title: "Actualizado",
        type: "date",
        dataKey: "updatedAt",
        dateFormat: "DD/MM/YYYY",
      },
      {
        key: "actions",
        title: "Acciones",
        type: "actions",
        actions: {
          layout: "inline",
          edit: {
            onClick: (address) => handleEdit(address),
            label: "Editar",
            icon: <Edit className="h-4 w-4" />,
          },
          delete: {
            onClick: (address) => handleDelete(address),
            label: "Eliminar",
            icon: <Trash className="h-4 w-4" />,
          },
        },
      },
    ];
  }, [handleDelete, handleEdit]);

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="text-muted-foreground">
        Aún no hay direcciones registradas.
      </p>
      <Button variant="outline" onClick={handleCreate}>
        Crear la primera dirección
      </Button>
    </div>
  );

  const modalDefaultValues = editingAddress
    ? {
        type: editingAddress.type,
        fullAddress: editingAddress.fullAddress,
        street: editingAddress.street,
        number: editingAddress.number,
        city: editingAddress.city,
        state: editingAddress.state,
        postalCode: editingAddress.postalCode,
        country: editingAddress.country,
        description: editingAddress.description ?? null,
        userId: editingAddress.user?.id ?? editingAddress.userId ?? null,
        supplierId: editingAddress.supplier?.id ?? editingAddress.supplierId ?? null,
        carrierId: editingAddress.carrier?.id ?? editingAddress.carrierId ?? null,
        isActive: editingAddress.isActive,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            Direcciones ({addresses.length})
          </h3>
          <p className="text-muted-foreground text-sm">
            Gestiona las direcciones vinculadas a proveedores, transportistas y usuarios.
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva dirección
        </Button>
      </div>

      <Card className="overflow-hidden">
        <AppTable
          columns={columns}
          data={addresses}
          loading={isLoading}
          emptyState={emptyState}
          emptyMessage="No hay direcciones disponibles"
        />
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => (open ? setIsModalOpen(true) : handleModalClose())}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Editar dirección" : "Crear dirección"}
            </DialogTitle>
            <DialogDescription>
              Completa los datos de la dirección.
            </DialogDescription>
          </DialogHeader>

          <AddressForm
            defaultValues={modalDefaultValues}
            supplierOptions={suppliers}
            carrierOptions={carriers}
            onSubmit={async (formValues) => {
              try {
                if (editingAddress) {
                  await updateMutation.mutateAsync({
                    id: editingAddress.id,
                    ...formValues,
                  });
                } else {
                  await createMutation.mutateAsync(formValues);
                }
              } catch (error) {
                console.error("Error saving address", error);
              }
            }}
            onCancel={handleModalClose}
            isSubmitting={isSubmitting}
            submitLabel={editingAddress ? "Guardar cambios" : "Crear dirección"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
