import type { Metadata } from "next";
import { RollOversClient } from "./_components/roll-overs-client";

export const metadata: Metadata = {
	title: "Rollovers",
};

export default function AdminRollOversPage() {
	return <RollOversClient />;
}
