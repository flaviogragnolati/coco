import { Suspense } from "react";
import { CartItemsTable } from "~/components/cart-overview/CartItemsTable";
import { CartSummaryCard } from "~/components/cart-overview/CartSummaryCard";
import { AppLink } from "~/components/ui/app-link";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { CartWithTraceability } from "~/types/cart-trace";

async function getCartWithTraceability(): Promise<CartWithTraceability | null> {
  // TODO: Reemplazar con la carga real desde Prisma/acciones del servidor.
  return { items: [] };
}

export default async function CartPage() {
  const cart = await getCartWithTraceability();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="font-semibold text-primary text-sm">
          Carrito colaborativo
        </p>
        <h1 className="font-bold text-2xl text-foreground">Visión general</h1>
        <p className="text-muted-foreground text-sm">
          Revisa el estado completo del carrito, lotes y envíos antes de
          confirmar tu compra mayorista.
        </p>
      </header>

      <Suspense fallback={<CartLoadingState />}>
        <CartPageContent cart={cart} isLoading={false} />
      </Suspense>
    </main>
  );
}

function CartPageContent({
  cart,
  isLoading,
}: {
  cart: CartWithTraceability | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <CartLoadingState />;
  }

  if (!cart || cart.items?.length === 0) {
    return <EmptyCartState />;
  }

  return (
    <Tabs defaultValue="resumen">
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="items">Detalle de ítems</TabsTrigger>
      </TabsList>
      <TabsContent value="resumen">
        <CartSummaryCard cart={cart} />
      </TabsContent>
      <TabsContent value="items" className="space-y-4">
        <CartSummaryCard cart={cart} />
        <CartItemsTable cart={cart} />
      </TabsContent>
    </Tabs>
  );
}

function EmptyCartState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/60 p-10 text-center">
      <p className="font-semibold text-foreground text-lg">
        No tienes un carrito activo
      </p>
      <p className="max-w-md text-muted-foreground text-sm">
        Aún no agregaste productos a tu compra colaborativa. Explora el catálogo
        y suma cantidades respetando el mínimo por usuario.
      </p>
      <div className="flex gap-2">
        <Button variant="outline">Ver carritos</Button>
        <AppLink href="/" asButton buttonVariant="default">
          Ir a productos
        </AppLink>
      </div>
    </div>
  );
}

function CartLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
