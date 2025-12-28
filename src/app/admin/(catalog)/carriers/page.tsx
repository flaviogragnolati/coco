import { Suspense } from "react";

import { CarriersTable } from "~/components/admin/carrier";
import { CarriersPageSkeleton } from "~/components/admin/carrier/carriers-page-skeleton";
import { api } from "~/trpc/server";

async function CarriersContent() {
  const carriers = await api.carriers.getAllCarriers();

  const totalCarriers = carriers.length;
  const activeCarriers = carriers.filter((carrier) => carrier.isActive).length;
  const totalShipments = carriers.reduce(
    (acc, carrier) => acc + (carrier._count?.shipments ?? 0),
    0,
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Transportistas</h1>
        <p className="text-muted-foreground">
          Gestiona las empresas de logística disponibles para tus envíos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalCarriers}</div>
          <div className="text-muted-foreground text-sm">Total transportistas</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{activeCarriers}</div>
          <div className="text-muted-foreground text-sm">Transportistas activos</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalShipments}</div>
          <div className="text-muted-foreground text-sm">Envíos registrados</div>
        </div>
      </div>

      <CarriersTable carriers={carriers} />
    </div>
  );
}

export default function CarriersPage() {
  return (
    <Suspense fallback={<CarriersPageSkeleton />}>
      <CarriersContent />
    </Suspense>
  );
}
