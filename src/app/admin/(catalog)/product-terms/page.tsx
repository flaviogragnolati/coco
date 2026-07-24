import type { Metadata } from "next";
import { ProductTermsCrudClient } from "./_components/product-terms-crud-client";

export const metadata: Metadata = {
	title: "Términos de producto",
};

export default function ProductTermsCrudPage() {
	return <ProductTermsCrudClient />;
}
