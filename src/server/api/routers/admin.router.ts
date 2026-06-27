import { createTRPCRouter } from "~/server/api/trpc";
import { addressRouter } from "./admin/address.router";
import { brandRouter } from "./admin/brand.router";
import { carrierRouter } from "./admin/carrier.router";
import { cartTraceabilityRouter } from "./admin/cart-traceability.router";
import { destinationRouter } from "./admin/destination.router";
import { lotRouter } from "./admin/lot.router";
import { operationRouter } from "./admin/operation.router";
import { operationsCartRouter } from "./admin/operations-cart.router";
import { packageRouter } from "./admin/package.router";
import { paymentRouter } from "./admin/payment.router";
import { productRouter } from "./admin/product.router";
import { productClientTermsRouter } from "./admin/product-client-terms.router";
import { productLocalConstraintsRouter } from "./admin/product-local-constraints.router";
import { productSupplierTermsRouter } from "./admin/product-supplier-terms.router";
import { shipmentRouter } from "./admin/shipment.router";
import { supplierRouter } from "./admin/supplier.router";
import { adminTrackingRouter } from "./admin/tracking.router";
import { userRouter } from "./admin/user.router";

export const adminRouter = createTRPCRouter({
	address: addressRouter,
	brand: brandRouter,
	carrier: carrierRouter,
	cartTraceability: cartTraceabilityRouter,
	destination: destinationRouter,
	lot: lotRouter,
	operation: operationRouter,
	operationsCart: operationsCartRouter,
	package: packageRouter,
	payment: paymentRouter,
	product: productRouter,
	productClientTerms: productClientTermsRouter,
	productLocalConstraints: productLocalConstraintsRouter,
	productSupplierTerms: productSupplierTermsRouter,
	shipment: shipmentRouter,
	supplier: supplierRouter,
	tracking: adminTrackingRouter,
	user: userRouter,
});
