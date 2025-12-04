import { useMemo } from "react";
import { ArrowRight, MoreHorizontal, Wallet } from "lucide-react";

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
import { calculateCartTotals } from "~/utils/collab/calculations";
import { getCartOwner } from "~/utils/collab/lookup";
import type { Cart, Product } from "~/types/collab";
import type { User } from "~/types/collab";
import { ConfirmAction } from "~/components/dialogs/ConfirmAction";

interface CartTableProps {
  carts: Cart[];
  products: Product[];
  users: User[];
  onViewCart: (cartId: string) => void;
  onPayCart: (cartId: string) => void;
  onSplitCart: (cartId: string) => void;
}

export function CartTable({
  carts,
  products,
  users,
  onViewCart,
  onPayCart,
  onSplitCart,
}: CartTableProps) {
  const enrichedCarts = useMemo(
    () =>
      carts.map((cart) => ({
        cart,
        owner: getCartOwner(cart, users),
        metrics: calculateCartTotals(cart, products),
      })),
    [carts, users, products],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Carrito</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrichedCarts.map(({ cart, owner, metrics }) => (
            <TableRow key={cart.id}>
              <TableCell className="font-medium">#{cart.id}</TableCell>
              <TableCell>{owner}</TableCell>
              <TableCell>
                <StatusBadge status={cart.status} />
              </TableCell>
              <TableCell>{metrics.totalItems}</TableCell>
              <TableCell className="text-right">
                ${metrics.totalAmount.toFixed(2)}
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewCart(cart.id)}
                >
                  Detalle
                </Button>
                {cart.status === "DRAFT" ? (
                  <ConfirmAction
                    title="Confirmar pago del carrito"
                    description="Esto marcará el carrito como pagado y se dividirá en el consolidado semanal."
                    onConfirm={() => onPayCart(cart.id)}
                    trigger={
                      <Button size="sm" className="gap-1">
                        <Wallet className="h-4 w-4" />
                        Pagar
                      </Button>
                    }
                  />
                ) : null}
                {cart.status === "PAID" ? (
                  <ConfirmAction
                    title="Enviar carrito a lotes"
                    description="Los ítems se agruparán con otros pedidos del mismo proveedor."
                    onConfirm={() => onSplitCart(cart.id)}
                    trigger={
                      <Button variant="secondary" size="sm" className="gap-1">
                        <ArrowRight className="h-4 w-4" />
                        Dividir
                      </Button>
                    }
                  />
                ) : null}
                {cart.status === "TRANSFERRED_TO_LOTS" ? (
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
