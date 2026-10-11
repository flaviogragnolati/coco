import type { Metadata } from "next";
import { CategoryCrudClient } from "./_components/category-crud-client";

export const metadata: Metadata = {
	title: "Categorías",
};

export default function CategoriesCrudPage() {
	return <CategoryCrudClient />;
}
