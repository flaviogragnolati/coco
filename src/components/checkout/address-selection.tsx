"use client";

import { useMemo, useState } from "react";
import { Home, MapPin, Pencil, Plus } from "lucide-react";

import { AddressForm } from "~/components/admin/address/address-form";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { useAppStore } from "~/store";
import type { CheckoutAddressDraft } from "~/store/slices/checkout.slice";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { showToast } from "~/utils/show-toast";
import type { CreateAddressInput } from "~/schema/address";
import { ADDRESS_TYPE_LABELS } from "~/schema/address";

type Address = RouterOutputs["addresses"]["getUserAddresses"][number];

type AddressSelectionProps = {
  selectedAddressId: number | null;
  onSelect: (address: Address) => void;
  draft?: CheckoutAddressDraft | null;
  onDraftChange?: (draft: CheckoutAddressDraft | null) => void;
};

export function AddressSelection({
  selectedAddressId,
  onSelect,
  draft,
  onDraftChange,
}: AddressSelectionProps) {
  const userId = useAppStore((state) => state.user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [pickupCity, setPickupCity] = useState("");

  const { data: addresses, isLoading, refetch } =
    api.addresses.getUserAddresses.useQuery();
  const utils = api.useUtils();

  const createAddress = api.addresses.createAddress.useMutation({
    onSuccess: (address) => {
      showToast("success", "Dirección guardada");
      void utils.addresses.getUserAddresses.invalidate();
      void refetch();
      onSelect(address);
      onDraftChange?.(address);
      setDialogOpen(false);
    },
    onError: () => {
      showToast("error", "No se pudo guardar la dirección");
    },
  });

  const updateAddress = api.addresses.updateAddress.useMutation({
    onSuccess: (address) => {
      showToast("success", "Dirección actualizada");
      void utils.addresses.getUserAddresses.invalidate();
      void refetch();
      onSelect(address);
      onDraftChange?.(address);
      setDialogOpen(false);
      setEditingAddress(null);
    },
    onError: () => {
      showToast("error", "No se pudo actualizar la dirección");
    },
  });

  const handleSave = (values: CreateAddressInput) => {
    const payload = {
      ...values,
      userId: userId ?? values.userId ?? null,
    };
    if (editingAddress) {
      updateAddress.mutate({ ...payload, id: editingAddress.id });
    } else {
      createAddress.mutate(payload);
    }
  };

  const resolvedDraft = useMemo<Partial<CreateAddressInput>>(() => {
    const source = editingAddress ?? draft;
    if (!source) {
      return {
        userId: userId ?? null,
        isActive: true,
      };
    }
    return {
      type: source.type,
      fullAddress: source.fullAddress,
      street: source.street,
      number: source.number,
      city: source.city,
      state: source.state,
      postalCode: source.postalCode,
      country: source.country,
      description: source.description ?? null,
      userId: userId ?? source.userId ?? null,
      supplierId: null,
      carrierId: null,
      isActive: "isActive" in source ? source.isActive ?? true : true,
    };
  }, [draft, editingAddress, userId]);

  const activeAddresses = addresses ?? [];
  const isEmpty = !isLoading && activeAddresses.length === 0;

  const { data: pickupAddresses, isFetching: fetchingPickup } =
    api.addresses.getPickupAddresses.useQuery(
      { city: pickupCity || undefined },
      {
        refetchOnWindowFocus: false,
      },
    );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Dirección de entrega</CardTitle>
            <p className="text-muted-foreground text-sm">
              Usa una dirección existente o crea una nueva.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setEditingAddress(null)}>
                <Plus className="h-4 w-4" />
                Agregar dirección
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAddress ? "Editar dirección" : "Nueva dirección"}
                </DialogTitle>
              </DialogHeader>
              <AddressForm
                defaultValues={resolvedDraft ?? { userId }}
                hideRelations
                showStatusSwitch={false}
                onSubmit={handleSave}
                onCancel={() => {
                  setDialogOpen(false);
                  setEditingAddress(null);
                }}
                isSubmitting={createAddress.isLoading || updateAddress.isLoading}
                submitLabel={editingAddress ? "Guardar cambios" : "Guardar dirección"}
                cancelLabel="Cerrar"
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Cargando direcciones...</p>
          ) : null}

          {isEmpty ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No tienes direcciones guardadas todavía. Agrega una para continuar.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {activeAddresses.map((address) => {
              const isSelected = selectedAddressId === address.id;
              return (
                <div
                  key={address.id}
                  className="rounded-lg border p-3 shadow-sm transition hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-sm">{address.fullAddress}</p>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {address.city}, {address.state}, {address.country}
                      </p>
                      {address.description ? (
                        <p className="text-muted-foreground text-xs">{address.description}</p>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Home className="mr-1 h-3 w-3" />
                          {ADDRESS_TYPE_LABELS[address.type] ?? address.type}
                        </Badge>
                        {isSelected ? (
                          <Badge className="bg-primary text-primary-foreground">
                            Seleccionado
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => {
                        setEditingAddress(address);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => onSelect(address)}
                      className="w-full"
                    >
                      {isSelected ? "Seleccionada" : "Usar esta dirección"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Puntos de retiro</CardTitle>
            <p className="text-muted-foreground text-sm">
              Filtra por ciudad y elige un punto de retiro disponible.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="h-9 w-48 rounded-md border px-3 text-sm"
              placeholder="Filtrar por ciudad"
              value={pickupCity}
              onChange={(event) => setPickupCity(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fetchingPickup ? (
            <p className="text-muted-foreground text-sm">Buscando puntos de retiro...</p>
          ) : null}

          {!fetchingPickup && (pickupAddresses?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No hay puntos de retiro disponibles para este filtro.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {pickupAddresses?.map((address) => {
              const isSelected = selectedAddressId === address.id;
              return (
                <div
                  key={address.id}
                  className="rounded-lg border p-3 shadow-sm transition hover:border-primary/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">{address.fullAddress}</p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {address.city}, {address.state}, {address.country}
                    </p>
                    {address.description ? (
                      <p className="text-muted-foreground text-xs">{address.description}</p>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Home className="mr-1 h-3 w-3" />
                        {ADDRESS_TYPE_LABELS[address.type] ?? "Punto de retiro"}
                      </Badge>
                      {isSelected ? (
                        <Badge className="bg-primary text-primary-foreground">
                          Seleccionado
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => onSelect(address)}
                    className="w-full"
                  >
                    {isSelected ? "Seleccionado" : "Usar punto de retiro"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
