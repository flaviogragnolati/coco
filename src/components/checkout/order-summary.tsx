"use client";

import type { ReactNode } from "react";
import { Package, Timer, Truck } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { formatCurrency } from "~/lib/utils";
import type { CartLine } from "~/store/slices/cart.slice";
import type { PaymentMethod } from "~/store/slices/checkout.slice";
import type { RouterOutputs } from "~/trpc/react";

type Address = RouterOutputs["addresses"]["getUserAddresses"][number];

type OrderSummaryProps = {
  items: CartLine[];
  address?: Address | null;
  eta?: Date | string | null;
  paymentMethod: PaymentMethod;
  totalAmount: number;
};

const paymentLabels: Record<PaymentMethod, string> = {
  credit_card: "Tarjeta",
  wire_transfer: "Transferencia",
};

const formatEta = (eta?: Date | string | null) => {
  if (!eta) return "7-14 días hábiles";
  const date = typeof eta === "string" ? new Date(eta) : eta;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export function OrderSummary({
  items,
  address,
  eta,
  paymentMethod,
  totalAmount,
}: OrderSummaryProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Resumen</CardTitle>
          <p className="text-muted-foreground text-sm">
            Productos, envío y estimación de entrega.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Package className="h-4 w-4" />
          {totalItems} ítems
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="font-semibold text-sm">Entrega</p>
          <div className="mt-1 text-muted-foreground text-sm">
            {address ? (
              <>
                <p className="text-foreground">{address.fullAddress}</p>
                <p>
                  {address.city}, {address.state}, {address.country}
                </p>
              </>
            ) : (
              <p>Selecciona una dirección para continuar.</p>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-56 rounded-lg border">
          <div className="divide-y">
            {items.map((item) => {
              const price = item.product.publicPrice ?? item.product.price ?? 0;
              const subtotal = price * item.quantity;
              return (
                <div
                  key={item.product.id}
                  className="flex items-start justify-between gap-3 p-3"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{item.product.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.quantity} x {formatCurrency(price)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">
                    {formatCurrency(subtotal)}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        <div className="space-y-2">
          <SummaryRow label="Subtotal" value={formatCurrency(totalAmount)} />
          <SummaryRow label="Envío" value="Se calcula al consolidar" />
          <SummaryRow
            label="Pago"
            value={
              <span className="flex items-center gap-2">
                <Badge variant="secondary" className="h-6">
                  {paymentLabels[paymentMethod]}
                </Badge>
              </span>
            }
          />
          <SummaryRow
            label={
              <span className="flex items-center gap-1">
                <Timer className="h-4 w-4 text-muted-foreground" />
                ETA
              </span>
            }
            value={formatEta(eta)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Truck className="h-4 w-4" />
            Preparando lote colaborativo
          </div>
          <p className="font-semibold text-lg">{formatCurrency(totalAmount)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
