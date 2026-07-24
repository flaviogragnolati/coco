import type { Metadata } from "next";
import { BrandCrudClient } from "./_components/brand-crud-client";

export const metadata: Metadata = {
	title: "Marcas",
};

export default function BrandsCrudPage() {
	return <BrandCrudClient />;
}
