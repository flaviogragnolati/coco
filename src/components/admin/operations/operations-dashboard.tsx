"use client";

import { useMemo } from "react";
import {
  Boxes,
  Package as PackageIcon,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { StatusBadge } from "~/components/badges/StatusBadge";
import { KpiCard } from "~/components/cards/KpiCard";
import { StatusCard } from "~/components/cards/StatusCard";
import { OrderFlow } from "~/components/steps/OrderFlow";
import type { CartStatus as CollabCartStatus } from "~/schema/collab";
import { api } from "~/trpc/react";

type LotWithItems = NonNullable<
  ReturnType<typeof api.lot.getAll.useQuery>["data"]
>[number];

export function OperationsDashboard() {
  const { data: carts = [], isLoading: cartsLoading } =
    api.cart.getAll.useQuery();
  const { data: lots = [], isLoading: lotsLoading } = api.lot.getAll.useQuery();
  const { data: packages = [], isLoading: packagesLoading } =
    api.package.getAll.useQuery();
  const { data: shipments = [], isLoading: shipmentsLoading } =
    api.shipment.getAll.useQuery();

  const isLoading =
    cartsLoading || lotsLoading || packagesLoading || shipmentsLoading;

  const summary = useMemo(() => {
    const paidCarts = carts.filter((cart) => cart.status === "COMPLETED").length;
    const readyLots = lots.filter(
      (lot) => lot.status === "READY_TO_ORDER",
    ).length;
    const packagesInTransit = packages.filter(
      (pkg) => pkg.status === "IN_TRANSIT",
    ).length;
    const activeShipments = shipments.filter(
      (shipment) => shipment.status === "IN_TRANSIT",
    ).length;

    const timeline = lots
      .filter((lot) => lot.scheduledAt)
      .map((lot) => ({
        id: lot.id,
        provider: lot.supplier?.name ?? "Proveedor",
        status: lot.status,
        scheduledAt: lot.scheduledAt,
        progress: calculateLotProgress(lot),
      }))
      .sort(
        (a, b) =>
          new Date(a.scheduledAt ?? "").getTime() -
          new Date(b.scheduledAt ?? "").getTime(),
      )
      .slice(0, 5);

    const highlightedCart =
      carts.find((cart) => cart.status === "COMPLETED") ?? carts[0];
    const highlightedLot = lots.find(
      (lot) =>
        lot.status === "READY_TO_ORDER" ||
        lot.status === "ORDER_SENT" ||
        lot.status === "CONFIRMED_BY_PROVIDER",
    );
    const highlightedPackage =
      packages.find((pkg) => pkg.status === "IN_TRANSIT") ?? packages[0];
    const highlightedShipment = shipments.find((shipment) =>
      ["IN_TRANSIT", "ARRIVED"].includes(shipment.status),
    );

    return {
      paidCarts,
      readyLots,
      packagesInTransit,
      activeShipments,
      timeline,
      highlights: {
        cart: highlightedCart,
        lot: highlightedLot,
        pkg: highlightedPackage,
        shipment: highlightedShipment,
      },
    };
  }, [carts, lots, packages, shipments]);

  return (
    <div className="min-w-0 space-y-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">
          Operaciones colaborativas
        </h2>
        <p className="text-sm text-slate-500">
          Monitorea el flujo completo desde la construcción de carritos hasta la
          entrega comunitaria.
        </p>
      </header>

      {isLoading ? (
        <div className="text-sm text-slate-500">Cargando métricas...</div>
      ) : null}

      {!isLoading ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Carritos pagados"
              value={summary.paidCarts}
              description="Listos para consolidación"
              accent="blue"
              icon={ShoppingCart}
            />
            <KpiCard
              title="Lotes listos"
              value={summary.readyLots}
              description="Alcanza el MOQ esta semana"
              accent="purple"
              icon={Boxes}
            />
            <KpiCard
              title="Paquetes en tránsito"
              value={summary.packagesInTransit}
              description="Con destino a nodos locales"
              accent="orange"
              icon={PackageIcon}
            />
            <KpiCard
              title="Envíos activos"
              value={summary.activeShipments}
              description="Coordinados con aliados logísticos"
              accent="green"
              icon={Truck}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Línea de abastecimiento
              </h3>
            <OrderFlow
              cartStatus={mapCartStatus(summary.highlights.cart?.status)}
              lotStatus={summary.highlights.lot?.status}
              packageStatus={summary.highlights.pkg?.status}
              shipmentStatus={summary.highlights.shipment?.status}
            />
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                <h4 className="text-sm font-medium text-slate-700">
                  Próximas consolidaciones
                </h4>
                <div className="space-y-2">
                  {summary.timeline.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {entry.provider}
                        </p>
                        <p className="text-xs text-slate-500">Lote {entry.id}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <StatusBadge status={entry.status} />
                        <div className="text-xs text-slate-500">
                          {(entry.progress * 100).toFixed(0)}% MOQ
                        </div>
                      </div>
                    </div>
                  ))}
                  {summary.timeline.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Aún no hay lotes programados para esta semana.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Foco operativo
              </h3>
              <StatusCard
                title="Carrito prioritario"
                status={
                  summary.highlights.cart ? (
                    <>
                      #{summary.highlights.cart.id} ·{" "}
                      <StatusBadge status={summary.highlights.cart.status} />
                    </>
                  ) : (
                    "Sin carritos urgentes"
                  )
                }
                footer="Consolida los carritos pagados para alcanzar el MOQ semanal."
              />
              <StatusCard
                title="Lote destacado"
                status={
                  summary.highlights.lot ? (
                    <>
                      {summary.highlights.lot.supplier?.name ?? "Proveedor"} ·{" "}
                      <StatusBadge status={summary.highlights.lot.status} />
                    </>
                  ) : (
                    "Todos los lotes al día"
                  )
                }
                footer="Revisa los productos que estén cerca del mínimo para acelerar la orden."
              />
              <StatusCard
                title="Movimiento logístico"
                status={
                  summary.highlights.shipment ? (
                    <>
                      {summary.highlights.shipment.carrierName} ·{" "}
                      <StatusBadge status={summary.highlights.shipment.status} />
                    </>
                  ) : (
                    "Sin envíos destacados"
                  )
                }
                footer="Coordina con aliados locales para asegurar la recepción y fraccionamiento."
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function calculateLotProgress(lot: LotWithItems) {
  if (!lot.items?.length) return 0;

  const productTotals = lot.items.reduce<Record<number, number>>(
    (acc, item) => {
      acc[item.productId] = (acc[item.productId] ?? 0) + (item.quantity ?? 0);
      return acc;
    },
    {},
  );

  const progresses = Object.entries(productTotals).map(([productId, total]) => {
    const item = lot.items.find(
      (lotItem) => lotItem.productId === Number(productId),
    );
    const moq = item?.product?.moqByProvider ?? 0;
    if (!moq) return 0;
    return Math.min(1, total / moq);
  });

  if (progresses.length === 0) return 0;
  return progresses.reduce((acc, value) => acc + value, 0) / progresses.length;
}

function mapCartStatus(status?: string): CollabCartStatus {
  switch (status) {
    case "COMPLETED":
    case "PAID":
      return "PAID";
    case "TRANSFERRED_TO_LOTS":
      return "TRANSFERRED_TO_LOTS";
    default:
      return "DRAFT";
  }
}
