"use client";

import Link from "next/link";
import { ShoppingBag, ShoppingBasket } from "lucide-react";

import { CartLineItem } from "~/components/cart/cart-line-item";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/store/cart-store";
import { formatCurrency } from "~/lib/utils";

export default function CartPage() {
  const {
    items,
    totalItems,
    totalAmount,
    incrementItem,
    decrementItem,
    setItemQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const hasItems = items.length > 0;

  if (!hasItems) {
    return <EmptyCartState />;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="font-semibold text-primary text-sm">Carrito colaborativo</p>
        <h1 className="font-bold text-2xl text-foreground">Tu carrito</h1>
        <p className="text-muted-foreground text-sm">
          Ajusta cantidades, revisa el total y procede al checkout cuando estés listo.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Productos</CardTitle>
              <p className="text-muted-foreground text-sm">
                {totalItems} {totalItems === 1 ? "artículo" : "artículos"} en tu carrito
              </p>
            </div>
            <ShoppingBasket className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((line) => (
              <CartLineItem
                key={line.product.id}
                line={line}
                onIncrement={incrementItem}
                onDecrement={decrementItem}
                onSetQuantity={setItemQuantity}
                onRemove={removeItem}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Resumen de compra</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span className="text-muted-foreground">Calculado al finalizar</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" size="lg" asChild>
              <Link href="/checkout">Proceder al checkout</Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Vaciar carrito
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Vaciar carrito</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará todos los productos de tu carrito. ¿Deseas continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearCart()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Vaciar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

function EmptyCartState() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <ShoppingBasket className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-lg">Tu carrito está vacío</p>
        <p className="text-muted-foreground text-sm">
          Explora el catálogo y agrega productos para empezar tu compra colaborativa.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/products">Ver productos</Link>
        </Button>
        <Button asChild>
          <Link href="/products">Empezar a comprar</Link>
        </Button>
      </div>
    </main>
  );
}
