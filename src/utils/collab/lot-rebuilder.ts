import type { Cart, Lot, LotItem, Product, Provider } from "~/types/collab";
import { createId } from "./id-generator";

/**
 * Check if a lot item has reached the minimum order quantity (MOQ)
 * @param lotItem - The lot item to check
 * @param products - Array of all products
 * @returns true if the lot item quantity meets or exceeds the product's MOQ
 */
export const lotItemReachedMoq = (
  lotItem: LotItem,
  products: Product[],
): boolean => {
  const product = products.find((item) => item.id === lotItem.productId);
  if (!product) return false;
  return lotItem.totalQty >= product.moqByProvider;
};

/**
 * Rebuild lots from paid carts by aggregating cart items per provider
 * This function preserves existing lot metadata (status, timestamps) when lots already exist
 *
 * @param carts - All carts in the system
 * @param products - All products
 * @param providers - All providers
 * @param previousLots - Existing lots to preserve metadata from
 * @returns Object containing rebuilt lots and lot items arrays
 */
export const rebuildLots = (
  carts: Cart[],
  products: Product[],
  providers: Provider[],
  previousLots: Lot[],
): { lots: Lot[]; lotItems: LotItem[] } => {
  const productById = new Map(products.map((product) => [product.id, product]));
  const lotByProvider = new Map(
    previousLots.map((lot) => [lot.providerId, lot]),
  );

  const lots: Lot[] = [];
  const lotItems: LotItem[] = [];

  for (const provider of providers) {
    const referenceLot = lotByProvider.get(provider.id);
    const aggregated = new Map<
      string,
      {
        totalQty: number;
        contributions: { userId: string; quantity: number }[];
      }
    >();

    // Aggregate items from all paid/transferred carts
    const paidCarts = carts.filter((cart) => cart.status !== "DRAFT");
    for (const cart of paidCarts) {
      for (const cartItem of cart.items) {
        const product = productById.get(cartItem.productId);
        if (!product || product.providerId !== provider.id) continue;

        const existing = aggregated.get(cartItem.productId);
        if (existing) {
          existing.totalQty += cartItem.quantity;
          const userContribution = existing.contributions.find(
            (c) => c.userId === cart.userId,
          );
          if (userContribution) {
            userContribution.quantity += cartItem.quantity;
          } else {
            existing.contributions.push({
              userId: cart.userId,
              quantity: cartItem.quantity,
            });
          }
        } else {
          aggregated.set(cartItem.productId, {
            totalQty: cartItem.quantity,
            contributions: [
              { userId: cart.userId, quantity: cartItem.quantity },
            ],
          });
        }
      }
    }

    // Skip if no reference lot exists and no items aggregated
    if (!referenceLot && aggregated.size === 0) {
      continue;
    }

    // Create lot items from aggregated data
    const lotId = referenceLot?.id ?? createId(`lot-${provider.id}`);
    const items: LotItem[] = Array.from(aggregated.entries()).map(
      ([productId, info], index) => ({
        id: createId(`lot-item-${index}`),
        lotId,
        productId,
        totalQty: info.totalQty,
        contributions: info.contributions,
      }),
    );

    // Create or update lot
    const lot: Lot = {
      id: lotId,
      providerId: provider.id,
      status: referenceLot?.status ?? "PENDING",
      scheduledAt: referenceLot?.scheduledAt ?? new Date(),
      consolidatedAt: referenceLot?.consolidatedAt ?? null,
      orderSentAt: referenceLot?.orderSentAt ?? null,
      confirmedAt: referenceLot?.confirmedAt ?? null,
      items,
    };

    lots.push(lot);
    lotItems.push(...items);
  }

  return { lots, lotItems };
};
