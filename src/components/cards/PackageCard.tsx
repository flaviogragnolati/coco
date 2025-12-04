import { Package, Truck } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/badges/StatusBadge";
import type { Package as PackageEntity } from "~/types/collab";
import { getProviderName } from "~/utils/collab/lookup";
import type { Provider } from "~/types/collab";
import { ConfirmAction } from "~/components/dialogs/ConfirmAction";

interface PackageCardProps {
  pkg: PackageEntity;
  provider?: Provider | null;
  onReadyForPickup: (packageId: string) => void;
  onMarkInTransit: (packageId: string) => void;
  onMarkDelivered: (packageId: string) => void;
}

export function PackageCard({
  pkg,
  provider,
  onReadyForPickup,
  onMarkInTransit,
  onMarkDelivered,
}: PackageCardProps) {
  const providerName = provider ? provider.name : "Pendiente de asignación";

  return (
    <Card className="flex h-full flex-col justify-between border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">
            Paquete #{pkg.id}
          </CardTitle>
          <StatusBadge status={pkg.status} />
        </div>
        <p className="text-sm text-slate-500">
          Lote: <span className="font-medium text-slate-700">{pkg.lotId}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Package className="h-4 w-4 text-blue-500" />
          <span>
            Peso estimado: <strong>{pkg.weight ?? 0} kg</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Truck className="h-4 w-4 text-emerald-500" />
          <span>
            Operador: <strong>{providerName}</strong>
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Volumen aproximado: <strong>{pkg.volume ?? 0} m³</strong>
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        {pkg.status === "CREATED" ? (
          <ConfirmAction
            title="Marcar paquete listo para retiro"
            onConfirm={() => onReadyForPickup(pkg.id)}
            trigger={<Button size="sm">Listo para retiro</Button>}
          />
        ) : null}
        {pkg.status === "READY_FOR_PICKUP" ? (
          <ConfirmAction
            title="Enviar paquete en tránsito"
            onConfirm={() => onMarkInTransit(pkg.id)}
            trigger={
              <Button size="sm" variant="secondary">
                Enviar
              </Button>
            }
          />
        ) : null}
        {pkg.status === "IN_TRANSIT" ? (
          <ConfirmAction
            title="Marcar paquete como entregado"
            onConfirm={() => onMarkDelivered(pkg.id)}
            trigger={
              <Button size="sm" variant="outline">
                Entregar
              </Button>
            }
          />
        ) : null}
      </CardFooter>
    </Card>
  );
}
