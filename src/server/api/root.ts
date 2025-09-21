import { orderRouter } from "~/server/api/routers/order.router";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { supplierRouter } from "./routers/supplier.router";

export const appRouter = createTRPCRouter({
	suppliers: supplierRouter,
	order: orderRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
