import type { Metadata } from "next";
import { UserCartsClient } from "./_components/user-carts-client";

export const metadata: Metadata = {
	title: "Carritos",
};

export default function AdminOperationsUserCartsPage() {
	return <UserCartsClient />;
}
