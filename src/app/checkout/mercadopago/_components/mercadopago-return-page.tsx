import { ClockIcon, HomeIcon, ReceiptTextIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

type MercadoPagoReturnTone = "success" | "failure" | "pending";

const copyByTone = {
	success: {
		title: "Pago enviado a confirmación",
		description:
			"Mercado Pago informó un retorno exitoso. La orden se confirma cuando recibimos y reconciliamos el webhook del proveedor.",
	},
	failure: {
		title: "Pago no confirmado",
		description:
			"El retorno de Mercado Pago no confirma el pago. Podés revisar tus pedidos o intentar nuevamente si el intento queda fallido.",
	},
	pending: {
		title: "Pago pendiente",
		description:
			"Mercado Pago dejó el pago pendiente. La orden avanza cuando el proveedor confirme la aprobación.",
	},
} satisfies Record<
	MercadoPagoReturnTone,
	{ title: string; description: string }
>;

export function MercadoPagoReturnPage({
	tone,
}: {
	tone: MercadoPagoReturnTone;
}) {
	const copy = copyByTone[tone];

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ClockIcon />
						{copy.title}
					</CardTitle>
					<CardDescription>{copy.description}</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert>
						<ReceiptTextIcon />
						<AlertTitle>Estado sujeto a reconciliación</AlertTitle>
						<AlertDescription>
							Esta pantalla no actualiza el estado del pago. Usamos webhooks
							firmados y consulta al recurso de Mercado Pago como fuente de
							verdad.
						</AlertDescription>
					</Alert>
				</CardContent>
				<CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
					<Button asChild variant="outline">
						<Link href="/">
							<HomeIcon data-icon="inline-start" />
							Volver al inicio
						</Link>
					</Button>
					<Button asChild>
						<Link href="/my-operations">
							<ReceiptTextIcon data-icon="inline-start" />
							Ver mis pedidos
						</Link>
					</Button>
				</CardFooter>
			</Card>
		</main>
	);
}
