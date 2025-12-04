import type {
  Cart,
  CartItem,
  CartStatus,
  Lot,
  LotItem,
  LotStatus,
  Package,
  PackageStatus,
  Product,
  Provider,
  Shipment,
  ShipmentPackage,
  ShipmentStatus,
} from "~/schema/collab";

export type {
  Cart,
  CartItem,
  CartStatus,
  Lot,
  LotItem,
  LotStatus,
  Package,
  PackageStatus,
  Product,
  Provider,
  Shipment,
  ShipmentPackage,
  ShipmentStatus,
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "ally" | "admin";
  preferredDelivery: string;
  address: string;
}
