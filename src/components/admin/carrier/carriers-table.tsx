"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Edit,
  ExternalLink,
  Mail,
  Phone,
  Plus,
  Truck,
  Trash,
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/components/ui/avatar";
import {
  AppTable,
  type ColumnConfig,
} from "~/components/ui/app-table";
import { Badge } from "~/components/ui/badge";
import { useConfirm } from "~/components/ui/confirm";
import { CarrierForm } from "./carrier-form";
import { api } from "~/trpc/react";

type CarrierRecord = RouterOutputs["carriers"]["getAllCarriers"][number];

interface CarriersTableProps {
  carriers: CarrierRecord[];
  isLoading?: boolean;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

export function CarriersTable({
  carriers,
  isLoading = false,
}: CarriersTableProps) {
  const confirm = useConfirm();
  const utils = api.useUtils();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<CarrierRecord | null>(
    null,
  );

  const createMutation = api.carriers.createCarrier.useMutation({
    async onSuccess() {
      await utils.carriers.getAllCarriers.invalidate();
      setIsModalOpen(false);
    },
  });

  const updateMutation = api.carriers.updateCarrier.useMutation({
    async onSuccess() {
      await utils.carriers.getAllCarriers.invalidate();
      setIsModalOpen(false);
      setEditingCarrier(null);
    },
  });

  const deleteMutation = api.carriers.deleteCarrier.useMutation({
    async onSuccess() {
      await utils.carriers.getAllCarriers.invalidate();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleCreate = () => {
    setEditingCarrier(null);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((carrier: CarrierRecord) => {
    setEditingCarrier(carrier);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (carrier: CarrierRecord) => {
      const result = await confirm({
        title: "Eliminar transportista",
        description: `¿Seguro que deseas eliminar "${carrier.name}"?`,
        confirmationText: "Eliminar",
        cancellationText: "Cancelar",
      });

      if (!result.confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id: carrier.id });
      } catch (error) {
        console.error("Error deleting carrier", error);
      }
    },
    [confirm, deleteMutation],
  );

  const handleModalClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingCarrier(null);
  };

  const columns = useMemo<ColumnConfig<CarrierRecord>[]>(() => {
    return [
      {
        key: "carrier",
        title: "Transportista",
        type: "custom",
        render: (carrier) => (
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={carrier.image ?? undefined} alt={carrier.name} />
              <AvatarFallback>{getInitials(carrier.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{carrier.name}</div>
              {carrier.description ? (
                <p className="text-muted-foreground text-sm">
                  {carrier.description}
                </p>
              ) : null}
              <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                <Truck className="h-3.5 w-3.5" />
                <span>
                  {carrier._count?.shipments ?? 0} envíos •{" "}
                  {carrier._count?.addresses ?? 0} direcciones
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "contact",
        title: "Contacto",
        type: "custom",
        render: (carrier) => (
          <div className="space-y-1 text-sm">
            {carrier.email ? (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{carrier.email}</span>
              </div>
            ) : null}
            {carrier.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{carrier.phone}</span>
              </div>
            ) : null}
            {carrier.website ? (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <a
                  href={carrier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Sitio web
                </a>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "tax",
        title: "Datos fiscales",
        type: "custom",
        render: (carrier) => (
          carrier.taxId && carrier.taxType ? (
            <div className="space-y-1 text-sm">
              <div className="font-medium">{carrier.taxType}</div>
              <div className="text-muted-foreground">{carrier.taxId}</div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Sin datos</span>
          )
        ),
      },
      {
        key: "status",
        title: "Estado",
        type: "custom",
        render: (carrier) => (
          <Badge variant={carrier.isActive ? "secondary" : "outline"}>
            {carrier.isActive ? "Activo" : "Inactivo"}
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
            onClick: (carrier) => handleEdit(carrier),
            label: "Editar",
            icon: <Edit className="h-4 w-4" />,
          },
          delete: {
            onClick: (carrier) => handleDelete(carrier),
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
        Aún no hay transportistas registrados.
      </p>
      <Button variant="outline" onClick={handleCreate}>
        Crear el primer transportista
      </Button>
    </div>
  );

  const modalDefaultValues = editingCarrier
    ? {
        name: editingCarrier.name,
        description: editingCarrier.description ?? null,
        image: editingCarrier.image ?? null,
        email: editingCarrier.email ?? null,
        phone: editingCarrier.phone ?? null,
        website: editingCarrier.website ?? null,
        taxId: editingCarrier.taxId ?? null,
        taxType: editingCarrier.taxType ?? null,
        isActive: editingCarrier.isActive,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            Transportistas ({carriers.length})
          </h3>
          <p className="text-muted-foreground text-sm">
            Administra las empresas de transporte disponibles para tus envíos.
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo transportista
        </Button>
      </div>

      <Card className="overflow-hidden">
        <AppTable
          columns={columns}
          data={carriers}
          loading={isLoading}
          emptyState={emptyState}
          emptyMessage="No hay transportistas disponibles"
        />
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => (open ? setIsModalOpen(true) : handleModalClose())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCarrier ? "Editar transportista" : "Crear transportista"}
            </DialogTitle>
            <DialogDescription>
              Completa los datos del transportista.
            </DialogDescription>
          </DialogHeader>

          <CarrierForm
            defaultValues={modalDefaultValues}
            onSubmit={async (formValues) => {
              try {
                if (editingCarrier) {
                  await updateMutation.mutateAsync({
                    id: editingCarrier.id,
                    ...formValues,
                  });
                } else {
                  await createMutation.mutateAsync(formValues);
                }
              } catch (error) {
                console.error("Error saving carrier", error);
              }
            }}
            onCancel={handleModalClose}
            isSubmitting={isSubmitting}
            submitLabel={editingCarrier ? "Guardar cambios" : "Crear transportista"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
