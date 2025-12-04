"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { QuantityInput } from "~/components/forms/QuantityInput";
import { OrderFlow } from "~/components/steps/OrderFlow";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { api } from "~/trpc/react";
import { calculateCartTotals } from "~/utils/collab/calculations";

export default function CartDetailPage() {
  const params = useParams<{ cartId: string }>();
  const router = useRouter();
  const cartId = Number(params?.cartId);
  
  const { data: cart, isLoading } = api.cart.getById.useQuery({ cartId });
  const { data: products = [] } = api.products.getAllProducts.useQuery();
  
  const utils = api.useUtils();
  
  const payMutation = api.cart.pay.useMutation({
    onSuccess: () => void utils.cart.getById.invalidate({ cartId }),
  });
  
  const addItemMutation = api.cart.addItem.useMutation({
    onSuccess: () => void utils.cart.getById.invalidate({ cartId }),
  });
  
  const updateItemMutation = api.cart.updateItemQuantity.useMutation({
    onSuccess: () => void utils.cart.getById.invalidate({ cartId }),
  });
  
  const removeItemMutation = api.cart.removeItem.useMutation({
    onSuccess: () => void utils.cart.getById.invalidate({ cartId }),
  });
  
  const splitMutation = api.cart.splitToLots.useMutation({
    onSuccess: () => {
      void utils.cart.getById.invalidate({ cartId });
      router.push("/lotes");
    },
  });

  const metrics = useMemo(() => {
    if (!cart) {
      return { totalItems: 0, totalAmount: 0 };
    }
    return calculateCartTotals(cart, products);
  }, [cart, products]);

  if (isLoading) {
    return <div className="p-6">Cargando carrito...</div>;
  }

  if (!cart) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <p className="text-sm text-slate-500">Carrito no encontrado.</p>
      </div>
    );
  }

  const handleQuantityChange = (itemId: number, productId: number, nextQuantity: number) => {
    const item = cart.items.find((cartItem) => cartItem.id === itemId);
    const product = products.find((prod) => prod.id === productId);
    if (!item || !product) return;

    if (nextQuantity <= 0) {
      removeItemMutation.mutate({ itemId });
      return;
    }
    if (nextQuantity === item.quantity) return;
    if (nextQuantity % product.minFractionPerUser !== 0) return;

    updateItemMutation.mutate({
      itemId,
      quantity: nextQuantity,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">
          Carrito #{cart.id} · <span className="text-slate-500">{cart.user?.name ?? "Usuario"}</span>
        </h1>
      </div>

      <OrderFlow
        cartStatus={cart.status}
        lotStatus={cart.status === "TRANSFERRED_TO_LOTS" ? "PENDING" : undefined}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Detalle del carrito</h2>
            <p className="text-sm text-slate-500">
              Ajusta cantidades respetando la fracción mínima sugerida por el distribuidor.
            </p>
          </div>
          <StatusBadge status={cart.status} />
        </header>

        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Fracción mínima</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cart.items.map((item) => {
              const product = products.find((prod) => prod.id === item.productId) ?? item.product;
              if (!product) {
                return null;
              }
              const subtotal = item.quantity * product.price;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-slate-800">
                      {product.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      SKU {product.sku} · {product.unit}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.minFractionPerUser} {product.unit}
                  </TableCell>
                  <TableCell>
                    <QuantityInput
                      value={item.quantity}
                      minFraction={product.minFractionPerUser}
                      onChange={(next) =>
                        handleQuantityChange(item.id, product.id, next)
                      }
                      disabled={cart.status !== "DRAFT"}
                    />
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${subtotal.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Total de piezas:{" "}
            <span className="font-semibold text-slate-800">{metrics.totalItems}</span>
          </div>
          <div className="text-xl font-semibold text-slate-900">
            Total: ${metrics.totalAmount.toFixed(2)}
          </div>
        </footer>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {cart.status === "DRAFT" ? (
          <Button onClick={() => payMutation.mutate({ cartId: cart.id })}>Pagar carrito</Button>
        ) : null}
        {cart.status === "PAID" ? (
          <Button variant="secondary" onClick={() => splitMutation.mutate({ cartId: cart.id })}>
            Dividir a lotes
          </Button>
        ) : null}
      </section>
    </div>
  );
}
