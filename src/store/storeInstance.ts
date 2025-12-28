// import { createInitialData } from "./initialData";
// import type { AppActions, AppData, FiltersState } from "./types";
// import type {
//   Cart,
//   CartItem,
//   Lot,
//   LotItem,
//   Package,
//   Product,
//   Provider,
//   Shipment,
//   ShipmentPackage,
// } from "~/types/collab";

// type Listener = (state: AppData) => void;
// type Updater = (state: AppData) => AppData;

// const listeners = new Set<Listener>();
// const notify = () => {
//   listeners.forEach((listener) => listener(state));
// };

// export const subscribeToState = (listener: Listener) => {
//   listeners.add(listener);
//   return () => {
//     listeners.delete(listener);
//   };
// };

// export const createId = (prefix: string) =>
//   `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

// const initialData = createInitialData();

// let state: AppData = {
//   products: initialData.products,
//   providers: initialData.providers,
//   users: initialData.users,
//   carts: initialData.carts,
//   cartItems: initialData.cartItems,
//   selectedCartId: initialData.carts.at(0)?.id ?? null,
//   lots: initialData.lots,
//   lotItems: initialData.lotItems,
//   packages: initialData.packages,
//   shipments: initialData.shipments,
//   scheduleConfig: {
//     weeklyCutoffDay: 3,
//     autoConsolidate: true,
//   },
//   filters: {
//     providerId: null,
//     weekNumber: 1,
//     status: "all",
//   } satisfies FiltersState,
//   pagination: {},
//   toast: null,
//   modal: { open: false, action: null },
// };

// const mutate = (updater: Updater) => {
//   state = updater(state);
//   notify();
//   return state;
// };

// const rebuildLots = (
//   carts: Cart[],
//   products: Product[],
//   providers: Provider[],
//   previousLots: Lot[],
// ) => {
//   const productById = new Map(products.map((product) => [product.id, product]));
//   const lotByProvider = new Map(
//     previousLots.map((lot) => [lot.providerId, lot]),
//   );

//   const lots: Lot[] = [];
//   const lotItems: LotItem[] = [];

//   providers.forEach((provider) => {
//     const referenceLot = lotByProvider.get(provider.id);
//     const aggregated = new Map<
//       string,
//       { totalQty: number; contributions: { userId: string; quantity: number }[] }
//     >();

//     carts
//       .filter((cart) => cart.status !== "DRAFT")
//       .forEach((cart) => {
//         cart.items.forEach((item) => {
//           const product = productById.get(item.productId);
//           if (!product || product.providerId !== provider.id) return;

//           const current =
//             aggregated.get(item.productId) ?? {
//               totalQty: 0,
//               contributions: [],
//             };
//           current.totalQty += item.quantity;
//           current.contributions = [
//             ...current.contributions,
//             { userId: cart.userId, quantity: item.quantity },
//           ];
//           aggregated.set(item.productId, current);
//         });
//       });

//     if (!referenceLot && aggregated.size === 0) {
//       return;
//     }

//     const lotId = referenceLot?.id ?? createId(`lot-${provider.id}`);
//     const items: LotItem[] = Array.from(aggregated.entries()).map(
//       ([productId, info], index) => {
//         const existing = referenceLot?.items.find(
//           (item) => item.productId === productId,
//         );
//         return {
//           id: existing?.id ?? `${lotId}-item-${index + 1}`,
//           lotId,
//           productId,
//           totalQty: info.totalQty,
//           contributions: info.contributions,
//         };
//       },
//     );

//     const lot: Lot = {
//       id: lotId,
//       providerId: provider.id,
//       status: referenceLot?.status ?? "PENDING",
//       scheduledAt: referenceLot?.scheduledAt ?? new Date(),
//       consolidatedAt: referenceLot?.consolidatedAt ?? null,
//       orderSentAt: referenceLot?.orderSentAt ?? null,
//       confirmedAt: referenceLot?.confirmedAt ?? null,
//       items,
//     };

//     lots.push(lot);
//     lotItems.push(...items);
//   });

//   return { lots, lotItems };
// };

// const lotItemReachedMoq = (lotItem: LotItem, products: Product[]) => {
//   const product = products.find((item) => item.id === lotItem.productId);
//   if (!product) return false;
//   return lotItem.totalQty >= product.moqByProvider;
// };

// export const appActions: AppActions = {
//   addToCart: ({ cartId, productId, quantity }) => {
//     if (quantity <= 0) return;
//     mutate((current) => {
//       const product = current.products.find((item) => item.id === productId);
//       if (!product) return current;
//       if (quantity % product.minFractionPerUser !== 0) return current;

//       const cartIndex = current.carts.findIndex((cart) => cart.id === cartId);
//       if (cartIndex === -1) return current;

//       const itemIndex = current.cartItems.findIndex(
//         (item) => item.cartId === cartId && item.productId === productId,
//       );

//       if (itemIndex >= 0) {
//         const updatedItem = {
//           ...current.cartItems[itemIndex]!,
//           quantity: current.cartItems[itemIndex]!.quantity + quantity,
//         };
//         const cartItems = current.cartItems.map((item, index) =>
//           index === itemIndex ? updatedItem : item,
//         );
//         const carts = current.carts.map((cart, index) =>
//           index === cartIndex
//             ? {
//                 ...cart,
//                 items: cart.items.map((item) =>
//                   item.id === updatedItem.id
//                     ? { ...item, quantity: item.quantity + quantity }
//                     : item,
//                 ),
//               }
//             : cart,
//         );
//         return { ...current, cartItems, carts };
//       }

//       const newItem: CartItem = {
//         id: createId("cart-item"),
//         cartId,
//         productId,
//         quantity,
//       };

//       return {
//         ...current,
//         cartItems: [...current.cartItems, newItem],
//         carts: current.carts.map((cart, index) =>
//           index === cartIndex
//             ? { ...cart, items: [...cart.items, newItem] }
//             : cart,
//         ),
//       };
//     });
//   },
//   removeFromCart: (itemId) => {
//     mutate((current) => {
//       const item = current.cartItems.find((cartItem) => cartItem.id === itemId);
//       if (!item) return current;

//       return {
//         ...current,
//         cartItems: current.cartItems.filter(
//           (cartItem) => cartItem.id !== itemId,
//         ),
//         carts: current.carts.map((cart) =>
//           cart.id === item.cartId
//             ? {
//                 ...cart,
//                 items: cart.items.filter((cartItem) => cartItem.id !== itemId),
//               }
//             : cart,
//         ),
//       };
//     });
//   },
//   payCart: (cartId) => {
//     mutate((current) => ({
//       ...current,
//       carts: current.carts.map((cart) =>
//         cart.id === cartId && cart.status === "DRAFT"
//           ? { ...cart, status: "PAID", paidAt: new Date() }
//           : cart,
//       ),
//     }));
//   },
//   splitCartIntoLots: (cartId) => {
//     const cart = state.carts.find((item) => item.id === cartId);
//     if (!cart || cart.status !== "PAID") return;

//     mutate((current) => ({
//       ...current,
//       carts: current.carts.map((item) =>
//         item.id === cartId ? { ...item, status: "TRANSFERRED_TO_LOTS" } : item,
//       ),
//     }));
//     appActions.recalculateLots();
//   },
//   selectCart: (cartId) => {
//     mutate((current) => ({ ...current, selectedCartId: cartId }));
//   },
//   recalculateLots: () => {
//     mutate((current) => {
//       const rebuilt = rebuildLots(
//         current.carts,
//         current.products,
//         current.providers,
//         current.lots,
//       );
//       return { ...current, ...rebuilt };
//     });
//   },
//   markReadyToOrder: (lotId) => {
//     mutate((current) => {
//       const lot = current.lots.find((item) => item.id === lotId);
//       if (!lot || lot.status !== "PENDING") return current;
//       const allComplete = lot.items.every((item) =>
//         lotItemReachedMoq(item, current.products),
//       );
//       if (!allComplete) return current;

//       return {
//         ...current,
//         lots: current.lots.map((item) =>
//           item.id === lotId
//             ? { ...item, status: "READY_TO_ORDER", consolidatedAt: new Date() }
//             : item,
//         ),
//       };
//     });
//   },
//   sendOrder: (lotId) => {
//     mutate((current) => ({
//       ...current,
//       lots: current.lots.map((item) =>
//         item.id === lotId && item.status === "READY_TO_ORDER"
//           ? { ...item, status: "ORDER_SENT", orderSentAt: new Date() }
//           : item,
//       ),
//     }));
//   },
//   confirmByProvider: (lotId) => {
//     mutate((current) => ({
//       ...current,
//       lots: current.lots.map((item) =>
//         item.id === lotId && item.status === "ORDER_SENT"
//           ? { ...item, status: "CONFIRMED_BY_PROVIDER", confirmedAt: new Date() }
//           : item,
//       ),
//     }));
//   },
//   generatePackages: (lotId) => {
//     mutate((current) => {
//       const lot = current.lots.find((item) => item.id === lotId);
//       if (!lot) return current;

//       const existing = current.packages.filter((pkg) => pkg.lotId === lotId);
//       if (existing.length > 0) {
//         return {
//           ...current,
//           lots: current.lots.map((item) =>
//             item.id === lotId ? { ...item, status: "PACKAGED" } : item,
//           ),
//         };
//       }

//       const packages: Package[] = lot.items.map((item, index) => ({
//         id: createId(`package-${index + 1}`),
//         lotId,
//         status: "READY_FOR_PICKUP",
//         weight: Number((5 + index * 1.5).toFixed(1)),
//         volume: Number((0.8 + index * 0.3).toFixed(1)),
//       }));

//       return {
//         ...current,
//         packages: [...current.packages, ...packages],
//         lots: current.lots.map((item) =>
//           item.id === lotId ? { ...item, status: "PACKAGED" } : item,
//         ),
//       };
//     });
//   },
//   setReadyForPickup: (packageId) => {
//     mutate((current) => ({
//       ...current,
//       packages: current.packages.map((pkg) =>
//         pkg.id === packageId ? { ...pkg, status: "READY_FOR_PICKUP" } : pkg,
//       ),
//     }));
//   },
//   markInTransit: (packageId) => {
//     mutate((current) => ({
//       ...current,
//       packages: current.packages.map((pkg) =>
//         pkg.id === packageId ? { ...pkg, status: "IN_TRANSIT" } : pkg,
//       ),
//     }));
//   },
//   markDelivered: (packageId) => {
//     mutate((current) => {
//       const packages = current.packages.map((pkg) =>
//         pkg.id === packageId ? { ...pkg, status: "DELIVERED" } : pkg,
//       );

//       const shipments = current.shipments.map((shipment) => {
//         if (
//           shipment.status === "IN_TRANSIT" &&
//           shipment.packages.some((ref) => ref.packageId === packageId)
//         ) {
//           const allDelivered = shipment.packages.every((ref) => {
//             const pkg = packages.find((item) => item.id === ref.packageId);
//             return pkg?.status === "DELIVERED";
//           });
//           if (allDelivered) {
//             return { ...shipment, status: "ARRIVED", arrivedAt: new Date() };
//           }
//         }
//         return shipment;
//       });

//       return { ...current, packages, shipments };
//     });
//   },
//   assembleShipment: (packageIds, carrierName = "Logística comunitaria") => {
//     if (packageIds.length === 0) return;
//     mutate((current) => {
//       const selected = current.packages.filter((pkg) =>
//         packageIds.includes(pkg.id),
//       );
//       if (selected.length === 0) return current;

//       const shipmentId = createId("shipment");
//       const shipmentPackages: ShipmentPackage[] = selected.map((pkg) => ({
//         shipmentId,
//         packageId: pkg.id,
//       }));

//       const newShipment: Shipment = {
//         id: shipmentId,
//         carrierName,
//         status: "ASSEMBLING",
//         eta: null,
//         startedAt: null,
//         arrivedAt: null,
//         packages: shipmentPackages,
//       };

//       return {
//         ...current,
//         shipments: [...current.shipments, newShipment],
//       };
//     });
//   },
//   startTransit: (shipmentId) => {
//     mutate((current) => {
//       const shipment = current.shipments.find((item) => item.id === shipmentId);
//       if (!shipment || shipment.status !== "ASSEMBLING") return current;

//       const packages = current.packages.map((pkg) =>
//         shipment.packages.some((ref) => ref.packageId === pkg.id)
//           ? { ...pkg, status: "IN_TRANSIT" }
//           : pkg,
//       );

//       const shipments = current.shipments.map((item) =>
//         item.id === shipmentId
//           ? {
//               ...item,
//               status: "IN_TRANSIT",
//               startedAt: new Date(),
//               eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
//             }
//           : item,
//       );

//       return { ...current, packages, shipments };
//     });
//   },
//   arrive: (shipmentId) => {
//     mutate((current) => ({
//       ...current,
//       shipments: current.shipments.map((item) =>
//         item.id === shipmentId && item.status === "IN_TRANSIT"
//           ? { ...item, status: "ARRIVED", arrivedAt: new Date() }
//           : item,
//       ),
//     }));
//   },
//   close: (shipmentId) => {
//     mutate((current) => {
//       const shipment = current.shipments.find((item) => item.id === shipmentId);
//       if (!shipment || shipment.status !== "ARRIVED") return current;

//       const allDelivered = shipment.packages.every((ref) => {
//         const pkg = current.packages.find((item) => item.id === ref.packageId);
//         return pkg?.status === "DELIVERED";
//       });
//       if (!allDelivered) return current;

//       return {
//         ...current,
//         shipments: current.shipments.map((item) =>
//           item.id === shipmentId ? { ...item, status: "CLOSED" } : item,
//         ),
//       };
//     });
//   },
//   setFilter: (filter) => {
//     mutate((current) => ({
//       ...current,
//       filters: { ...current.filters, ...filter },
//     }));
//   },
//   setPagination: (resource, pagination) => {
//     mutate((current) => ({
//       ...current,
//       pagination: { ...current.pagination, [resource]: pagination },
//     }));
//   },
//   setToast: (toast) => {
//     mutate((current) => ({ ...current, toast }));
//   },
//   openModal: ({ action, payload }) => {
//     mutate((current) => ({
//       ...current,
//       modal: { open: true, action, payload },
//     }));
//   },
//   closeModal: () => {
//     mutate((current) => ({
//       ...current,
//       modal: { open: false, action: null },
//     }));
//   },
// };

// export const getCurrentState = () => state;
