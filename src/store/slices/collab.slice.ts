import _ from "lodash";
import type { StateCreator } from "zustand";

import type { RootState } from "./root";
import type {
  Cart,
  CartItem,
  Lot,
  LotItem,
  Package,
  Product,
  Provider,
  Shipment,
  ShipmentPackage,
} from "~/types/collab";
import type { User } from "~/types/collab";
import type { StatusFilter } from "../types";
import { rebuildLots, lotItemReachedMoq } from "~/utils/collab/lot-rebuilder";
import { createId } from "~/utils/collab/id-generator";
import { createInitialData, initCollabData } from "~/utils/collab/initial-data";

export interface ScheduleConfig {
  weeklyCutoffDay: number;
  autoConsolidate: boolean;
}

export interface FiltersState {
  providerId: string | null;
  weekNumber: number;
  status: StatusFilter;
}

export interface CollabState {
  // Core entities
  products: Product[];
  providers: Provider[];
  users: User[];

  // Cart management
  carts: Cart[];
  cartItems: CartItem[];
  selectedCartId: string | null;

  // Lot management (consolidated orders)
  lots: Lot[];
  lotItems: LotItem[];

  // Package & shipment management
  packages: Package[];
  shipments: Shipment[];

  // Configuration
  scheduleConfig: ScheduleConfig;

  // UI state (per-slice, not persisted)
  filters: FiltersState;
}

export interface CollabActions {
  // Data initialization
  initData: (data?: Partial<CollabState>) => void;

  // Cart actions
  addToCart: (params: {
    cartId: string;
    productId: string;
    quantity: number;
  }) => void;
  removeFromCart: (itemId: string) => void;
  payCart: (cartId: string) => void;
  splitCartIntoLots: (cartId: string) => void;
  selectCart: (cartId: string | null) => void;

  // Lot actions
  recalculateLots: () => void;
  markReadyToOrder: (lotId: string) => void;
  sendOrder: (lotId: string) => void;
  confirmByProvider: (lotId: string) => void;

  // Package actions
  generatePackages: (lotId: string) => void;
  setReadyForPickup: (packageId: string) => void;
  markInTransit: (packageId: string) => void;
  markDelivered: (packageId: string) => void;

  // Shipment actions
  assembleShipment: (packageIds: string[], carrierName?: string) => void;
  startTransit: (shipmentId: string) => void;
  arrive: (shipmentId: string) => void;
  close: (shipmentId: string) => void;

  // UI actions
  setFilter: (filter: Partial<FiltersState>) => void;
}

export type CollabSliceState = CollabState & CollabActions;

export const defaultInitialState: CollabState = {
  ...createInitialData(),
  selectedCartId: null,
  scheduleConfig: {
    weeklyCutoffDay: 3,
    autoConsolidate: true,
  },
  filters: {
    providerId: null,
    weekNumber: 1,
    status: "all",
  },
};

/**
 * Factory function that creates the collab slice with the initial state
 * and the actions that can be performed on the slice.
 * @param initState - The initial state of the collab slice
 */
export const createCollabSlice: (
  initState?: Partial<CollabState>,
) => StateCreator<
  RootState,
  [
    ["zustand/persist", unknown],
    ["zustand/devtools", never],
    ["zustand/immer", never],
  ],
  [],
  CollabSliceState
> = (initState) => {
  const initialState = _.merge({}, defaultInitialState, initState);

  return (set, get) => ({
    ...initialState,

    // Data initialization
    initData: (data) =>
      set((draft) => {
        const initialized = initCollabData(data);
        Object.assign(draft, initialized);
      }),

    // Cart actions
    addToCart: ({ cartId, productId, quantity }) => {
      if (quantity <= 0) return;

      set((draft) => {
        const product = draft.products.find((item) => item.id === productId);
        if (!product) return;
        if (quantity % product.minFractionPerUser !== 0) return;

        const cartIndex = draft.carts.findIndex((cart) => cart.id === cartId);
        if (cartIndex === -1) return;

        const itemIndex = draft.cartItems.findIndex(
          (item) => item.cartId === cartId && item.productId === productId,
        );

        if (itemIndex >= 0) {
          // Update existing item
          const existingItem = draft.cartItems[itemIndex];
          if (existingItem) {
            existingItem.quantity += quantity;
          }
          const cart = draft.carts[cartIndex];
          if (cart) {
            const cartItemRef = cart.items.find(
              (item) => item.productId === productId,
            );
            if (cartItemRef) {
              cartItemRef.quantity += quantity;
            }
          }
        } else {
          // Create new item
          const newItem: CartItem = {
            id: createId("cart-item"),
            cartId,
            productId,
            quantity,
          };
          draft.cartItems.push(newItem);
          const cart = draft.carts[cartIndex];
          if (cart) {
            cart.items.push(newItem);
          }
        }
      });
    },

    removeFromCart: (itemId) => {
      set((draft) => {
        const itemIndex = draft.cartItems.findIndex(
          (item) => item.id === itemId,
        );
        if (itemIndex === -1) return;

        const item = draft.cartItems[itemIndex];
        if (!item) return;

        // Remove from cartItems array
        draft.cartItems.splice(itemIndex, 1);

        // Remove from cart.items
        const cart = draft.carts.find((c) => c.id === item.cartId);
        if (cart) {
          cart.items = cart.items.filter((i) => i.id !== itemId);
        }
      });
    },

    payCart: (cartId) => {
      set((draft) => {
        const cart = draft.carts.find((c) => c.id === cartId);
        if (cart && cart.status === "DRAFT") {
          cart.status = "PAID";
          cart.paidAt = new Date();
        }
      });
    },

    splitCartIntoLots: (cartId) => {
      const state = get();
      const cart = state.carts.find((item) => item.id === cartId);
      if (!cart || cart.status !== "PAID") return;

      set((draft) => {
        const cartToUpdate = draft.carts.find((item) => item.id === cartId);
        if (cartToUpdate) {
          cartToUpdate.status = "TRANSFERRED_TO_LOTS";
        }
      });

      // Trigger lot recalculation
      get().recalculateLots();
    },

    selectCart: (cartId) => {
      set((draft) => {
        draft.selectedCartId = cartId;
      });
    },

    // Lot actions
    recalculateLots: () => {
      set((draft) => {
        const rebuilt = rebuildLots(
          draft.carts,
          draft.products,
          draft.providers,
          draft.lots,
        );
        draft.lots = rebuilt.lots;
        draft.lotItems = rebuilt.lotItems;
      });
    },

    markReadyToOrder: (lotId) => {
      set((draft) => {
        const lot = draft.lots.find((item) => item.id === lotId);
        if (!lot || lot.status !== "PENDING") return;

        const allComplete = lot.items.every((item) =>
          lotItemReachedMoq(item, draft.products),
        );
        if (!allComplete) return;

        lot.status = "READY_TO_ORDER";
        lot.consolidatedAt = new Date();
      });
    },

    sendOrder: (lotId) => {
      set((draft) => {
        const lot = draft.lots.find((item) => item.id === lotId);
        if (lot && lot.status === "READY_TO_ORDER") {
          lot.status = "ORDER_SENT";
          lot.orderSentAt = new Date();
        }
      });
    },

    confirmByProvider: (lotId) => {
      set((draft) => {
        const lot = draft.lots.find((item) => item.id === lotId);
        if (lot && lot.status === "ORDER_SENT") {
          lot.status = "CONFIRMED_BY_PROVIDER";
          lot.confirmedAt = new Date();
        }
      });
    },

    // Package actions
    generatePackages: (lotId) => {
      set((draft) => {
        const lot = draft.lots.find((item) => item.id === lotId);
        if (!lot) return;

        const existing = draft.packages.filter((pkg) => pkg.lotId === lotId);
        if (existing.length > 0) {
          console.warn(`Packages already exist for lot ${lotId}`);
          return;
        }

        const packages: Package[] = lot.items.map((item, index) => ({
          id: createId(`package-${index + 1}`),
          lotId,
          status: "READY_FOR_PICKUP",
          weight: Number((5 + index * 1.5).toFixed(1)),
          volume: Number((0.8 + index * 0.3).toFixed(1)),
        }));

        draft.packages.push(...packages);

        const lotToUpdate = draft.lots.find((item) => item.id === lotId);
        if (lotToUpdate) {
          lotToUpdate.status = "PACKAGED";
        }
      });
    },

    setReadyForPickup: (packageId) => {
      set((draft) => {
        const pkg = draft.packages.find((p) => p.id === packageId);
        if (pkg) {
          pkg.status = "READY_FOR_PICKUP";
        }
      });
    },

    markInTransit: (packageId) => {
      set((draft) => {
        const pkg = draft.packages.find((p) => p.id === packageId);
        if (pkg) {
          pkg.status = "IN_TRANSIT";
        }
      });
    },

    markDelivered: (packageId) => {
      set((draft) => {
        const pkg = draft.packages.find((p) => p.id === packageId);
        if (pkg) {
          pkg.status = "DELIVERED";
        }

        // Check if all packages in the shipment are delivered
        for (const shipment of draft.shipments) {
          const shipmentPackageIds = shipment.packages.map(
            (sp) => sp.packageId,
          );
          if (shipmentPackageIds.includes(packageId)) {
            const allDelivered = shipmentPackageIds.every((pkgId) => {
              const p = draft.packages.find((pkg) => pkg.id === pkgId);
              return p?.status === "DELIVERED";
            });

            if (allDelivered && shipment.status === "IN_TRANSIT") {
              shipment.status = "ARRIVED";
              shipment.arrivedAt = new Date();
            }
          }
        }
      });
    },

    // Shipment actions
    assembleShipment: (packageIds, carrierName = "Logística comunitaria") => {
      if (packageIds.length === 0) return;

      set((draft) => {
        const selected = draft.packages.filter((pkg) =>
          packageIds.includes(pkg.id),
        );
        if (selected.length === 0) return;

        const shipmentId = createId("shipment");
        const shipmentPackages: ShipmentPackage[] = selected.map(
          (pkg, index) => ({
            id: createId(`shipment-package-${index}`),
            shipmentId,
            packageId: pkg.id,
          }),
        );

        const shipment: Shipment = {
          id: shipmentId,
          status: "ASSEMBLING",
          carrierName,
          packages: shipmentPackages,
          startedAt: null,
          eta: null,
          arrivedAt: null,
        };

        draft.shipments.push(shipment);
      });
    },

    startTransit: (shipmentId) => {
      set((draft) => {
        const shipment = draft.shipments.find((item) => item.id === shipmentId);
        if (!shipment || shipment.status !== "ASSEMBLING") return;

        shipment.status = "IN_TRANSIT";
        shipment.startedAt = new Date();

        // Calculate estimated arrival (e.g., 3 days from now)
        const eta = new Date();
        eta.setDate(eta.getDate() + 3);
        shipment.eta = eta;

        // Update all packages to IN_TRANSIT
        for (const sp of shipment.packages) {
          const pkg = draft.packages.find((p) => p.id === sp.packageId);
          if (pkg) {
            pkg.status = "IN_TRANSIT";
          }
        }
      });
    },

    arrive: (shipmentId) => {
      set((draft) => {
        const shipment = draft.shipments.find((item) => item.id === shipmentId);
        if (shipment && shipment.status === "IN_TRANSIT") {
          shipment.status = "ARRIVED";
          shipment.arrivedAt = new Date();
        }
      });
    },

    close: (shipmentId) => {
      set((draft) => {
        const shipment = draft.shipments.find((item) => item.id === shipmentId);
        if (!shipment || shipment.status !== "ARRIVED") return;

        // Validate all packages are delivered
        const allDelivered = shipment.packages.every((sp) => {
          const pkg = draft.packages.find((p) => p.id === sp.packageId);
          return pkg?.status === "DELIVERED";
        });

        if (!allDelivered) {
          console.warn(
            `Cannot close shipment ${shipmentId}: not all packages delivered`,
          );
          return;
        }

        shipment.status = "CLOSED";
      });
    },

    // UI actions
    setFilter: (filter) => {
      set((draft) => {
        draft.filters = { ...draft.filters, ...filter };
      });
    },
  });
};
