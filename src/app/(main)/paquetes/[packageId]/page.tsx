"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";

import { Button } from "~/components/ui/button";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { useAppStore } from "~/store";
import { getProviderName } from "~/utils/collab/lookup";

export default function PackageDetailPage() {
  const params = useParams<{ packageId: string }>();
  const router = useRouter();

  const packageId = params?.packageId;

  const {
    packages,
    lots,
    providers,
    setReadyForPickup,
    markInTransit,
    markDelivered,
  } = useAppStore();

  const pkg = useMemo(
    () => packages.find((item) => item.id === packageId),
    [packages, packageId],
  );
  const lot = useMemo(
    () => (pkg ? lots.find((item) => item.id === pkg.lotId) : undefined),
    [lots, pkg],
  );
  const provider = useMemo(
    () => (lot ? providers.find((item) => item.id === lot.providerId) : undefined),
    [providers, lot],
  );

  const providerName = useMemo(
    () => (provider ? getProviderName(provider.id, [provider]) : "Proveedor"),
    [provider],
  );

  if (!pkg || !lot) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <p className="text-sm text-slate-500">Paquete no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">
          Paquete {pkg.id} · {providerName}
        </h1>
        <StatusBadge status={pkg.status} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2 text-blue-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Detalle logístico
            </h2>
            <p className="text-sm text-slate-500">
              Peso estimado {pkg.weight ?? 0} kg · Volumen {pkg.volume ?? 0} m³
            </p>
          </div>
        </header>
        <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs uppercase text-slate-400">Lote asociado</dt>
            <dd className="text-sm font-medium text-slate-800">{lot.id}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs uppercase text-slate-400">
              Productos contenidos
            </dt>
            <dd className="text-sm font-medium text-slate-800">
              {lot.items.length} productos fraccionados
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-2 text-xs text-slate-500">
          {lot.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between rounded-md bg-slate-100 px-3 py-2"
            >
              <span>{item.productId}</span>
              <span className="font-semibold text-slate-700">
                {item.totalQty} unidades
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {pkg.status === "CREATED" ? (
          <Button onClick={() => setReadyForPickup(pkg.id)}>Listo para retiro</Button>
        ) : null}
        {pkg.status === "READY_FOR_PICKUP" ? (
          <Button variant="secondary" onClick={() => markInTransit(pkg.id)}>
            En tránsito
          </Button>
        ) : null}
        {pkg.status === "IN_TRANSIT" ? (
          <Button variant="outline" onClick={() => markDelivered(pkg.id)}>
            Marcar entregado
          </Button>
        ) : null}
      </section>
    </div>
  );
}
