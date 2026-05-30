import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutClient } from "~/app/checkout/_components/checkout-client";
import { assertActiveUser } from "~/server/auth/auth.utils";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
	title: "Checkout | Coco",
	description: "Confirmá dirección, pago y resumen de tu pedido mayorista.",
};

export default async function CheckoutPage() {
	const session = await getSession();

	if (!session?.user) {
		redirect("/login?callbackURL=/checkout");
	}

	try {
		assertActiveUser(session.user);
	} catch {
		redirect("/?auth=inactive");
	}

	return <CheckoutClient userId={session.user.id} />;
}
