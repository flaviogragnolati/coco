import { useMemo } from "react";
import { ArrowUpRight, CheckCircle, Send } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Progress } from "~/components/ui/progress";
import { StatusBadge } from "~/components/badges/StatusBadge";
import { calculateLotProgress } from "~/utils/collab/calculations";
import { getProviderName } from "~/utils/collab/lookup";
import type { Lot, Product, Provider } from "~/types/collab";
import { ConfirmAction } from "~/components/dialogs/ConfirmAction";

interface LotTableProps {
  lots: Lot[];
  providers: Provider[];
  products: Product[];
  onView: (lotId: string) => void;
  onReadyToOrder: (lotId: string) => void;
  onSendOrder: (lotId: string) => void;
  onConfirmProvider: (lotId: string) => void;
  onGeneratePackages: (lotId: string) => void;
}

export function LotTable({
  lots,
  providers,
  products,
  onView,
  onReadyToOrder,
  onSendOrder,
  onConfirmProvider,
  onGeneratePackages,
}: LotTableProps) {
  const enriched = useMemo(
    () =>
      lots.map((lot) => {
        const metrics = calculateLotProgress(lot, products);
        return {
          lot,
          providerName: getProviderName(lot.providerId, providers),
          metrics,
        };
      }),
    [lots, providers, products],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lote</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Progreso MOQ</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enriched.map(({ lot, providerName, metrics }) => (
            <TableRow key={lot.id}>
              <TableCell>{lot.id}</TableCell>
              <TableCell>{providerName}</TableCell>
              <TableCell>
                <StatusBadge status={lot.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <Progress value={metrics.overallProgress * 100} />
                  <span className="text-xs text-slate-500">
                    {Math.round(metrics.overallProgress * 100)}% consolidado
                  </span>
                </div>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onView(lot.id)}>
                  Ver
                </Button>
                {lot.status === "PENDING" ? (
                  <ConfirmAction
                    title="Marcar lote listo para ordenar"
                    description="Verificaremos que cada producto haya alcanzado el MOQ mínimo."
                    onConfirm={() => onReadyToOrder(lot.id)}
                    trigger={
                      <Button variant="secondary" size="sm" className="gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Listo
                      </Button>
                    }
                  />
                ) : null}
                {lot.status === "READY_TO_ORDER" ? (
                  <ConfirmAction
                    title="Enviar orden al proveedor"
                    description="Se notificará al proveedor para preparar el pedido mayorista."
                    onConfirm={() => onSendOrder(lot.id)}
                    trigger={
                      <Button size="sm" className="gap-1">
                        <Send className="h-4 w-4" />
                        Enviar
                      </Button>
                    }
                  />
                ) : null}
                {lot.status === "ORDER_SENT" ? (
                  <ConfirmAction
                    title="Confirmar recepción del proveedor"
                    onConfirm={() => onConfirmProvider(lot.id)}
                    trigger={
                      <Button size="sm" className="gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Confirmar
                      </Button>
                    }
                  />
                ) : null}
                {lot.status === "CONFIRMED_BY_PROVIDER" ? (
                  <ConfirmAction
                    title="Generar paquetes del lote"
                    description="Se crearán paquetes listos para retiro."
                    onConfirm={() => onGeneratePackages(lot.id)}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-1">
                        <ArrowUpRight className="h-4 w-4" />
                        Paquetes
                      </Button>
                    }
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
