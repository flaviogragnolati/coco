import "server-only";

import { cache } from "react";

import { api } from "~/trpc/server";

/**
 * The customer's orders, read once per request: the layout lists them and the
 * index page opens the latest one.
 */
export const loadMyOrders = cache(() => api.orders.listMine());
