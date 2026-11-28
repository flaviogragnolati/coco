import { redirect } from "next/navigation";

/**
 * There is no checkout screen any more: the customer finishes on the order
 * page (ADR 0015). Old links and bookmarks land there. The Mercado Pago return
 * pages under `/checkout/mercadopago` are separate routes and stay.
 */
export default function CheckoutPage() {
	redirect("/cart");
}
