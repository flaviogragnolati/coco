import type {
  CartStatus,
  LotStatus,
  PackageStatus,
  ShipmentStatus,
} from "~/schema/collab/enums";

export type ShipmentTrace = {
  id: number;
  trackingId: string;
  carrierName: string;
  status: ShipmentStatus;
  eta?: string | null;
  startedAt?: string | null;
  arrivedAt?: string | null;
};

export type PackageTrace = {
  id: string;
  status: PackageStatus;
  createdAt?: string | null;
  weight?: number | null;
  volume?: number | null;
  shipments: {
    shipment: ShipmentTrace;
  }[];
};

export type LotTrace = {
  id: string;
  status: LotStatus;
  scheduledAt: string;
  consolidatedAt?: string | null;
  orderSentAt?: string | null;
  confirmedAt?: string | null;
  provider: {
    id: string;
    name: string;
    contact: string;
    pickupPolicy: string;
  };
  packages: PackageTrace[];
  totalQuantityForProductInLot?: number;
};

export type ProductTrace = {
  id: number;
  name: string;
  description?: string | null;
  images: string[];
  code: string;
  price: number;
  priceUnit: string;
  customerMoq: number;
  customerUnit: string;
  minFractionPerUser: number;
  moqByProvider: number;
};

export type CartItemTrace = {
  id: string;
  quantity: number;
  price: number;
  product: ProductTrace;
  lot?: LotTrace;
};

export type CartWithTraceability = {
  id: string;
  status: CartStatus;
  paidAt?: string | null;
  createdAt: string;
  address?: {
    fullAddress: string;
    street: string;
    number: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    description?: string | null;
  } | null;
  items: CartItemTrace[];
};
