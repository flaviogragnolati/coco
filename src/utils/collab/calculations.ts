import type { Cart, Lot, LotItem, Package, Product, Shipment } from "~/types/collab";

export const calculateCartTotals = (cart: Cart, products: Product[]) => {
  let totalItems = 0;
  let totalAmount = 0;

  cart.items.forEach((item) => {
    const product = products.find((prod) => prod.id === item.productId);
    if (!product) return;
    totalItems += item.quantity;
    totalAmount += item.quantity * product.price;
  });

  return {
    totalItems,
    totalAmount,
  };
};

export const calculateLotProgress = (lot: Lot, products: Product[]) => {
  const items = lot.items.map((item) => {
    const product = products.find((prod) => prod.id === item.productId);
    if (!product) {
      return {
        productId: item.productId,
        totalQty: item.totalQty,
        moq: 0,
        progress: 0,
      };
    }
    const progress = product.moqByProvider
      ? Math.min(1, item.totalQty / product.moqByProvider)
      : 0;

    return {
      productId: item.productId,
      totalQty: item.totalQty,
      moq: product.moqByProvider,
      progress,
    };
  });

  const overallProgress =
    items.reduce((acc, item) => acc + item.progress, 0) / (items.length || 1);

  return { items, overallProgress };
};

export const packagesByStatus = (packages: Package[]) => {
  return packages.reduce<Record<string, number>>((acc, pkg) => {
    acc[pkg.status] = (acc[pkg.status] ?? 0) + 1;
    return acc;
  }, {});
};

export const activeShipments = (shipments: Shipment[]) =>
  shipments.filter((shipment) => shipment.status === "IN_TRANSIT");

export const lotHasMetMoq = (
  lotItem: LotItem,
  products: Product[],
) => {
  const product = products.find((prod) => prod.id === lotItem.productId);
  if (!product) return false;
  return lotItem.totalQty >= product.moqByProvider;
};
