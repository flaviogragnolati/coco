import type { Metadata } from "next";
import { WeeklyClosingClient } from "./_components/weekly-closing-client";

export const metadata: Metadata = {
	title: "Cierre semanal",
};

export default function WeeklyClosingPage() {
	return <WeeklyClosingClient />;
}
