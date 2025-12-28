"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import type { CartLine } from "~/store/slices/cart.slice";
import { formatCurrency } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

type CartLineItemProps = {
  line: CartLine;
  onIncrement: (productId: number, step?: number) => void;
  onDecrement: (productId: number, step?: number) => void;
  onSetQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
};

export function CartLineItem({
  line,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onRemove,
}: CartLineItemProps) {
  const { product, quantity } = line;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const step = product.minFractionPerUser ?? 1;
  const image = product.images?.[0];

  const pricePerUnit = product.publicPrice ?? product.price;
  const priceUnit = product.publicPriceUnit ?? product.priceUnit;
  const subtotal = useMemo(() => quantity * pricePerUnit, [quantity, pricePerUnit]);

  const handleQuantityInput = (value: string) => {
    const next = Number(value);
    if (Number.isNaN(next) || next < 0) return;
    onSetQuantity(product.id, next);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative h-24 w-full overflow-hidden rounded-md bg-muted sm:h-24 sm:w-24">
        {image ? (
          <img src={image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-sm sm:text-base">{product.name}</p>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(pricePerUnit)} / {priceUnit}
            </p>
          </div>
          <p className="font-semibold text-base sm:text-lg">{formatCurrency(subtotal)}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => onDecrement(product.id, step)}
              disabled={quantity <= step}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={0}
              step={step}
              value={quantity}
              onChange={(event) => handleQuantityInput(event.target.value)}
              className="h-9 w-20 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => onIncrement(product.id, step)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Seguro que quieres quitar {product.name} del carrito?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onRemove(product.id);
                    setConfirmOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
