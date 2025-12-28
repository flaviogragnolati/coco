"use client";

import { useState } from "react";
import dayjs from "dayjs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Spinner } from "~/components/ui/spinner";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { OrderFlow } from "~/components/steps/OrderFlow";
import { OrderItemTrackingTimeline } from "~/components/orders/order-item-tracking-timeline";
import { cn, formatCurrency } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import {
  type CartItemStage,
  cartStageCopy,
  getItemStage,
} from "~/utils/cart-trace";
import { statusOrder } from "~/utils/collab/status";
import type {
  CartStatus,
  LotStatus,
  PackageStatus,
  ShipmentStatus,
} from "~/schema/collab";
import { Archive, Package as PackageIcon, ShoppingBag } from "lucide-react";

type Order = RouterOutputs["order"]["getUserOrders"][number];
type OrderItem = Order["items"][number];

type StageCounts = Record<CartItemStage, number>;

const baseStageCounts: StageCounts = {
  IN_CART: 0,
  LOT_PENDING: 0,
  ORDER_SENT: 0,
  CONFIRMED: 0,
  PACKAGED: 0,
  IN_TRANSIT: 0,
  DELIVERED: 0,
};

function summarizeStages(items: OrderItem[]) {
  const counts = items.reduce<StageCounts>((acc, item) => {
    const stage = getItemStage(item as unknown as any);
    acc[stage] = (acc[stage] ?? 0) + 1;
    return acc;
  }, { ...baseStageCounts });

  return {
    counts,
    total: items.length,
  };
}

function aggregateStatus(counts: StageCounts, total: number) {
  if (total === 0) {
    return {
      label: "Sin ítems",
      tone: "bg-muted text-muted-foreground",
      description: "",
    };
  }
  if (counts.DELIVERED === total) {
    return {
      label: "Entregado",
      tone: "bg-emerald-100 text-emerald-700",
      description: "Todos los productos fueron entregados",
    };
  }
  if (counts.DELIVERED > 0 && counts.DELIVERED < total) {
    return {
      label: "Parcialmente entregado",
      tone: "bg-amber-100 text-amber-800",
      description: "Algunos productos ya llegaron, otros siguen en camino",
    };
  }
  if (counts.IN_TRANSIT > 0) {
    return {
      label: "En tránsito",
      tone: "bg-blue-100 text-blue-800",
      description: "Tus paquetes están viajando",
    };
  }
  if (counts.PACKAGED > 0 || counts.CONFIRMED > 0 || counts.ORDER_SENT > 0) {
    return {
      label: "Preparando envío",
      tone: "bg-purple-100 text-purple-800",
      description: "El proveedor confirmó o está empaquetando tus productos",
    };
  }
  return {
    label: "En lote",
    tone: "bg-slate-100 text-slate-800",
    description: "Productos agrupados y esperando consolidación",
  };
}

function formatBreakdown(counts: StageCounts) {
  const parts: string[] = [];
  if (counts.DELIVERED) parts.push(`${counts.DELIVERED} entregado${counts.DELIVERED > 1 ? "s" : ""}`);
  if (counts.IN_TRANSIT) parts.push(`${counts.IN_TRANSIT} en tránsito`);
  if (counts.PACKAGED) parts.push(`${counts.PACKAGED} list${counts.PACKAGED > 1 ? "os" : "o"} para retiro`);
  const withSupplier = counts.ORDER_SENT + counts.CONFIRMED;
  if (withSupplier) parts.push(`${withSupplier} con proveedor`);
  if (counts.LOT_PENDING) parts.push(`${counts.LOT_PENDING} completando lote`);
  return parts.join(" · ");
}

function getHighestStatus<T extends string>(values: T[]) {
  return values.reduce<T | undefined>((current, status) => {
    if (!current) return status;
    const currentRank = statusOrder[current as keyof typeof statusOrder] ?? 0;
    const statusRank = statusOrder[status as keyof typeof statusOrder] ?? 0;
    return statusRank >= currentRank ? status : current;
  }, undefined);
}

function resolveFlowStatuses(order: Order) {
  const lotStatus = getHighestStatus(
    order.items
      .map((item) => item.lot?.status)
      .filter(Boolean) as LotStatus[],
  );

  const packageStatus = getHighestStatus(
    order.items
      .flatMap((item) => item.lot?.packages ?? [])
      .map((pkg) => pkg.status)
      .filter(Boolean) as PackageStatus[],
  );

  const shipmentStatus = getHighestStatus(
    order.items
      .flatMap((item) => item.lot?.packages ?? [])
      .flatMap((pkg) => pkg.shipments.map((ship) => ship.shipment.status))
      .filter(Boolean) as ShipmentStatus[],
  );

  const hasLots = order.items.some((item) => item.lot);
  const cartStatus: CartStatus = (hasLots ? "TRANSFERRED_TO_LOTS" : "PAID") as CartStatus;

  return { cartStatus, lotStatus, packageStatus, shipmentStatus };
}

export default function OrdersPage() {
  const [selectedItem, setSelectedItem] = useState<{
    order: Order;
    item: OrderItem;
  } | null>(null);

  const { data: orders, isLoading, error } = api.order.getUserOrders.useQuery();

  const isUnauthorized = error?.data?.code === "UNAUTHORIZED";
  const resolvedOrders = orders ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-primary font-semibold text-sm">Mis pedidos</p>
          <h1 className="font-bold text-2xl text-foreground">Historial y seguimiento</h1>
          <p className="text-muted-foreground text-sm">
            Revisa el estado de tus compras completadas, abre los detalles por ítem y sigue cada envío.
          </p>
        </div>
        <Badge variant="outline" className="gap-2 rounded-full px-3 py-1">
          <PackageIcon className="h-4 w-4" />
          {resolvedOrders.length} pedido{resolvedOrders.length === 1 ? "" : "s"}
        </Badge>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border p-4 text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Cargando pedidos...
        </div>
      ) : null}

      {isUnauthorized ? (
        <Card>
          <CardHeader>
            <CardTitle>Inicia sesión para ver tus pedidos</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Esta sección muestra el historial de órdenes asociadas a tu cuenta.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && error && !isUnauthorized ? (
        <Card>
          <CardHeader>
            <CardTitle>No pudimos cargar tus pedidos</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Intenta nuevamente en unos segundos.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isUnauthorized && resolvedOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Aún no tienes pedidos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Completa tu primera compra para ver aquí el seguimiento por lote, paquete y envío.
          </CardContent>
        </Card>
      ) : null}

      <Accordion type="single" collapsible className="space-y-3">
        {resolvedOrders.map((order) => {
          const { counts, total } = summarizeStages(order.items);
          const aggregate = aggregateStatus(counts, total);
          const breakdown = formatBreakdown(counts);
          const totals = order.items.reduce(
            (acc, item) => {
              acc.quantity += item.quantity;
              acc.amount += item.quantity * (item.publicPrice ?? item.price);
              return acc;
            },
            { quantity: 0, amount: 0 },
          );
          const { cartStatus, lotStatus, packageStatus, shipmentStatus } = resolveFlowStatuses(order);
          const paidDate = order.paidAt ?? order.createdAt;

          return (
            <AccordionItem
              key={order.id}
              value={`order-${order.id}`}
              className="overflow-hidden rounded-xl border"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Pedido #{order.id} · {dayjs(paidDate).format("DD MMM YYYY")}
                    </p>
                    <p className="font-semibold text-base text-foreground">
                      {order.items.length} producto{order.items.length === 1 ? "" : "s"} ·{" "}
                      {formatCurrency(totals.amount)}
                    </p>
                    <p className="text-muted-foreground text-xs">{breakdown || "Sin avance aún"}</p>
                  </div>
                  <Badge className={cn("self-start text-xs", aggregate.tone)}>{aggregate.label}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 bg-card/40 p-4">
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">Resumen rápido</p>
                        <p className="text-muted-foreground text-xs">
                          {order.address?.fullAddress ?? "Sin dirección de entrega"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Total unidades: {totals.quantity}</p>
                        <p>Pagado: {dayjs(order.paidAt ?? order.createdAt).format("DD MMM YYYY")}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <OrderFlow
                        cartStatus={cartStatus}
                        lotStatus={lotStatus}
                        packageStatus={packageStatus}
                        shipmentStatus={shipmentStatus}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="flex items-center gap-2 font-semibold text-sm">
                      <Archive className="h-4 w-4 text-blue-500" />
                      Estado agregado
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm">{aggregate.description}</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>Entregados: {counts.DELIVERED}</p>
                      <p>En tránsito: {counts.IN_TRANSIT}</p>
                      <p>Listos / proveedor: {counts.PACKAGED + counts.CONFIRMED + counts.ORDER_SENT}</p>
                      <p>Completando lote: {counts.LOT_PENDING}</p>
                    </div>
                    {order.address ? (
                      <div className="mt-3 rounded-md bg-muted/60 p-2 text-xs">
                        <p className="font-semibold text-foreground">Envío a</p>
                        <p className="text-muted-foreground">{order.address.fullAddress}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <ScrollArea className="max-h-[480px] rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="hidden sm:table-cell">Cantidad</TableHead>
                        <TableHead className="hidden md:table-cell">Precio</TableHead>
                        <TableHead className="hidden md:table-cell">Subtotal</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item) => {
                        const stage = getItemStage(item as unknown as any);
                        const subtotal = item.quantity * (item.publicPrice ?? item.price);
                        return (
                          <TableRow key={item.id} className="align-top">
                            <TableCell>
                              <div className="font-semibold text-sm text-foreground">
                                {item.product.name}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {item.product.code ?? `Ítem ${item.id}`}
                              </p>
                              <p className="mt-1 text-muted-foreground text-xs">
                                {item.lot
                                  ? `Lote ${item.lot.id} · ${item.lot.supplier.name}`
                                  : "Aún sin lote"}
                              </p>
                            </TableCell>
                            <TableCell className="hidden font-medium text-sm sm:table-cell">
                              {item.quantity} {item.product.customerUnit ?? item.unit}
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground text-sm md:table-cell">
                              {formatCurrency(item.publicPrice ?? item.price)}
                            </TableCell>
                            <TableCell className="hidden font-semibold text-sm md:table-cell">
                              {formatCurrency(subtotal)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-muted text-foreground text-xs">
                                {cartStageCopy[stage].label}
                              </Badge>
                              <p className="text-muted-foreground text-[11px]">
                                {cartStageCopy[stage].description}
                              </p>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedItem({ order, item })}
                              >
                                Ver detalles
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Sheet open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Detalle de seguimiento</SheetTitle>
            <SheetDescription>
              Seguimiento independiente por ítem a través de lote, paquete y envío.
            </SheetDescription>
          </SheetHeader>
          {selectedItem ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Pedido #{selectedItem.order.id} ·{" "}
                    {dayjs(selectedItem.order.createdAt).format("DD MMM YYYY")}
                  </p>
                  <p className="font-semibold text-sm">{selectedItem.item.product.name}</p>
                </div>
                {selectedItem.item.lot ? (
                  <StatusBadge status={selectedItem.item.lot.status as any} />
                ) : null}
              </div>
              <OrderItemTrackingTimeline
                item={selectedItem.item}
                cartCreatedAt={selectedItem.order.createdAt}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
