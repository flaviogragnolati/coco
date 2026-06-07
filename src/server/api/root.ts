import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { adminRouter } from "./routers/admin.router";
import { cartRouter } from "./routers/cart.router";
import { catalogRouter } from "./routers/catalog.router";
import { checkoutRouter } from "./routers/checkout.router";
import { companyRouter } from "./routers/company.router";
import { ordersRouter } from "./routers/orders.router";
import { profileRouter } from "./routers/profile.router";
import { trackingRouter } from "./routers/tracking.router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	admin: adminRouter,
	cart: cartRouter,
	catalog: catalogRouter,
	checkout: checkoutRouter,
	company: companyRouter,
	orders: ordersRouter,
	profile: profileRouter,
	tracking: trackingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
