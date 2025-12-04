import { Fragment, useMemo, useState } from "react";
import { Boxes, ChevronDown, ChevronUp, Play, Truck } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { StatusBadge } from "~/components/badges/StatusBadge";
import type { Package, Shipment } from "~/types/collab";
import { packagesByStatus } from "~/utils/collab/calculations";
import { ConfirmAction } from "~/components/dialogs/ConfirmAction";

interface ShipmentTableProps {
  shipments: Shipment[];
  packages: Package[];
  onStart: (shipmentId: string) => void;
  onArrive: (shipmentId: string) => void;
  onClose: (shipmentId: string) => void;
}

export function ShipmentTable({
  shipments,
  packages,
  onStart,
  onArrive,
  onClose,
}: ShipmentTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const packageLookup = useMemo(() => {
    const map = new Map(packages.map((pkg) => [pkg.id, pkg]));
    return map;
  }, [packages]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Envío</TableHead>
            <TableHead>Transportista</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Paquetes</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const pkgStatus = packagesByStatus(
              shipment.packages
                .map((ref) => packageLookup.get(ref.packageId))
                .filter(Boolean) as Package[],
            );
            const isExpanded = expanded[shipment.id] ?? false;
            return (
              <Fragment key={shipment.id}>
                <TableRow>
                  <TableCell>{shipment.id}</TableCell>
                  <TableCell>{shipment.carrierName}</TableCell>
                  <TableCell>
                    <StatusBadge status={shipment.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Boxes className="h-3.5 w-3.5 text-blue-500" />
                        {shipment.packages.length} paquetes
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setExpanded((state) => ({
                            ...state,
                            [shipment.id]: !isExpanded,
                          }))
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    {shipment.status === "ASSEMBLING" ? (
                      <ConfirmAction
                        title="Comenzar tránsito"
                        onConfirm={() => onStart(shipment.id)}
                        trigger={
                          <Button size="sm" className="gap-1">
                            <Play className="h-4 w-4" />
                            Salida
                          </Button>
                        }
                      />
                    ) : null}
                    {shipment.status === "IN_TRANSIT" ? (
                      <ConfirmAction
                        title="Marcar arribo"
                        onConfirm={() => onArrive(shipment.id)}
                        trigger={
                          <Button variant="secondary" size="sm" className="gap-1">
                            <Truck className="h-4 w-4" />
                            Arribó
                          </Button>
                        }
                      />
                    ) : null}
                    {shipment.status === "ARRIVED" ? (
                      <ConfirmAction
                        title="Cerrar envío"
                        description="Verifica que todos los paquetes hayan sido entregados."
                        onConfirm={() => onClose(shipment.id)}
                        trigger={
                          <Button variant="outline" size="sm">
                            Cerrar
                          </Button>
                        }
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
                {isExpanded ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3">
                        {Object.entries(pkgStatus).map(([status, count]) => (
                          <div
                            key={status}
                            className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm"
                          >
                            <span>{status}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
