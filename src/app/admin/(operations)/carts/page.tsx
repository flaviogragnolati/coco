"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";

import { CartTable } from "~/components/tables/CartTable";
import { ProviderFilter } from "~/components/filters/ProviderFilter";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { api } from "~/trpc/react";

export default function CarritosPage() {
  const router = useRouter();
  const [providerId, setProviderId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data: carts = [], isLoading: cartsLoading } =
    api.cart.getAll.useQuery();
  const { data: products = [] } = api.products.getAllProducts.useQuery();
  const { data: suppliers = [] } = api.suppliers.getAllSuppliers.useQuery();

  // Extract users from cart data
  const users = useMemo(() => {
    const userMap = new Map();
    carts.forEach((cart) => {
      if (cart.user && !userMap.has(cart.user.id)) {
        userMap.set(cart.user.id, cart.user);
      }
    });
    return Array.from(userMap.values());
  }, [carts]);

  const utils = api.useUtils();

  const payMutation = api.cart.pay.useMutation({
    onSuccess: () => {
      // Refetch carts after payment
      void utils.cart.getAll.invalidate();
    },
  });

  const splitMutation = api.cart.splitToLots.useMutation({
    onSuccess: () => {
      // Refetch after splitting
      void utils.cart.getAll.invalidate();
    },
  });

  const filteredCarts = useMemo(() => {
    return carts.filter((cart) => {
      if (providerId) {
        const hasProvider = cart.items.some((item) => {
          const product = products.find((prod) => prod.id === item.productId);
          return product?.supplier.id === providerId;
        });
        if (!hasProvider) {
          return false;
        }
      }

      if (statusFilter && statusFilter !== "all") {
        return cart.status === statusFilter;
      }
      return true;
    });
  }, [carts, providerId, statusFilter, products]);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Carritos colaborativos
        </h1>
        <p className="text-sm text-slate-500">
          Administra las contribuciones individuales hacia compras mayoristas.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4 text-blue-500" />
          Filtros rápidos
        </div>
        <ProviderFilter
          providers={suppliers}
          value={providerId}
          onChange={(next) => setProviderId(next)}
        />
      </section>

      {cartsLoading ? (
        <div className="text-sm text-slate-500">Cargando carritos...</div>
      ) : (
        <CartTable
          carts={filteredCarts}
          products={products}
          users={users}
          onViewCart={(id) => {
            router.push(`/admin/carritos/${id}`);
          }}
          onPayCart={(id) => payMutation.mutate({ cartId: id })}
          onSplitCart={(id) => splitMutation.mutate({ cartId: id })}
        />
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Cobertura por proveedor
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => {
            const cartsForSupplier = carts.filter((cart) =>
              cart.items.some((item) => {
                const product = products.find(
                  (prod) => prod.id === item.productId,
                );
                return product?.supplier.id === supplier.id;
              }),
            );
            const statusCount = cartsForSupplier.reduce<Record<string, number>>(
              (acc, cart) => {
                acc[cart.status] = (acc[cart.status] ?? 0) + 1;
                return acc;
              },
              {},
            );
            return (
              <div
                key={supplier.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <p className="text-sm font-medium text-slate-700">
                  {supplier.name}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {Object.entries(statusCount).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center gap-2 rounded-full bg-white px-2 py-1"
                    >
                      <StatusBadge status={status} />
                      <span className="font-semibold text-slate-600">
                        {count}
                      </span>
                    </div>
                  ))}
                  {Object.entries(statusCount).length === 0 ? (
                    <span className="text-xs text-slate-400">
                      Sin contribuciones
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
