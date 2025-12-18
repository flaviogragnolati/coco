"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";

import { Button } from "~/components/ui/button";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { useAppStore } from "~/store";
import { getProviderName } from "~/utils/collab/lookup";

export default function ShipmentDetailPage() {
  const params = useParams<{ shipmentId: string }>();
  const router = useRouter();

  const shipmentId = params?.shipmentId;

  const {
    shipments,
    packages,
    lots,
    providers,
    startTransit,
    arrive,
    close,
  } = useAppStore();

  const shipment = useMemo(
    () => shipments.find((item) => item.id === shipmentId),
    [shipments, shipmentId],
  );

  const packageDetails = useMemo(() => {
    if (!shipment) return [];
    return shipment.packages
      .map((pkgRef) => {
        const pkg = packages.find((item) => item.id === pkgRef.packageId);
        if (!pkg) return null;
        const lot = lots.find((item) => item.id === pkg.lotId);
        const provider = lot
          ? providers.find((item) => item.id === lot.providerId)
          : undefined;
        return {
          pkg,
          lot,
          providerName: provider ? getProviderName(provider.id, [provider]) : "Proveedor",
        };
      })
      .filter(Boolean) as Array<{
        pkg: (typeof packages)[number];
        lot?: (typeof lots)[number];
        providerName: string;
      }>;
  }, [shipment, packages, lots, providers]);

  if (!shipment) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <p className="text-sm text-slate-500">Envío no encontrado.</p>
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
          Envío {shipment.id} · {shipment.carrierName}
        </h1>
        <StatusBadge status={shipment.status} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2 text-blue-600">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Seguimiento logístico
            </h2>
            <p className="text-sm text-slate-500">
              Salida estimada:{" "}
              {shipment.startedAt
                ? new Date(shipment.startedAt).toLocaleString()
                : "Por confirmar"}
            </p>
          </div>
        </header>

        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Paquete</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado paquete</TableHead>
              <TableHead>Lote</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packageDetails.map(({ pkg, providerName, lot }) => (
              <TableRow key={pkg.id}>
                <TableCell>{pkg.id}</TableCell>
                <TableCell>{providerName}</TableCell>
                <TableCell>
                  <StatusBadge status={pkg.status} />
                </TableCell>
                <TableCell>{lot?.id ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {shipment.status === "ASSEMBLING" ? (
          <Button onClick={() => startTransit(shipment.id)}>Salir a tránsito</Button>
        ) : null}
        {shipment.status === "IN_TRANSIT" ? (
          <Button variant="secondary" onClick={() => arrive(shipment.id)}>
            Marcar arribo
          </Button>
        ) : null}
        {shipment.status === "ARRIVED" ? (
          <Button variant="outline" onClick={() => close(shipment.id)}>
            Cerrar envío
          </Button>
        ) : null}
      </section>
    </div>
  );
}
