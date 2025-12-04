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
  ShipmentStatus,
  User,
} from "~/types/collab";

export type StatusFilter =
  | CartStatus
  | LotStatus
  | PackageStatus
  | ShipmentStatus
  | "all";

export interface PaginationState {
  [resource: string]: { page: number; pageSize: number };
}

export interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

export interface ModalState {
  open: boolean;
  action: string | null;
  payload?: unknown;
}

export interface ScheduleConfig {
  weeklyCutoffDay: number;
  autoConsolidate: boolean;
}

export interface FiltersState {
  providerId: string | null;
  weekNumber: number;
  status: StatusFilter;
}

export interface AppData {
  products: Product[];
  providers: Provider[];
  users: User[];
  carts: Cart[];
  cartItems: CartItem[];
  selectedCartId: string | null;
  lots: Lot[];
  lotItems: LotItem[];
  packages: Package[];
  shipments: Shipment[];
  scheduleConfig: ScheduleConfig;
  filters: FiltersState;
  pagination: PaginationState;
  toast: ToastState | null;
  modal: ModalState;
}

export interface AppActions {
  addToCart: (params: {
    cartId: string;
    productId: string;
    quantity: number;
  }) => void;
  removeFromCart: (itemId: string) => void;
  payCart: (cartId: string) => void;
  splitCartIntoLots: (cartId: string) => void;
  selectCart: (cartId: string | null) => void;
  recalculateLots: () => void;
  markReadyToOrder: (lotId: string) => void;
  sendOrder: (lotId: string) => void;
  confirmByProvider: (lotId: string) => void;
  generatePackages: (lotId: string) => void;
  setReadyForPickup: (packageId: string) => void;
  markInTransit: (packageId: string) => void;
  markDelivered: (packageId: string) => void;
  assembleShipment: (packageIds: string[], carrierName?: string) => void;
  startTransit: (shipmentId: string) => void;
  arrive: (shipmentId: string) => void;
  close: (shipmentId: string) => void;
  setFilter: (filter: Partial<FiltersState>) => void;
  setPagination: (
    resource: string,
    pagination: { page: number; pageSize: number },
  ) => void;
  setToast: (toast: ToastState | null) => void;
  openModal: (params: { action: string; payload?: unknown }) => void;
  closeModal: () => void;
}

export type AppState = AppData & AppActions;
