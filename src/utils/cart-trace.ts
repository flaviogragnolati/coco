import type { CartItemTrace, CartWithTraceability } from "~/types/cart-trace";

export type CartItemStage =
  | "IN_CART"
  | "LOT_PENDING"
  | "ORDER_SENT"
  | "CONFIRMED"
  | "PACKAGED"
  | "IN_TRANSIT"
  | "DELIVERED";

export type CartStageBreakdown = {
  inCart: number;
  inLots: number;
  orderedOrConfirmed: number;
  inTransit: number;
  delivered: number;
};

export const cartStageCopy: Record<
  CartItemStage,
  { label: string; description: string }
> = {
  IN_CART: {
    label: "En carrito",
    description: "Aún no asignado a lote",
  },
  LOT_PENDING: {
    label: "En lote / completando cupo",
    description: "Sumando unidades para alcanzar el MOQ",
  },
  ORDER_SENT: {
    label: "Orden enviada al proveedor",
    description: "El pedido fue enviado al proveedor",
  },
  CONFIRMED: {
    label: "Confirmado por proveedor",
    description: "Proveedor confirmó la orden",
  },
  PACKAGED: {
    label: "Empaquetado",
    description: "Listo para retiro o envío",
  },
  IN_TRANSIT: {
    label: "En tránsito",
    description: "En camino al destino",
  },
  DELIVERED: {
    label: "Entregado",
    description: "Pedido entregado",
  },
};

export function getItemStage(item: CartItemTrace): CartItemStage {
  if (!item.lot) {
    return "IN_CART";
  }

  const lot = item.lot;
  const hasDeliveredPackage =
    lot.packages.some((pkg) => pkg.status === "DELIVERED") ||
    lot.packages.some((pkg) =>
      pkg.shipments.some((ship) =>
        ["ARRIVED", "CLOSED"].includes(ship.shipment.status),
      ),
    );
  if (hasDeliveredPackage) {
    return "DELIVERED";
  }

  const hasInTransit =
    lot.packages.some((pkg) => pkg.status === "IN_TRANSIT") ||
    lot.packages.some((pkg) =>
      pkg.shipments.some((ship) => ship.shipment.status === "IN_TRANSIT"),
    );
  if (hasInTransit) {
    return "IN_TRANSIT";
  }

  if (
    lot.status === "PACKAGED" ||
    lot.packages.some((pkg) =>
      ["CREATED", "READY_FOR_PICKUP"].includes(pkg.status),
    )
  ) {
    return "PACKAGED";
  }

  if (lot.status === "CONFIRMED_BY_PROVIDER") {
    return "CONFIRMED";
  }

  if (lot.status === "ORDER_SENT") {
    return "ORDER_SENT";
  }

  return "LOT_PENDING";
}

export function summarizeCart(cart: CartWithTraceability) {
  const totals = cart.items.reduce(
    (acc, item) => {
      acc.totalItems += 1;
      acc.totalQuantity += item.quantity;
      acc.totalAmount += item.quantity * item.price;
      return acc;
    },
    { totalItems: 0, totalQuantity: 0, totalAmount: 0 },
  );

  const breakdown = cart.items.reduce<CartStageBreakdown>(
    (acc, item) => {
      const stage = getItemStage(item);
      if (stage === "IN_CART") acc.inCart += 1;
      else if (stage === "LOT_PENDING") acc.inLots += 1;
      else if (
        stage === "ORDER_SENT" ||
        stage === "CONFIRMED" ||
        stage === "PACKAGED"
      ) {
        acc.orderedOrConfirmed += 1;
      } else if (stage === "IN_TRANSIT") {
        acc.inTransit += 1;
      } else if (stage === "DELIVERED") {
        acc.delivered += 1;
      }
      return acc;
    },
    { inCart: 0, inLots: 0, orderedOrConfirmed: 0, inTransit: 0, delivered: 0 },
  );

  return { totals, breakdown };
}
