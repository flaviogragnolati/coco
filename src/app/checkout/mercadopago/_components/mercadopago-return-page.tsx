import {
	AlertCircleIcon,
	ClockIcon,
	HomeIcon,
	PackageCheckIcon,
	ReceiptTextIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
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
		Icon: PackageCheckIcon,
		iconClassName: "text-success",
		badgeLabel: "Retorno exitoso",
		badgeVariant: "success",
	},
	failure: {
		title: "Pago no confirmado",
		description:
			"El retorno de Mercado Pago no confirma el pago. Podés revisar tus pedidos o intentar nuevamente si el intento queda fallido.",
		Icon: AlertCircleIcon,
		iconClassName: "text-destructive",
		badgeLabel: "No confirmado",
		badgeVariant: "destructive",
	},
	pending: {
		title: "Pago pendiente",
		description:
			"Mercado Pago dejó el pago pendiente. La orden avanza cuando el proveedor confirme la aprobación.",
		Icon: ClockIcon,
		iconClassName: "text-warning",
		badgeLabel: "Pendiente",
		badgeVariant: "warning",
	},
} satisfies Record<
	MercadoPagoReturnTone,
	{
		title: string;
		description: string;
		Icon: typeof ClockIcon;
		iconClassName: string;
		badgeLabel: string;
		badgeVariant: NonNullable<ComponentProps<typeof Badge>["variant"]>;
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
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between gap-3">
						<div className="flex flex-col gap-1">
							<CardTitle className="flex items-center gap-2">
								<ToneIcon className={`size-5 ${copy.iconClassName}`} />
								{copy.title}
							</CardTitle>
							<CardDescription>{copy.description}</CardDescription>
						</div>
						<Badge variant={copy.badgeVariant}>{copy.badgeLabel}</Badge>
					</div>
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
