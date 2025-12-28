"use client";

import dayjs from "dayjs";
import {
  Archive,
  Box,
  Clock,
  MapPin,
  Package,
  Send,
  Truck,
} from "lucide-react";

import { StatusBadge } from "~/components/badges/StatusBadge";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { cn, formatCurrency } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import {
  type CartItemStage,
  cartStageCopy,
  getItemStage,
} from "~/utils/cart-trace";

type Order = RouterOutputs["order"]["getUserOrders"][number];
type OrderItem = Order["items"][number];

const stageRank: Record<CartItemStage, number> = {
  IN_CART: 0,
  LOT_PENDING: 1,
  ORDER_SENT: 2,
  CONFIRMED: 3,
  PACKAGED: 4,
  IN_TRANSIT: 5,
  DELIVERED: 6,
};

const stepToStage: Record<string, CartItemStage> = {
  cart: "IN_CART",
  lot: "LOT_PENDING",
  order: "ORDER_SENT",
  confirmed: "CONFIRMED",
  packaged: "PACKAGED",
  transit: "IN_TRANSIT",
  delivered: "DELIVERED",
};

function formatDate(value?: string | Date | null) {
  if (!value) return "Pendiente";
  return dayjs(value).format("DD MMM YYYY, HH:mm");
}

function buildUniqueShipments(packages: NonNullable<OrderItem["lot"]>["packages"]) {
  const seen = new Set<number>();
  const unique: OrderItem["lot"]["packages"][number]["shipments"][number]["shipment"][] = [];

  for (const pkg of packages) {
    for (const { shipment } of pkg.shipments) {
      if (seen.has(shipment.id)) continue;
      seen.add(shipment.id);
      unique.push(shipment);
    }
  }

  return unique;
}

export interface OrderItemTrackingTimelineProps {
  item: OrderItem;
  cartCreatedAt: string | Date;
}

export function OrderItemTrackingTimeline({
  item,
  cartCreatedAt,
}: OrderItemTrackingTimelineProps) {
  const lot = item.lot;
  const packages = lot?.packages ?? [];
  const shipments = lot ? buildUniqueShipments(packages) : [];
  const primaryShipment = shipments[0];
  const currentStage = getItemStage(item as unknown as any);
  const totalInLot = lot?.totalQuantityForProductInLot ?? item.quantity;
  const moqTarget =
    // Prefer supplier MOQ, fallback to customer MOQ or default product MOQ alias
    (item.product as any).moqByProvider ??
    item.product.supplierMoq ??
    item.product.customerMoq ??
    0;

  const timelineSteps = [
    {
      key: "cart",
      title: "Carrito creado",
      description: `Añadido el ${formatDate(cartCreatedAt)}`,
      date: cartCreatedAt,
    },
    {
      key: "lot",
      title: "Asignado a lote",
      description: lot ? `Lote ${lot.id}` : "Aún sin lote",
      date: lot?.scheduledAt ?? lot?.consolidatedAt,
    },
    {
      key: "order",
      title: "Orden enviada al proveedor",
      description: lot ? lot.supplier.name : "Pendiente de lote",
      date: lot?.orderSentAt,
    },
    {
      key: "confirmed",
      title: "Confirmado por proveedor",
      description: lot?.supplier.contactName ?? "Sin confirmación aún",
      date: lot?.confirmedAt,
    },
    {
      key: "packaged",
      title: "Empaquetado",
      description: packages[0] ? `Paquete ${packages[0].id}` : "Pendiente de armado",
      date: packages[0]?.createdAt ?? lot?.confirmedAt,
    },
    {
      key: "transit",
      title: "Envío en tránsito",
      description: primaryShipment
        ? `${primaryShipment.carrierName} · ${primaryShipment.trackingId}`
        : "Aún sin envío",
      date: primaryShipment?.startedAt ?? primaryShipment?.eta,
    },
    {
      key: "delivered",
      title: "Entregado",
      description: primaryShipment?.arrivedAt ? "Entrega confirmada" : "Pendiente",
      date: primaryShipment?.arrivedAt,
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-lg">{item.product.name}</p>
          <p className="text-muted-foreground text-sm">
            Cantidad:{" "}
            <span className="font-semibold text-foreground">{item.quantity}</span>{" "}
            {item.product.customerUnit ?? item.unit}
          </p>
          <p className="text-muted-foreground text-xs">
            Subtotal: {formatCurrency(item.quantity * (item.publicPrice ?? item.price))}
          </p>
        </div>
        <Badge
          className={cn(
            "text-xs",
            currentStage === "DELIVERED"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700",
          )}
        >
          {cartStageCopy[currentStage].label}
        </Badge>
      </div>

      <div className="rounded-lg border p-4">
        <ul className="relative space-y-4">
          {timelineSteps.map((step, index) => {
            const stage = stepToStage[step.key];
            const isCompleted = stageRank[currentStage] >= stageRank[stage];
            const isCurrent = currentStage === stage;
            const isLast = index === timelineSteps.length - 1;
            return (
              <li key={step.key} className="grid grid-cols-[auto_1fr] gap-4">
                <div className="relative flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-1 h-3 w-3 rounded-full border-2",
                      isCompleted
                        ? "border-primary bg-primary"
                        : "border-border bg-background",
                    )}
                  />
                  {!isLast ? (
                    <span className="absolute top-3 h-full w-[2px] translate-x-[5px] bg-border" />
                  ) : null}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{step.title}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px]",
                        isCompleted
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-muted text-muted-foreground",
                      )}
                    >
                      {isCompleted ? (isCurrent ? "En progreso" : "Listo") : "Pendiente"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{step.description}</p>
                  <p className="mt-1 font-medium text-foreground text-xs">
                    {formatDate(step.date as string | Date | null | undefined)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Archive className="h-4 w-4 text-blue-500" />
            Lote
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold">{lot ? `Lote ${lot.id}` : "Sin lote"}</p>
              <p className="text-muted-foreground text-xs">
                {lot?.supplier.name ?? "Asignación pendiente"}
              </p>
            </div>
            {lot ? <StatusBadge status={lot.status as any} /> : null}
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>MOQ proveedor</span>
              <span>
                {totalInLot} / {moqTarget || "—"} uds
              </span>
            </div>
            <div className="mt-1">
              {lot?.supplier.contactName ?? lot?.supplier.contactPhone ?? "Contacto pendiente"}
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="h-4 w-4 text-emerald-600" />
            Envíos
          </div>
          {shipments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aún no se registraron envíos para este ítem.
            </p>
          ) : (
            <div className="space-y-3">
              {shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="rounded-lg border bg-muted/40 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{shipment.carrierName}</p>
                      <p className="text-muted-foreground text-xs">
                        Tracking: {shipment.trackingId}
                      </p>
                    </div>
                    <StatusBadge status={shipment.status as any} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {shipment.startedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        Salida {formatDate(shipment.startedAt)}
                      </span>
                    ) : null}
                    {shipment.eta ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ETA {formatDate(shipment.eta)}
                      </span>
                    ) : null}
                    {shipment.arrivedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Llegó {formatDate(shipment.arrivedAt)}
                      </span>
                    ) : null}
                    {shipment.address ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shipment.address.city ?? shipment.address.fullAddress ?? "Destino"}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {packages.length ? (
            <>
              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Box className="h-3 w-3 text-amber-500" />
                  {packages.length} {packages.length === 1 ? "paquete" : "paquetes"}
                </span>
                <span>
                  {packages.filter((pkg) => pkg.status === "DELIVERED").length} entregados
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
