"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";

import { LotTable } from "~/components/tables/LotTable";
import { ProviderFilter } from "~/components/filters/ProviderFilter";
import { api } from "~/trpc/react";

export default function LotesPage() {
  const router = useRouter();
  const [providerId, setProviderId] = useState<number | undefined>();

  const { data: lots = [] } = api.lot.getAll.useQuery();
  const { data: products = [] } = api.products.getAllProducts.useQuery();
  const { data: suppliers = [] } = api.suppliers.getAllSuppliers.useQuery();
  
  const utils = api.useUtils();
  
  const markReadyMutation = api.lot.markReady.useMutation({
    onSuccess: () => void utils.lot.getAll.invalidate(),
  });
  
  const sendOrderMutation = api.lot.sendOrder.useMutation({
    onSuccess: () => void utils.lot.getAll.invalidate(),
  });
  
  const confirmMutation = api.lot.confirm.useMutation({
    onSuccess: () => void utils.lot.getAll.invalidate(),
  });
  
  const createPackagesMutation = api.lot.createPackages.useMutation({
    onSuccess: () => {
      void utils.lot.getAll.invalidate();
      void utils.package.getAll.invalidate();
    },
  });

  const filteredLots = useMemo(() => {
    return lots.filter((lot) =>
      providerId ? lot.supplier.id === providerId : true,
    );
  }, [lots, providerId]);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Lotes por proveedor</h1>
        <p className="text-sm text-slate-500">
          Visualiza el avance de consolidación mayorista y coordina las órdenes.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4 text-purple-500" />
          Filtros
        </div>
        <ProviderFilter
          providers={suppliers}
          value={providerId}
          onChange={(next) => setProviderId(next)}
        />
      </section>

      <LotTable
        lots={filteredLots}
        providers={suppliers}
        products={products}
        onView={(id) => router.push(`/lotes/${id}`)}
        onReadyToOrder={(id) => markReadyMutation.mutate({ lotId: id })}
        onSendOrder={(id) => sendOrderMutation.mutate({ lotId: id })}
        onConfirmProvider={(id) => confirmMutation.mutate({ lotId: id })}
        onGeneratePackages={(id) => createPackagesMutation.mutate({ 
          lotId: id,
          numberOfPackages: 1,
        })}
      />
    </div>
  );
}
