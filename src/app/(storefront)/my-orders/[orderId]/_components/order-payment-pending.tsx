import { WalletIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";

/**
 * A Mercado Pago payment the customer still has to finish, or one the provider
 * did not approve. Paying again, or switching to a transfer, happens on the
 * order page, which confirms again on the same order (ADR 0015).
 */
export function OrderPaymentPending({ rejected }: { rejected: boolean }) {
	return (
		<section
			aria-labelledby="payment-pending-title"
			className="flex flex-col gap-3 rounded-[22px] border bg-card p-5"
		>
			<h2
				className="font-heading font-semibold text-xl"
				id="payment-pending-title"
			>
				{rejected ? "Probá pagar de nuevo" : "Terminá de pagar"}
			</h2>
			<p className="text-sm">
				{rejected
					? "Mercado Pago no aprobó el pago y no se cobró nada. Tu pedido quedó guardado: podés intentar de nuevo o pagar por transferencia."
					: "Tu pedido quedó guardado, no hace falta armarlo de nuevo. Podés pagar en Mercado Pago o cambiar a transferencia."}
			</p>
			<Button asChild className="self-start" variant="highlight">
				<Link href="/cart">
					<WalletIcon data-icon="inline-start" />
					Elegir cómo pagar
				</Link>
			</Button>
		</section>
	);
}
