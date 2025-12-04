import { CheckCircle2, Circle, Package, ShoppingCart, Truck } from "lucide-react";

import { cn } from "~/lib/utils";
import { StatusBadge } from "~/components/badges/StatusBadge";
import type {
  CartStatus,
  LotStatus,
  PackageStatus,
  ShipmentStatus,
} from "~/schema/collab";

interface OrderFlowProps {
  cartStatus: CartStatus;
  lotStatus?: LotStatus;
  packageStatus?: PackageStatus;
  shipmentStatus?: ShipmentStatus;
}

const steps = [
  {
    id: "cart",
    label: "Carrito",
    icon: ShoppingCart,
  },
  {
    id: "lot",
    label: "Lote",
    icon: Package,
  },
  {
    id: "package",
    label: "Paquete",
    icon: Package,
  },
  {
    id: "shipment",
    label: "Envío",
    icon: Truck,
  },
  {
    id: "delivery",
    label: "Entrega",
    icon: CheckCircle2,
  },
] as const;

const resolveStepState = ({
  cartStatus,
  lotStatus,
  packageStatus,
  shipmentStatus,
}: OrderFlowProps) => {
  return steps.map((step) => {
    switch (step.id) {
      case "cart":
        return {
          ...step,
          active: cartStatus === "DRAFT",
          completed: cartStatus !== "DRAFT",
          status: cartStatus,
        };
      case "lot":
        return {
          ...step,
          active: cartStatus === "TRANSFERRED_TO_LOTS" && lotStatus === "PENDING",
          completed:
            lotStatus === "READY_TO_ORDER" ||
            lotStatus === "ORDER_SENT" ||
            lotStatus === "CONFIRMED_BY_PROVIDER" ||
            lotStatus === "PACKAGED",
          status: lotStatus,
        };
      case "package":
        return {
          ...step,
          active: lotStatus === "CONFIRMED_BY_PROVIDER",
          completed: packageStatus === "IN_TRANSIT" || packageStatus === "DELIVERED",
          status: packageStatus,
        };
      case "shipment":
        return {
          ...step,
          active: shipmentStatus === "IN_TRANSIT",
          completed: shipmentStatus === "ARRIVED" || shipmentStatus === "CLOSED",
          status: shipmentStatus,
        };
      case "delivery":
        return {
          ...step,
          active: packageStatus === "DELIVERED" && shipmentStatus !== "CLOSED",
          completed: shipmentStatus === "CLOSED",
          status: packageStatus,
        };
      default:
        return step;
    }
  });
};

export function OrderFlow(props: OrderFlowProps) {
  const stepState = resolveStepState(props);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {stepState.map((step, index) => (
          <div key={step.id} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2",
                step.completed
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                  : step.active
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-slate-50 text-slate-400",
              )}
            >
              <step.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-600">{step.label}</span>
            {step.status ? (
              <StatusBadge status={step.status as any} className="text-[10px]" />
            ) : null}
            {index < stepState.length - 1 ? (
              <span className="h-px w-full max-w-[90px] bg-slate-200" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
