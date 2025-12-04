"use client";

import { useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { ProviderFilter } from "~/components/filters/ProviderFilter";
import { ShipmentTable } from "~/components/tables/ShipmentTable";
import { api } from "~/trpc/react";

export default function EnviosPage() {
  const [providerId, setProviderId] = useState<number | undefined>();
  const [selectedPackages, setSelectedPackages] = useState<number[]>([]);

  const { data: packages = [] } = api.package.getAll.useQuery();
  const { data: shipments = [] } = api.shipment.getAll.useQuery();
  const { data: suppliers = [] } = api.suppliers.getAllSuppliers.useQuery();

  const utils = api.useUtils();

  const assembleMutation = api.shipment.assembleFromPackages.useMutation({
    onSuccess: () => {
      void utils.shipment.getAll.invalidate();
      void utils.package.getAll.invalidate();
    },
  });

  const startMutation = api.shipment.start.useMutation({
    onSuccess: () => void utils.shipment.getAll.invalidate(),
  });

  const arriveMutation = api.shipment.markArrived.useMutation({
    onSuccess: () => void utils.shipment.getAll.invalidate(),
  });

  const closeMutation = api.shipment.close.useMutation({
    onSuccess: () => void utils.shipment.getAll.invalidate(),
  });

  const readyPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (providerId && pkg.lot?.supplier.id !== providerId) {
        return false;
      }
      return pkg.status === "READY_FOR_PICKUP";
    });
  }, [packages, providerId]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      if (!providerId) return true;
      return shipment.packages.some((shipPkg) => {
        const pkg = packages.find((item) => item.id === shipPkg.package.id);
        return pkg?.lot?.supplier.id === providerId;
      });
    });
  }, [shipments, packages, providerId]);

  const handleAssemble = () => {
    if (selectedPackages.length === 0) return;
    assembleMutation.mutate({
      packageIds: selectedPackages,
      carrierId: 1, // Default carrier
      addressId: 1, // Default address
    });
    setSelectedPackages([]);
  };

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Envíos colaborativos
        </h1>
        <p className="text-sm text-slate-500">
          Coordina la logística de salida y seguimiento de paquetes
          comunitarios.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4 text-blue-500" />
          Filtros
        </div>
        <ProviderFilter
          providers={suppliers}
          value={providerId}
          onChange={(next) => setProviderId(next)}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Paquetes listos para envío
            </h2>
            <p className="text-sm text-slate-500">
              Selecciona paquetes en estado listo para retiro y arma un envío
              consolidado.
            </p>
          </div>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={selectedPackages.length === 0}
            onClick={handleAssemble}
          >
            <Plus className="h-4 w-4" />
            Armar envío
          </Button>
        </header>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {readyPackages.map((pkg) => {
            const provider = pkg.lot?.supplier.name ?? "Proveedor";
            const selected = selectedPackages.includes(pkg.id);
            return (
              <label
                key={pkg.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-700">
                    Paquete {pkg.trackingId}
                  </p>
                  <p className="text-xs text-slate-500">
                    {provider} · Lote {pkg.lot?.id}
                  </p>
                </div>
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => {
                    setSelectedPackages((current) =>
                      checked
                        ? [...current, pkg.id]
                        : current.filter((id) => id !== pkg.id),
                    );
                  }}
                />
              </label>
            );
          })}
          {readyPackages.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay paquetes disponibles para armar un nuevo envío.
            </p>
          ) : null}
        </div>
      </section>

      <ShipmentTable
        shipments={filteredShipments}
        packages={packages}
        onStart={(id) => startMutation.mutate({ shipmentId: id })}
        onArrive={(id) => arriveMutation.mutate({ shipmentId: id })}
        onClose={(id) => closeMutation.mutate({ shipmentId: id })}
      />
    </div>
  );
}
