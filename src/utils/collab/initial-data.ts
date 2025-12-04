import type {
  Cart,
  CartItem,
  Lot,
  LotItem,
  Package,
  Product,
  Provider,
  Shipment,
} from "~/types/collab";
import type { User } from "~/types/collab";

export interface InitialCollabData {
  products: Product[];
  providers: Provider[];
  users: User[];
  carts: Cart[];
  cartItems: CartItem[];
  lots: Lot[];
  lotItems: LotItem[];
  packages: Package[];
  shipments: Shipment[];
}

/**
 * Create initial data structure for collab store
 * This function can accept server-side data or return empty structure
 * @param serverData - Optional data from server
 * @returns Initial collab data structure
 */
export const createInitialData = (
  serverData?: Partial<InitialCollabData>,
): InitialCollabData => {
  return {
    products: serverData?.products ?? [],
    providers: serverData?.providers ?? [],
    users: serverData?.users ?? [],
    carts: serverData?.carts ?? [],
    cartItems: serverData?.cartItems ?? [],
    lots: serverData?.lots ?? [],
    lotItems: serverData?.lotItems ?? [],
    packages: serverData?.packages ?? [],
    shipments: serverData?.shipments ?? [],
  };
};

/**
 * Initialize collab store with data from client side
 * This can be called after store hydration to populate with fresh data
 * @param data - Data to initialize the store with
 * @returns The initialized data
 */
export const initCollabData = (
  data: Partial<InitialCollabData> = {},
): InitialCollabData => {
  return createInitialData(data);
};
