import { redirect } from "next/navigation";
import { findReturnOrderId } from "../_components/find-return-order";
import { orderReturnPath } from "../_components/mercadopago-return";
import { MercadoPagoReturnPage } from "../_components/mercadopago-return-page";

/**
 * Mercado Pago's success back URL. The route only says which button brought the
 * customer back; the order page reads how the payment actually stands.
 */
export default async function MercadoPagoSuccessPage({
	searchParams,
}: {
	searchParams: Promise<{ external_reference?: string | string[] }>;
}) {
	const orderId = await findReturnOrderId(await searchParams);
	if (orderId !== null) redirect(orderReturnPath(orderId));

	return <MercadoPagoReturnPage tone="success" />;
}
