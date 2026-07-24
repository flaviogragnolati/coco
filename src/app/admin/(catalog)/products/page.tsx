import type { Metadata } from "next";
import { ProductCrudClient } from "./_components/product-crud-client";

export const metadata: Metadata = {
	title: "Productos",
};

export default function ProductsCrudPage() {
	return <ProductCrudClient />;
}
