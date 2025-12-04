import { AppLink } from "~/components/ui/app-link";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function AdminPage() {
  await delay(2000);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl tracking-tight">
          Panel administrativo
        </h1>
        <p className="text-muted-foreground">
          Selecciona un módulo para gestionar los recursos del marketplace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AppLink
          href="/admin/suppliers"
          asButton
          buttonVariant="default"
          className="justify-start"
        >
          Proveedores
        </AppLink>
        <AppLink
          href="/admin/products"
          asButton
          buttonVariant="secondary"
          className="justify-start"
        >
          Productos
        </AppLink>
        <AppLink
          href="/admin/categories"
          asButton
          buttonVariant="secondary"
          className="justify-start"
        >
          Categorías
        </AppLink>
        <AppLink
          href="/admin/carriers"
          asButton
          buttonVariant="secondary"
          className="justify-start"
        >
          Transportistas
        </AppLink>
        <AppLink
          href="/admin/addresses"
          asButton
          buttonVariant="secondary"
          className="justify-start"
        >
          Direcciones
        </AppLink>
        <AppLink
          href="/admin/channels"
          asButton
          buttonVariant="secondary"
          className="justify-start"
        >
          Canales
        </AppLink>
      </div>
    </div>
  );
}
