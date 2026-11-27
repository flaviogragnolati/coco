import {
	AlertCircleIcon,
	ClockIcon,
	PackageCheckIcon,
	ReceiptTextIcon,
	ShoppingBagIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type MercadoPagoReturnTone = "success" | "failure" | "pending";

/**
 * Only the button Mercado Pago sent the customer back with is known here, not
 * the payment: the copy says what to expect and where to look, never that the
 * order is confirmed. A known order never reaches this page; it lands on the
 * order itself (ADR 0015).
 */
const copyByTone = {
	success: {
		title: "Volviste de Mercado Pago",
		description:
			"Si el pago se aprobó, tu pedido queda confirmado en unos minutos. Lo ves en Mis pedidos.",
		Icon: PackageCheckIcon,
		iconClassName: "bg-brand-soft text-brand-soft-foreground",
	},
	pending: {
		title: "Mercado Pago está procesando tu pago",
		description:
			"Puede tardar unos minutos, o hasta dos días hábiles si elegiste pagar en efectivo. Lo ves en Mis pedidos.",
		Icon: ClockIcon,
		iconClassName: "bg-highlight/20 text-foreground",
	},
	failure: {
		title: "Mercado Pago no aprobó el pago",
		description:
			"No se cobró nada. Tu pedido quedó guardado: podés intentar de nuevo o pagar por transferencia desde Tu pedido.",
		Icon: AlertCircleIcon,
		iconClassName: "bg-destructive/10 text-destructive",
	},
} satisfies Record<
	MercadoPagoReturnTone,
	{
		title: string;
		description: string;
		Icon: typeof ClockIcon;
		iconClassName: string;
	}
>;

export function MercadoPagoReturnPage({
	tone,
}: {
	tone: MercadoPagoReturnTone;
}) {
	const copy = copyByTone[tone];
	const ToneIcon = copy.Icon;

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 md:px-6">
			<section
				aria-labelledby="mercadopago-return-title"
				className="flex flex-col gap-5 rounded-[22px] border bg-card p-6"
			>
				<span
					className={cn(
						"flex size-12 items-center justify-center rounded-full",
						copy.iconClassName,
					)}
				>
					<ToneIcon aria-hidden="true" className="size-6" />
				</span>
				<div className="flex flex-col gap-2">
					<h1
						className="font-bold font-heading text-[clamp(24px,4vw,32px)] leading-tight tracking-tight"
						id="mercadopago-return-title"
					>
						{copy.title}
					</h1>
					<p>{copy.description}</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button asChild variant="highlight">
						<Link href="/my-orders">
							<ReceiptTextIcon data-icon="inline-start" />
							Ver mis pedidos
						</Link>
					</Button>
					{tone === "failure" ? (
						<Button asChild variant="outline">
							<Link href="/cart">
								<ShoppingBagIcon data-icon="inline-start" />
								Ir a tu pedido
							</Link>
						</Button>
					) : null}
				</div>
			</section>
		</main>
	);
}
