import { Suspense } from "react";

import { AddressesTable } from "~/components/admin/address";
import { AddressesPageSkeleton } from "~/components/admin/address/addresses-page-skeleton";
import { api } from "~/trpc/server";

async function AddressesContent() {
  const [addresses, suppliers, carriers] = await Promise.all([
    api.addresses.getAllAddresses(),
    api.suppliers.getAllSuppliers(),
    api.carriers.getAllCarriers(),
  ]);

  const totalAddresses = addresses.length;
  const activeAddresses = addresses.filter((address) => address.isActive).length;
  const supplierLinked = addresses.filter(
    (address) => Boolean(address.supplierId ?? address.supplier),
  ).length;
  const carrierLinked = addresses.filter(
    (address) => Boolean(address.carrierId ?? address.carrier),
  ).length;

  const supplierOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }));

  const carrierOptions = carriers.map((carrier) => ({
    id: carrier.id,
    name: carrier.name,
  }));

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Direcciones</h1>
        <p className="text-muted-foreground">
          Administra las direcciones asociadas a proveedores, transportistas y usuarios.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalAddresses}</div>
          <div className="text-muted-foreground text-sm">Total de direcciones</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{activeAddresses}</div>
          <div className="text-muted-foreground text-sm">Direcciones activas</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{supplierLinked}</div>
          <div className="text-muted-foreground text-sm">Vinculadas a proveedores</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{carrierLinked}</div>
          <div className="text-muted-foreground text-sm">Vinculadas a transportistas</div>
        </div>
      </div>

      <AddressesTable
        addresses={addresses}
        suppliers={supplierOptions}
        carriers={carrierOptions}
      />
    </div>
  );
}

export default function AddressesPage() {
  return (
    <Suspense fallback={<AddressesPageSkeleton />}>
      <AddressesContent />
    </Suspense>
  );
}
