import { cn } from "~/lib/utils";
import {
  cartStatusCopy,
  lotStatusCopy,
  packageStatusCopy,
  shipmentStatusCopy,
} from "~/utils/collab/status";
import type {
  CartStatus,
  LotStatus,
  PackageStatus,
  ShipmentStatus,
} from "~/schema/collab";

type StatusKind = CartStatus | LotStatus | PackageStatus | ShipmentStatus;

const statusMap: Record<
  string,
  {
    label: string;
    color: string;
    background: string;
  }
> = {
  ...cartStatusCopy,
  ...lotStatusCopy,
  ...packageStatusCopy,
  ...shipmentStatusCopy,
};

export interface StatusBadgeProps {
  status: StatusKind;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const descriptor = statusMap[status] ?? {
    label: status,
    color: "text-muted-foreground",
    background: "bg-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
        descriptor.background,
        descriptor.color,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {descriptor.label}
    </span>
  );
}
