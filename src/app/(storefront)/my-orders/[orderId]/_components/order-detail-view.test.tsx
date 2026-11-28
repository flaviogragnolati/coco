import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { buildTutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import { OrderDetailView } from "./order-detail-view";

it("shows the payment that paid the order after an older Mercado Pago attempt is approved", () => {
	const { order, journeyItems } = buildTutorialFixtures(
		new Date("2026-11-13T12:00:00.000Z"),
	).orderDetail("delivered");
	const paid = order.transactions[0];
	if (!paid) throw new Error("Missing paid attempt");
	const cancelledTransfer = {
		...paid,
		id: paid.id + 1,
		status: "cancelled" as const,
		amount: "31410.00",
		subtotalAmount: "34900.00",
		transferDiscountPercent: "10",
		transferDiscountAmount: "3490.00",
		externalTransactionId: "CANCELLED-TRANSFER",
		paymentMethod: {
			...paid.paymentMethod,
			label: "Pago externo",
			details: "Transferencia bancaria",
		},
	};
	const html = renderToStaticMarkup(
		<OrderDetailView
			journeyItems={journeyItems}
			order={{ ...order, transactions: [cancelledTransfer, paid] }}
		/>,
	);

	expect(html).toContain("Aprobado");
	expect(html).toContain("MP-EJEMPLO");
	expect(html).toContain("Mercado Pago");
	expect(html).not.toContain("CANCELLED-TRANSFER");
	expect(html).not.toContain("Pago externo");
	expect(html).not.toContain("Total a transferir");
});
