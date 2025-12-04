"use client";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import dayjs from "dayjs";
import {
  Archive,
  Box,
  Clipboard,
  Clock,
  MapPin,
  Package,
  Send,
  Truck,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { cn, formatCurrency } from "~/lib/utils";
import type {
  CartItemTrace,
  CartWithTraceability,
  PackageTrace,
  ShipmentTrace,
} from "~/types/cart-trace";
import {
  type CartItemStage,
  cartStageCopy,
  getItemStage,
} from "~/utils/cart-trace";

interface CartItemTraceDialogProps {
  item: CartItemTrace;
  cart: CartWithTraceability;
  trigger?: ReactNode;
}

const stageRank: Record<CartItemStage, number> = {
  IN_CART: 0,
  LOT_PENDING: 1,
  ORDER_SENT: 2,
  CONFIRMED: 3,
  PACKAGED: 4,
  IN_TRANSIT: 5,
  DELIVERED: 6,
};

const stageByStep: Record<string, CartItemStage> = {
  cart: "IN_CART",
  lot: "LOT_PENDING",
  order: "ORDER_SENT",
  confirmed: "CONFIRMED",
  packaged: "PACKAGED",
  transit: "IN_TRANSIT",
  delivered: "DELIVERED",
};

function formatDate(value?: string | null) {
  if (!value) return "Pendiente";
  return dayjs(value).format("DD MMM YYYY, HH:mm");
}

function buildUniqueShipments(packages: PackageTrace[]): ShipmentTrace[] {
  const seen = new Set<number>();
  const unique: ShipmentTrace[] = [];

  for (const pkg of packages) {
    for (const { shipment } of pkg.shipments) {
      if (seen.has(shipment.id)) continue;
      seen.add(shipment.id);
      unique.push(shipment);
    }
  }

  return unique;
}

export function CartItemTraceDialog({
  item,
  cart,
  trigger,
}: CartItemTraceDialogProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const lot = item.lot;
  const packages = lot?.packages ?? [];
  const shipments = useMemo(() => buildUniqueShipments(packages), [packages]);
  const primaryShipment = shipments[0];
  const currentStage = getItemStage(item);
  const moqTarget = item.product.moqByProvider;
  const moqCurrent = lot?.totalQuantityForProductInLot ?? item.quantity;
  const moqProgress =
    moqTarget > 0 ? Math.min(100, (moqCurrent / moqTarget) * 100) : 0;

  const timelineSteps = [
    {
      key: "cart",
      title: "Carrito",
      description: `Creado para ${item.product.name}`,
      date: cart.createdAt,
    },
    {
      key: "lot",
      title: "Asignado a lote",
      description: lot
        ? `Lote ${lot.id}`
        : "Aún sin lote. Se asignará al alcanzar cupo.",
      date: lot?.scheduledAt ?? lot?.consolidatedAt,
    },
    {
      key: "order",
      title: "Orden enviada al proveedor",
      description: lot ? lot.provider.name : "Pendiente de lote",
      date: lot?.orderSentAt,
    },
    {
      key: "confirmed",
      title: "Confirmado por proveedor",
      description: lot?.provider.contact ?? "Sin confirmación aún",
      date: lot?.confirmedAt,
    },
    {
      key: "packaged",
      title: "Empaquetado",
      description: packages[0]
        ? `Paquete ${packages[0].id}`
        : "Pendiente de armado",
      date: packages[0]?.createdAt ?? lot?.confirmedAt,
    },
    {
      key: "transit",
      title: "Envío",
      description: primaryShipment
        ? `${primaryShipment.carrierName} · ${primaryShipment.trackingId}`
        : "Aún sin envío",
      date: primaryShipment?.startedAt ?? primaryShipment?.eta,
    },
    {
      key: "delivered",
      title: "Entregado",
      description: primaryShipment?.arrivedAt
        ? "Entrega confirmada"
        : "Pendiente de entrega",
      date: primaryShipment?.arrivedAt,
    },
  ];

  const handleCopyTracking = async (trackingId: string, shipmentId: number) => {
    try {
      await navigator.clipboard?.writeText(trackingId);
      setCopiedId(shipmentId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            Ver detalle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span className="font-semibold text-muted-foreground text-sm">
              {lot?.provider.name ?? "Proveedor no asignado"}
            </span>
            <span className="font-bold text-lg">{item.product.name}</span>
          </DialogTitle>
          <DialogDescription>
            Trazabilidad completa del ítem y su avance hacia el envío.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-6">
            <section className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">Línea de tiempo</p>
                  <p className="text-muted-foreground text-xs">
                    Estados reales con sellos de tiempo
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
              <ul className="relative space-y-4">
                {timelineSteps.map((step, index) => {
                  const stepStage = stageByStep[step.key];
                  const isCompleted =
                    stageRank[currentStage] >= stageRank[stepStage];
                  const isCurrent = currentStage === stepStage;
                  const isLast = index === timelineSteps.length - 1;
                  return (
                    <li
                      key={step.key}
                      className="grid grid-cols-[auto_1fr] gap-4"
                    >
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
                            {isCompleted
                              ? isCurrent
                                ? "En progreso"
                                : "Listo"
                              : "Pendiente"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {step.description}
                        </p>
                        <p className="mt-1 font-medium text-foreground text-xs">
                          {formatDate(step.date)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Archive className="h-4 w-4 text-blue-500" />
                  Lote
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-semibold">
                      {lot ? `Lote ${lot.id}` : "Aún sin lote"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {lot?.provider.name ?? "Se asignará automáticamente"}
                    </p>
                  </div>
                  {lot ? <StatusBadge status={lot.status} /> : null}
                </div>
                <div className="space-y-1 rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>MOQ proveedor</span>
                    <span>
                      {moqCurrent} / {moqTarget} uds
                    </span>
                  </div>
                  <Progress value={moqProgress} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <MapPin className="h-4 w-4 text-purple-500" />
                  Proveedor
                </div>
                <div className="rounded-lg border bg-card/50 p-3 text-sm">
                  <p className="font-semibold">
                    {lot?.provider.name ?? "Sin proveedor aún"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {lot?.provider.contact ?? "Contacto pendiente"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {lot?.provider.pickupPolicy ??
                      "Políticas de retiro se mostrarán al asignar proveedor"}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Box className="h-4 w-4 text-amber-500" />
                  Paquetes
                </div>
                <Badge variant="outline">
                  {packages.length}{" "}
                  {packages.length === 1 ? "paquete" : "paquetes"}
                </Badge>
              </div>
              {packages.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aún no se han armado paquetes para este lote.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">
                            Paquete {pkg.id}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Peso {pkg.weight ?? "—"} · Volumen{" "}
                            {pkg.volume ?? "—"}
                          </p>
                        </div>
                        <StatusBadge status={pkg.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  Envíos
                </div>
                <Badge variant="outline">
                  {shipments.length}{" "}
                  {shipments.length === 1 ? "envío" : "envíos"}
                </Badge>
              </div>
              {shipments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aún no se registraron envíos para este producto.
                </p>
              ) : (
                <div className="space-y-3">
                  {shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">
                            {shipment.carrierName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Tracking: {shipment.trackingId}
                          </p>
                        </div>
                        <StatusBadge status={shipment.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-muted-foreground text-xs">
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
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleCopyTracking(shipment.trackingId, shipment.id)
                          }
                        >
                          <Clipboard className="mr-2 h-4 w-4" />
                          {copiedId === shipment.id
                            ? "Copiado"
                            : "Copiar tracking"}
                        </Button>
                        <Button size="sm" variant="ghost">
                          Ver seguimiento
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Resumen del ítem</p>
                  <p className="text-muted-foreground text-xs">
                    {cartStageCopy[currentStage].description}
                  </p>
                </div>
                <Badge variant="outline">
                  {item.quantity} uds · {formatCurrency(item.price)}
                  <span className="text-muted-foreground">
                    {" "}
                    / {item.product.priceUnit}
                  </span>
                </Badge>
              </div>
              <Separator className="my-3" />
              <div className="grid gap-2 text-muted-foreground text-sm md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-blue-500" />
                  MOQ proveedor: {item.product.moqByProvider}{" "}
                  {item.product.customerUnit}
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-500" />
                  Mínimo por usuario: {item.product.minFractionPerUser}{" "}
                  {item.product.customerUnit}
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
