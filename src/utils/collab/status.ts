import type {
  CartStatus,
  LotStatus,
  PackageStatus,
  ShipmentStatus,
} from "~/schema/collab";

type StatusStyle = {
  label: string;
  color: string;
  background: string;
};

export const cartStatusCopy: Record<CartStatus, StatusStyle> = {
  DRAFT: {
    label: "Borrador",
    color: "text-muted-foreground",
    background: "bg-muted",
  },
  PAID: {
    label: "Pagado",
    color: "text-emerald-600",
    background: "bg-emerald-100",
  },
  TRANSFERRED_TO_LOTS: {
    label: "En lotes",
    color: "text-blue-600",
    background: "bg-blue-100",
  },
};

export const lotStatusCopy: Record<LotStatus, StatusStyle> = {
  PENDING: {
    label: "Pendiente",
    color: "text-muted-foreground",
    background: "bg-muted",
  },
  READY_TO_ORDER: {
    label: "Listo para ordenar",
    color: "text-amber-600",
    background: "bg-amber-100",
  },
  ORDER_SENT: {
    label: "Orden enviada",
    color: "text-blue-600",
    background: "bg-blue-100",
  },
  CONFIRMED_BY_PROVIDER: {
    label: "Confirmado",
    color: "text-emerald-600",
    background: "bg-emerald-100",
  },
  PACKAGED: {
    label: "Empaquetado",
    color: "text-purple-600",
    background: "bg-purple-100",
  },
};

export const packageStatusCopy: Record<PackageStatus, StatusStyle> = {
  CREATED: {
    label: "Creado",
    color: "text-muted-foreground",
    background: "bg-muted",
  },
  READY_FOR_PICKUP: {
    label: "Listo para retiro",
    color: "text-amber-600",
    background: "bg-amber-100",
  },
  IN_TRANSIT: {
    label: "En tránsito",
    color: "text-blue-600",
    background: "bg-blue-100",
  },
  DELIVERED: {
    label: "Entregado",
    color: "text-emerald-600",
    background: "bg-emerald-100",
  },
};

export const shipmentStatusCopy: Record<ShipmentStatus, StatusStyle> = {
  ASSEMBLING: {
    label: "Armando envío",
    color: "text-purple-600",
    background: "bg-purple-100",
  },
  IN_TRANSIT: {
    label: "En tránsito",
    color: "text-blue-600",
    background: "bg-blue-100",
  },
  ARRIVED: {
    label: "Arribado",
    color: "text-emerald-600",
    background: "bg-emerald-100",
  },
  CLOSED: {
    label: "Cerrado",
    color: "text-muted-foreground",
    background: "bg-muted",
  },
};

export const statusOrder = {
  DRAFT: 0,
  PAID: 1,
  TRANSFERRED_TO_LOTS: 2,
  PENDING: 0,
  READY_TO_ORDER: 1,
  ORDER_SENT: 2,
  CONFIRMED_BY_PROVIDER: 3,
  PACKAGED: 4,
  CREATED: 0,
  READY_FOR_PICKUP: 1,
  IN_TRANSIT: 2,
  DELIVERED: 3,
  ASSEMBLING: 0,
  IN_TRANSIT: 1,
  ARRIVED: 2,
  CLOSED: 3,
} as const;
