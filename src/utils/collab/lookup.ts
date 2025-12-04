import type { Cart, Product, Provider, User } from "~/types/collab";

export const getUserName = (userId: string, users: User[]) =>
  users.find((user) => user.id === userId)?.name ?? "Usuario";

export const getProviderName = (providerId: string, providers: Provider[]) =>
  providers.find((provider) => provider.id === providerId)?.name ?? "Proveedor";

export const getCartOwner = (cart: Cart, users: User[]) =>
  getUserName(cart.userId, users);

export const getProductName = (productId: string, products: Product[]) =>
  products.find((product) => product.id === productId)?.name ?? "Producto";
