import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import Image from "next/image";
import { cn, formatCurrency } from "~/lib/utils";
import type { CartWithTraceability } from "~/types/cart-trace";
import {
  type CartItemStage,
  cartStageCopy,
  getItemStage,
} from "~/utils/cart-trace";
import { CartItemTraceDialog } from "./CartItemTraceDialog";

interface CartItemsTableProps {
  cart: CartWithTraceability;
}

const stageClasses: Record<CartItemStage, string> = {
  IN_CART: "bg-slate-100 text-slate-800",
  LOT_PENDING: "bg-amber-100 text-amber-800",
  ORDER_SENT: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PACKAGED: "bg-purple-100 text-purple-800",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
};

export function CartItemsTable({ cart }: CartItemsTableProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-base">Ítems del carrito</p>
          <p className="text-muted-foreground text-sm">
            Estado rápido, MOQ por proveedor y trazabilidad por ítem.
          </p>
        </div>
        <Badge variant="outline">{cart.items.length} ítems</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="hidden md:table-cell">Cantidad</TableHead>
            <TableHead className="hidden lg:table-cell">
              Precio unitario
            </TableHead>
            <TableHead className="hidden lg:table-cell">Subtotal</TableHead>
            <TableHead className="hidden md:table-cell">
              MOQ proveedor
            </TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cart.items.map((item) => {
            const product = item.product;
            const lot = item.lot;
            const stage = getItemStage(item);
            const subtotal = item.quantity * item.price;
            const currentLotQuantity =
              lot?.totalQuantityForProductInLot ?? item.quantity;
            const targetMoq = product.moqByProvider;
            const lotProgress =
              targetMoq > 0
                ? Math.min(100, (currentLotQuantity / targetMoq) * 100)
                : 0;
            const imageSrc = product.images[0];

            return (
              <TableRow key={item.id} className="align-top">
                <TableCell>
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted">
                      {imageSrc ? (
                        <Image
                          src={imageSrc}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground text-sm">
                          {product.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">
                        {product.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Código {product.code}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Cantidad mínima por usuario:{" "}
                        <span className="font-semibold text-foreground">
                          {product.minFractionPerUser}
                        </span>
                      </p>
                      {lot ? (
                        <p className="text-muted-foreground text-xs">
                          Proveedor: {lot.provider.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-muted-foreground text-xs md:hidden">
                    <span>{item.quantity} uds</span>
                    <span>{formatCurrency(item.price)}</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden font-medium text-sm md:table-cell">
                  {item.quantity} {product.customerUnit}
                </TableCell>
                <TableCell className="hidden text-muted-foreground text-sm lg:table-cell">
                  {formatCurrency(item.price)} / {product.priceUnit}
                </TableCell>
                <TableCell className="hidden font-semibold text-sm lg:table-cell">
                  {formatCurrency(subtotal)}
                </TableCell>
                <TableCell className="hidden md:table-cell lg:max-w-[200px]">
                  {lot ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>En lote {lot.id}</span>
                        <span>
                          {currentLotQuantity} / {targetMoq} uds
                        </span>
                      </div>
                      <Progress value={lotProgress} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Sin lote
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", stageClasses[stage])}>
                    {cartStageCopy[stage].label}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground">
                    {cartStageCopy[stage].description}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <CartItemTraceDialog item={item} cart={cart} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
