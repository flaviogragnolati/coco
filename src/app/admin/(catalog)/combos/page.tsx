import type { Metadata } from "next";
import { ComboCrudClient } from "./_components/combo-crud-client";

export const metadata: Metadata = {
	title: "Combos",
};

export default function CombosCrudPage() {
	return <ComboCrudClient />;
}
