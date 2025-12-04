"use client";

import { useCallback, useMemo, useState } from "react";
import { Bell, KeyRound, Plus, Trash, Edit } from "lucide-react";

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
import { ChannelForm } from "./channel-form";
import { api } from "~/trpc/react";
import { CHANNEL_TYPES } from "~/schema/channel";

type ChannelRecord = RouterOutputs["channels"]["getAllChannels"][number];

interface ChannelsTableProps {
  channels: ChannelRecord[];
  isLoading?: boolean;
}

const formatChannelType = (type: (typeof CHANNEL_TYPES)[number]) =>
  type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function ChannelsTable({
  channels,
  isLoading = false,
}: ChannelsTableProps) {
  const confirm = useConfirm();
  const utils = api.useUtils();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelRecord | null>(
    null,
  );

  const createMutation = api.channels.createChannel.useMutation({
    async onSuccess() {
      await utils.channels.getAllChannels.invalidate();
      setIsModalOpen(false);
    },
  });

  const updateMutation = api.channels.updateChannel.useMutation({
    async onSuccess() {
      await utils.channels.getAllChannels.invalidate();
      setIsModalOpen(false);
      setEditingChannel(null);
    },
  });

  const deleteMutation = api.channels.deleteChannel.useMutation({
    async onSuccess() {
      await utils.channels.getAllChannels.invalidate();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleCreate = () => {
    setEditingChannel(null);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((channel: ChannelRecord) => {
    setEditingChannel(channel);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (channel: ChannelRecord) => {
      const result = await confirm({
        title: "Eliminar canal",
        description: `¿Seguro que deseas eliminar el canal "${channel.name}"?`,
        confirmationText: "Eliminar",
        cancellationText: "Cancelar",
      });

      if (!result.confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id: channel.id });
      } catch (error) {
        console.error("Error deleting channel", error);
      }
    },
    [confirm, deleteMutation],
  );

  const handleModalClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingChannel(null);
  };

  const columns = useMemo<ColumnConfig<ChannelRecord>[]>(() => {
    return [
      {
        key: "channel",
        title: "Canal",
        type: "custom",
        render: (channel) => (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{formatChannelType(channel.type)}</Badge>
              <span className="font-medium">{channel.name}</span>
            </div>
            {channel.description ? (
              <p className="text-muted-foreground text-sm">
                {channel.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: "token",
        title: "Token / Credenciales",
        type: "custom",
        render: (channel) => (
          <div className="flex items-center gap-2 text-sm">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            <code className="rounded bg-muted px-2 py-1 text-xs">
              {channel.token}
            </code>
          </div>
        ),
      },
      {
        key: "notifications",
        title: "Notificaciones",
        type: "custom",
        render: (channel) => (
          <div className="flex items-center gap-2 text-sm">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {channel._count?.notifications ?? 0}
            </span>
          </div>
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
            onClick: (channel) => handleEdit(channel),
            label: "Editar",
            icon: <Edit className="h-4 w-4" />,
          },
          delete: {
            onClick: (channel) => handleDelete(channel),
            label: "Eliminar",
            icon: <Trash className="h-4 w-4" />,
          },
        },
      },
    ];
  }, [handleDelete, handleEdit]);

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="text-muted-foreground">Aún no hay canales configurados.</p>
      <Button variant="outline" onClick={handleCreate}>
        Crear el primer canal
      </Button>
    </div>
  );

  const modalDefaultValues = editingChannel
    ? {
        type: editingChannel.type,
        name: editingChannel.name,
        description: editingChannel.description ?? null,
        token: editingChannel.token,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            Canales ({channels.length})
          </h3>
          <p className="text-muted-foreground text-sm">
            Gestiona los canales disponibles para enviar notificaciones.
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo canal
        </Button>
      </div>

      <Card className="overflow-hidden">
        <AppTable
          columns={columns}
          data={channels}
          loading={isLoading}
          emptyState={emptyState}
          emptyMessage="No hay canales disponibles"
        />
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => (open ? setIsModalOpen(true) : handleModalClose())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? "Editar canal" : "Crear canal"}
            </DialogTitle>
            <DialogDescription>
              Completa los datos del canal de notificaciones.
            </DialogDescription>
          </DialogHeader>

          <ChannelForm
            defaultValues={modalDefaultValues}
            onSubmit={async (formValues) => {
              try {
                if (editingChannel) {
                  await updateMutation.mutateAsync({
                    id: editingChannel.id,
                    ...formValues,
                  });
                } else {
                  await createMutation.mutateAsync(formValues);
                }
              } catch (error) {
                console.error("Error saving channel", error);
              }
            }}
            onCancel={handleModalClose}
            isSubmitting={isSubmitting}
            submitLabel={editingChannel ? "Guardar cambios" : "Crear canal"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
