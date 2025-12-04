"use client";

import { useMemo } from "react";
import {
  Boxes,
  Package as PackageIcon,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { KpiCard } from "~/components/cards/KpiCard";
import { StatusCard } from "~/components/cards/StatusCard";
import { OrderFlow } from "~/components/steps/OrderFlow";
import { useAppStore } from "~/store";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { calculateLotProgress, activeShipments } from "~/utils/collab/calculations";
import { getProviderName } from "~/utils/collab/lookup";

export default function DashboardPage() {
  const { carts, lots, packages, shipments, providers, products } = useAppStore();

  const summary = useMemo(() => {
    const paidCarts = carts.filter((cart) => cart.status === "PAID").length;
    const readyLots = lots.filter((lot) => lot.status === "READY_TO_ORDER").length;
    const packagesInTransit = packages.filter(
      (pkg) => pkg.status === "IN_TRANSIT",
    ).length;
    const active = activeShipments(shipments).length;

    const timeline = lots
      .filter((lot) => lot.scheduledAt)
      .map((lot) => ({
        id: lot.id,
        provider: getProviderName(lot.providerId, providers),
        status: lot.status,
        scheduledAt: lot.scheduledAt,
        progress: calculateLotProgress(lot, products).overallProgress,
      }))
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
      .slice(0, 5);

    const highlightedCart = carts.find(
      (cart) => cart.status === "TRANSFERRED_TO_LOTS",
    );
    const highlightedLot = lots.find(
      (lot) =>
        lot.status === "READY_TO_ORDER" ||
        lot.status === "ORDER_SENT" ||
        lot.status === "CONFIRMED_BY_PROVIDER",
    );
    const highlightedPackage = packages.find(
      (pkg) => pkg.status === "IN_TRANSIT",
    );
    const highlightedShipment = shipments.find(
      (shipment) =>
        shipment.status === "IN_TRANSIT" || shipment.status === "ARRIVED",
    );

    return {
      paidCarts,
      readyLots,
      packagesInTransit,
      activeShipments: active,
      timeline,
      highlights: {
        cart: highlightedCart,
        lot: highlightedLot,
        pkg: highlightedPackage,
        shipment: highlightedShipment,
      },
    };
  }, [carts, lots, packages, shipments, providers, products]);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Operaciones colaborativas
        </h1>
        <p className="text-sm text-slate-500">
          Monitorea el flujo completo desde la construcción de carritos hasta la
          entrega comunitaria.
        </p>
      </header>

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
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Línea de abastecimiento
          </h2>
          <OrderFlow
            cartStatus={summary.highlights.cart?.status ?? "DRAFT"}
            lotStatus={summary.highlights.lot?.status}
            packageStatus={summary.highlights.pkg?.status}
            shipmentStatus={summary.highlights.shipment?.status}
          />
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-slate-700">
              Próximas consolidaciones
            </h3>
            <div className="space-y-2">
              {summary.timeline.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{entry.provider}</p>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Foco operativo
          </h2>
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
                  {getProviderName(
                    summary.highlights.lot.providerId,
                    providers,
                  )}{" "}
                  · <StatusBadge status={summary.highlights.lot.status} />
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
    </div>
  );
}
