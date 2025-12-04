import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import dayjs from "dayjs";
import {
  CalendarClock,
  CreditCard,
  MapPin,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { formatCurrency } from "~/lib/utils";
import type { CartWithTraceability } from "~/types/cart-trace";
import { summarizeCart } from "~/utils/cart-trace";

interface CartSummaryCardProps {
  cart: CartWithTraceability;
}

const breakdownStyles = {
  inCart: "bg-slate-100 text-slate-800",
  inLots: "bg-amber-100 text-amber-800",
  orderedOrConfirmed: "bg-blue-100 text-blue-800",
  inTransit: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

export function CartSummaryCard({ cart }: CartSummaryCardProps) {
  const { totals, breakdown } = summarizeCart(cart);

  const breakdownEntries = [
    { key: "inCart", label: "En carrito", value: breakdown.inCart },
    { key: "inLots", label: "En lote / sin ordenar", value: breakdown.inLots },
    {
      key: "orderedOrConfirmed",
      label: "Ordenado / confirmado",
      value: breakdown.orderedOrConfirmed,
    },
    { key: "inTransit", label: "En tránsito", value: breakdown.inTransit },
    { key: "delivered", label: "Entregado", value: breakdown.delivered },
  ] as const;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-semibold text-lg">
            Resumen del carrito
          </CardTitle>
          <CardDescription>
            Estado global, montos y progreso hacia el MOQ.
          </CardDescription>
        </div>
        <StatusBadge status={cart.status} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
            label="Ítems únicos"
            value={totals.totalItems}
          />
          <SummaryTile
            icon={<Package className="h-5 w-5 text-amber-600" />}
            label="Cantidad total"
            value={totals.totalQuantity}
          />
          <SummaryTile
            icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
            label="Monto total"
            value={formatCurrency(totals.totalAmount)}
          />
          <SummaryTile
            icon={<Truck className="h-5 w-5 text-purple-600" />}
            label="Ítems en tránsito"
            value={breakdown.inTransit}
          />
        </div>

        <Separator />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <CalendarClock className="h-4 w-4 text-blue-500" />
                  Fechas clave
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Creado:{" "}
                    <span className="font-semibold text-foreground">
                      {dayjs(cart.createdAt).format("DD MMM YYYY")}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Pagado:{" "}
                    <span className="font-semibold text-foreground">
                      {cart.paidAt
                        ? dayjs(cart.paidAt).format("DD MMM YYYY")
                        : "Pendiente"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Dirección de envío
                </div>
                <p className="text-muted-foreground">
                  {cart.address?.fullAddress ?? "Sin dirección seleccionada"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-semibold text-foreground text-sm">
              Avance por etapa
            </p>
            <p className="text-muted-foreground text-xs">
              Cómo se distribuyen los ítems a lo largo del proceso.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {breakdownEntries.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                >
                  <span className="text-muted-foreground text-sm">
                    {entry.label}
                  </span>
                  <Badge className={breakdownStyles[entry.key]}>
                    {entry.value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SummaryTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
}

function SummaryTile({ icon, label, value }: SummaryTileProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {label}
          </p>
          <p className="font-semibold text-foreground text-lg">{value}</p>
        </div>
      </div>
    </div>
  );
}
