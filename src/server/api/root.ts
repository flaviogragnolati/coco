import { orderRouter } from "~/server/api/routers/order.router";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { supplierRouter } from "./routers/supplier.router";
import { productRouter } from "./routers/product.router";
import { categoryRouter } from "./routers/category.router";
import { carrierRouter } from "./routers/carrier.router";
import { addressRouter } from "./routers/address.router";
import { channelRouter } from "./routers/channel.router";
import { cartRouter } from "./routers/cart.router";
import { lotRouter } from "./routers/lot.router";
import { packageRouter } from "./routers/package.router";
import { shipmentRouter } from "./routers/shipment.router";

export const appRouter = createTRPCRouter({
  suppliers: supplierRouter,
  products: productRouter,
  order: orderRouter,
  categories: categoryRouter,
  carriers: carrierRouter,
  addresses: addressRouter,
  channels: channelRouter,
  cart: cartRouter,
  lot: lotRouter,
  package: packageRouter,
  shipment: shipmentRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
