"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { useAppStore } from "~/store";
import { calculateLotProgress, lotHasMetMoq } from "~/utils/collab/calculations";
import { getProductName, getProviderName, getUserName } from "~/utils/collab/lookup";

export default function LotDetailPage() {
  const params = useParams<{ lotId: string }>();
  const router = useRouter();
  const lotId = params?.lotId;

  const {
    lots,
    products,
    providers,
    users,
    markReadyToOrder,
    sendOrder,
    confirmByProvider,
    generatePackages,
  } = useAppStore();

  const lot = useMemo(
    () => lots.find((item) => item.id === lotId),
    [lots, lotId],
  );

  const metrics = useMemo(() => {
    if (!lot) return { overallProgress: 0, items: [] };
    return calculateLotProgress(lot, products);
  }, [lot, products]);

  if (!lot) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <p className="text-sm text-slate-500">Lote no encontrado.</p>
      </div>
    );
  }

  const providerName = getProviderName(lot.providerId, providers);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">
          Lote {lot.id} · {providerName}
        </h1>
        <StatusBadge status={lot.status} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Productos consolidados
            </h2>
            <p className="text-sm text-slate-500">
              Avance promedio: {(metrics.overallProgress * 100).toFixed(0)}% del MOQ.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Programado: {new Date(lot.scheduledAt).toLocaleDateString()}</span>
            {lot.consolidatedAt ? (
              <span>Consolidado: {new Date(lot.consolidatedAt).toLocaleDateString()}</span>
            ) : null}
          </div>
        </header>

        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Mínimo proveedor</TableHead>
              <TableHead>Total consolidado</TableHead>
              <TableHead>Contribuciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lot.items.map((item) => {
              const product = products.find((prod) => prod.id === item.productId);
              if (!product) return null;
              const meetsMoq = lotHasMetMoq(item, products);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-slate-800">
                      {getProductName(item.productId, products)}
                    </div>
                    <div className="text-xs text-slate-500">SKU {product.sku}</div>
                  </TableCell>
                  <TableCell>{product.moqByProvider} {product.unit}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-800">{item.totalQty}</span>{" "}
                    <span className="text-xs text-slate-500">{product.unit}</span>
                    {meetsMoq ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                        MOQ alcanzado
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.contributions.map((contribution, index) => (
                        <span
                          key={`${contribution.userId}-${index}`}
                          className="rounded-full bg-slate-100 px-2 py-1"
                        >
                          {getUserName(contribution.userId, users)} ·{" "}
                          <strong>{contribution.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {lot.status === "PENDING" ? (
          <Button onClick={() => markReadyToOrder(lot.id)}>Listo para ordenar</Button>
        ) : null}
        {lot.status === "READY_TO_ORDER" ? (
          <Button variant="secondary" onClick={() => sendOrder(lot.id)}>
            Enviar orden
          </Button>
        ) : null}
        {lot.status === "ORDER_SENT" ? (
          <Button onClick={() => confirmByProvider(lot.id)}>Confirmar proveedor</Button>
        ) : null}
        {lot.status === "CONFIRMED_BY_PROVIDER" ? (
          <Button variant="outline" onClick={() => generatePackages(lot.id)}>
            Generar paquetes
          </Button>
        ) : null}
      </section>
    </div>
  );
}
