import { createTRPCRouter } from "~/server/api/trpc";
import { addressRouter } from "./admin/address.router";
import { brandRouter } from "./admin/brand.router";
import { carrierRouter } from "./admin/carrier.router";
import { destinationRouter } from "./admin/destination.router";
import { operationsCartRouter } from "./admin/operations-cart.router";
import { productRouter } from "./admin/product.router";
import { productClientTermsRouter } from "./admin/product-client-terms.router";
import { productLocalConstraintsRouter } from "./admin/product-local-constraints.router";
import { productSupplierTermsRouter } from "./admin/product-supplier-terms.router";
import { supplierRouter } from "./admin/supplier.router";
import { adminTrackingRouter } from "./admin/tracking.router";
import { userRouter } from "./admin/user.router";

export const adminRouter = createTRPCRouter({
	address: addressRouter,
	brand: brandRouter,
	carrier: carrierRouter,
	destination: destinationRouter,
	operationsCart: operationsCartRouter,
	product: productRouter,
	productClientTerms: productClientTermsRouter,
	productLocalConstraints: productLocalConstraintsRouter,
	productSupplierTerms: productSupplierTermsRouter,
	supplier: supplierRouter,
	tracking: adminTrackingRouter,
	user: userRouter,
});
