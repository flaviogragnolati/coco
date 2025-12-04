"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";

import { PackageCard } from "~/components/cards/PackageCard";
import { ProviderFilter } from "~/components/filters/ProviderFilter";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { api } from "~/trpc/react";

export default function PaquetesPage() {
  const [providerId, setProviderId] = useState<number | undefined>();

  const { data: packages = [] } = api.package.getAll.useQuery();
  const { data: suppliers = [] } = api.suppliers.getAllSuppliers.useQuery();

  const utils = api.useUtils();

  const markReadyMutation = api.package.markReadyForPickup.useMutation({
    onSuccess: () => void utils.package.getAll.invalidate(),
  });

  const markTransitMutation = api.package.markInTransit.useMutation({
    onSuccess: () => void utils.package.getAll.invalidate(),
  });

  const markDeliveredMutation = api.package.markDelivered.useMutation({
    onSuccess: () => void utils.package.getAll.invalidate(),
  });

  const cards = useMemo(() => {
    return packages
      .filter((pkg) => {
        if (!providerId) return true;
        return pkg.lot?.supplier.id === providerId;
      })
      .map((pkg) => {
        return { pkg, provider: pkg.lot?.supplier };
      });
  }, [packages, providerId]);

  const statusCount = cards.reduce<Record<string, number>>((acc, item) => {
    acc[item.pkg.status] = (acc[item.pkg.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Gestión de paquetes
        </h1>
        <p className="text-sm text-slate-500">
          Supervisa el estado de los paquetes listos para retiro y su movimiento
          logístico.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4 text-orange-500" />
          Filtros
        </div>
        <ProviderFilter
          providers={suppliers}
          value={providerId}
          onChange={(next) => setProviderId(next)}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {Object.entries(statusCount).map(([status, count]) => (
            <span
              key={status}
              className="flex items-center gap-2 rounded-full bg-white px-2 py-1"
            >
              <StatusBadge status={status} />
              <strong className="text-slate-700">{count}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ pkg, provider }) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            provider={provider ?? null}
            onReadyForPickup={(id) =>
              markReadyMutation.mutate({ packageId: id })
            }
            onMarkInTransit={(id) =>
              markTransitMutation.mutate({ packageId: id })
            }
            onMarkDelivered={(id) =>
              markDeliveredMutation.mutate({ packageId: id })
            }
          />
        ))}
        {cards.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay paquetes para el filtro seleccionado.
          </p>
        ) : null}
      </section>
    </div>
  );
}
